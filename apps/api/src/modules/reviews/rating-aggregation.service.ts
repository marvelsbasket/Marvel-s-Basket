import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ProductRatingSummary } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RatingAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recomputes and persists the ProductRatingAggregate strictly from
   * APPROVED reviews inside the caller's transaction.
   */
  async recomputeProductAggregateInTx(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<ProductRatingSummary> {
    // Serialize concurrent rating aggregate updates for the same product.
    await tx.$queryRaw`
      SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE
    `;

    const rows = await tx.$queryRaw<Array<{ rating: number; cnt: number }>>`
      SELECT rating, COUNT(*)::int AS cnt
      FROM reviews
      WHERE product_id = ${productId}::uuid
        AND status = 'APPROVED'
      GROUP BY rating
    `;

    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalReviews = 0;
    let weightedSum = 0;

    for (const r of rows) {
      if (r.rating >= 1 && r.rating <= 5) {
        const star = r.rating as 1 | 2 | 3 | 4 | 5;
        counts[star] = r.cnt;
        totalReviews += r.cnt;
        weightedSum += star * r.cnt;
      }
    }

    const averageRating =
      totalReviews > 0 ? Math.round((weightedSum / totalReviews) * 100) / 100 : 0;

    await tx.productRatingAggregate.upsert({
      where: { productId },
      update: {
        averageRating: new Decimal(averageRating.toFixed(2)),
        totalReviews,
        count1: counts[1],
        count2: counts[2],
        count3: counts[3],
        count4: counts[4],
        count5: counts[5],
      },
      create: {
        productId,
        averageRating: new Decimal(averageRating.toFixed(2)),
        totalReviews,
        count1: counts[1],
        count2: counts[2],
        count3: counts[3],
        count4: counts[4],
        count5: counts[5],
      },
    });

    return {
      productId,
      averageRating,
      totalReviews,
      distribution: counts,
    };
  }

  async getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
    const agg = await this.prisma.productRatingAggregate.findUnique({
      where: { productId },
    });

    if (!agg) {
      return {
        productId,
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    return {
      productId,
      averageRating: Number(agg.averageRating),
      totalReviews: agg.totalReviews,
      distribution: {
        1: agg.count1,
        2: agg.count2,
        3: agg.count3,
        4: agg.count4,
        5: agg.count5,
      },
    };
  }
}
