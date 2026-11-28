'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flag, MessageSquarePlus, Star } from 'lucide-react';
import {
  ProductRatingSummary,
  PublicReviewItem,
  ReviewEligibilityResponse,
  ReviewReportReasonType,
} from '@marvels-basket/shared';
import { ReviewsService } from '@/features/reviews/services/reviews.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

const REPORT_REASONS: Array<{ value: ReviewReportReasonType; label: string }> = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'OFFENSIVE', label: 'Offensive or abusive content' },
  { value: 'FAKE_OR_MISLEADING', label: 'Fake or misleading review' },
  { value: 'PERSONAL_INFO', label: 'Contains personal information' },
  { value: 'IRRELEVANT', label: 'Irrelevant content' },
  { value: 'OTHER', label: 'Other' },
];

export function ProductReviewsSection({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<ProductRatingSummary | null>(null);
  const [reviews, setReviews] = useState<PublicReviewItem[]>([]);
  const [sort, setSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [eligibility, setEligibility] = useState<ReviewEligibilityResponse | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReviewReportReasonType>('SPAM');
  const [reportExplanation, setReportExplanation] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, elig] = await Promise.all([
        ReviewsService.listProductReviews(productId, { sort, page, limit: 5 }),
        ReviewsService.checkEligibility(productId).catch(() => null),
      ]);
      setSummary(res.summary);
      setReviews(res.items);
      setTotalPages(res.totalPages);
      setEligibility(elig);
    } finally {
      setIsLoading(false);
    }
  }, [productId, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 5) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await ReviewsService.createReview({
        productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      setTitle('');
      setComment('');
      setFeedback('Thank you! Your review has been submitted for moderation.');
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Unable to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportTargetId) return;
    setReportBusy(true);
    try {
      await ReviewsService.reportReview(
        reportTargetId,
        reportReason,
        reportExplanation.trim() || undefined,
      );
      setReportTargetId(null);
      setReportExplanation('');
      setFeedback('Report submitted. Our moderation team will review it.');
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Unable to submit report.');
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-ink">Customer Reviews &amp; Ratings</h2>
          {summary && (
            <p className="text-xs text-muted mt-0.5">
              <strong className="text-ink text-sm">{summary.averageRating.toFixed(1)}</strong> / 5 •{' '}
              {summary.totalReviews} verified {summary.totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as 'recent' | 'highest' | 'lowest');
            setPage(1);
          }}
          className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold"
        >
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {summary && summary.totalReviews > 0 && (
        <div className="grid grid-cols-5 gap-2 text-[11px] text-muted">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
            return (
              <div key={star} className="rounded-xl bg-surface p-2 text-center">
                <p className="font-bold text-ink">{star} ★</p>
                <p>{pct}% ({count})</p>
              </div>
            );
          })}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      {eligibility?.eligible ? (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
          <p className="text-xs font-bold text-ink flex items-center gap-1.5">
            <MessageSquarePlus className="h-4 w-4 text-brand" />
            Write a Verified Purchase Review
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                aria-label={`Rate ${s} stars`}
                className="p-1.5"
              >
                <Star
                  className={`h-5 w-5 ${
                    s <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review headline (optional)"
            maxLength={120}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product (min 5 characters)..."
            rows={3}
            minLength={5}
            maxLength={2000}
            required
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            isLoading={submitting}
            className="bg-brand text-white text-xs font-bold"
          >
            Submit Review
          </Button>
        </form>
      ) : eligibility?.reason ? (
        <p className="text-xs text-muted bg-surface rounded-xl px-4 py-2.5">{eligibility.reason}</p>
      ) : null}

      {isLoading ? (
        <div className="py-6 text-center text-xs text-muted">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">
          No approved reviews yet for this product.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {reviews.map((r) => (
            <div key={r.id} className="py-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                    {r.rating} ★
                  </span>
                  {r.title && <span className="text-sm font-bold text-ink">{r.title}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setReportTargetId(r.id)}
                  className="text-[11px] text-muted hover:text-red-600 inline-flex items-center gap-1"
                >
                  <Flag className="h-3 w-3" />
                  Report
                </button>
              </div>
              {r.comment && <p className="text-xs text-ink-secondary leading-relaxed">{r.comment}</p>}
              <p className="text-[11px] text-muted flex items-center gap-2">
                <span>{r.authorName}</span>
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-0.5 text-brand font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Purchase
                  </span>
                )}
                <span>• {new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        isOpen={Boolean(reportTargetId)}
        onClose={() => setReportTargetId(null)}
        title="Report Review"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as ReviewReportReasonType)}
              className="w-full rounded-xl border border-border px-3 py-2"
            >
              {REPORT_REASONS.map((rr) => (
                <option key={rr.value} value={rr.value}>
                  {rr.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Details (optional)</label>
            <textarea
              value={reportExplanation}
              onChange={(e) => setReportExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReportTargetId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={reportBusy}
              onClick={handleReport}
              className="bg-red-600 text-white"
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
