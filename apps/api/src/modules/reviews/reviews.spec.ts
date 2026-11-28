import { BadRequestException } from '@nestjs/common';
import { sanitizeAndValidateReviewText } from './review-sanitizer';
import { RatingAggregationService } from './rating-aggregation.service';

describe('Phase 16 — Reviews & Ratings Unit Suite', () => {
  describe('Review Sanitizer (XSS & Input Validation)', () => {
    it('accepts clean review text and trims whitespace', () => {
      expect(sanitizeAndValidateReviewText('  Fresh and tasty butter!  ', 'Comment', 5)).toBe(
        'Fresh and tasty butter!',
      );
    });

    it('rejects HTML tags, script tags, and inline event handlers', () => {
      expect(() =>
        sanitizeAndValidateReviewText('<script>alert(1)</script>Great', 'Comment', 5),
      ).toThrow(BadRequestException);
      expect(() =>
        sanitizeAndValidateReviewText('<img src=x onerror=alert(1)>Nice', 'Comment', 5),
      ).toThrow(BadRequestException);
      expect(() =>
        sanitizeAndValidateReviewText('javascript:alert(1) test', 'Comment', 5),
      ).toThrow(BadRequestException);
    });

    it('rejects empty or too-short text', () => {
      expect(() => sanitizeAndValidateReviewText('   ok ', 'Comment', 5)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('RatingAggregationService', () => {
    it('computes exact weighted average and distribution from APPROVED reviews', async () => {
      const upsert = jest.fn().mockResolvedValue({});
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([
          { rating: 5, cnt: 2 },
          { rating: 4, cnt: 1 },
        ]),
        productRatingAggregate: { upsert },
      } as any;

      const service = new RatingAggregationService({} as any);
      const summary = await service.recomputeProductAggregateInTx(tx, 'prod-1');

      expect(summary.totalReviews).toBe(3);
      expect(summary.averageRating).toBe(4.67);
      expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 });
    });

    it('handles zero approved reviews without division by zero', async () => {
      const upsert = jest.fn().mockResolvedValue({});
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        productRatingAggregate: { upsert },
      } as any;

      const service = new RatingAggregationService({} as any);
      const summary = await service.recomputeProductAggregateInTx(tx, 'prod-1');

      expect(summary.totalReviews).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });
});
