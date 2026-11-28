import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { RatingAggregationService } from './rating-aggregation.service';
import { ReviewsService } from './reviews.service';
import { AdminReviewsService } from './admin-reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [RatingAggregationService, ReviewsService, AdminReviewsService],
  exports: [RatingAggregationService, ReviewsService],
})
export class ReviewsModule {}
