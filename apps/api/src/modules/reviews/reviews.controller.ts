import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReviewsService } from './reviews.service';
import { AdminReviewsService } from './admin-reviews.service';
import { RatingAggregationService } from './rating-aggregation.service';
import {
  CreateReviewDto,
  ModerateReviewDto,
  QueryAdminReviewsDto,
  QueryProductReviewsDto,
  RejectReviewDto,
  ReportReviewDto,
  ResolveReportDto,
  UpdateReviewDto,
} from './dto/reviews.dto';

@ApiTags('Reviews & Ratings')
@Controller()
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly adminReviewsService: AdminReviewsService,
    private readonly ratingAggregation: RatingAggregationService,
  ) {}

  // ===========================================================================
  // PUBLIC PRODUCT REVIEWS & RATINGS
  // ===========================================================================

  @Get('products/:productId/reviews')
  @Public()
  @ApiOperation({ summary: 'List approved public reviews and rating summary for a product' })
  @ResponseMessage('Product reviews retrieved')
  async listProductReviews(
    @Param('productId') productId: string,
    @Query() query: QueryProductReviewsDto,
  ) {
    return this.reviewsService.listProductReviews(productId, query);
  }

  @Get('products/:productId/rating-summary')
  @Public()
  @ApiOperation({ summary: 'Get aggregated rating summary and star distribution for a product' })
  @ResponseMessage('Rating summary retrieved')
  async getRatingSummary(@Param('productId') productId: string) {
    return this.ratingAggregation.getProductRatingSummary(productId);
  }

  // ===========================================================================
  // CUSTOMER REVIEWS
  // ===========================================================================

  @Get('products/:productId/reviews/eligibility')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if authenticated customer can review a product' })
  @ResponseMessage('Review eligibility checked')
  async checkEligibility(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.reviewsService.checkEligibility(userId, productId);
  }

  @Post('reviews')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a verified-purchase product review' })
  @ResponseMessage('Review submitted for moderation')
  async createReview(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(userId, dto);
  }

  @Get('reviews/me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List reviews submitted by the authenticated customer' })
  @ResponseMessage('My reviews retrieved')
  async listMyReviews(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.listMyReviews(userId, Number(page) || 1, Number(limit) || 20);
  }

  @Patch('reviews/:reviewId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Edit an owned review (triggers re-moderation if approved)' })
  @ResponseMessage('Review updated and queued for moderation')
  async updateMyReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateMyReview(userId, reviewId, dto);
  }

  @Delete('reviews/:reviewId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Soft-delete an owned review' })
  @ResponseMessage('Review removed')
  async deleteMyReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.deleteMyReview(userId, reviewId);
  }

  @Post('reviews/:reviewId/report')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report an inappropriate approved review' })
  @ResponseMessage('Review report submitted')
  async reportReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewsService.reportReview(userId, reviewId, dto);
  }

  // ===========================================================================
  // ADMIN MODERATION & REPORTS
  // ===========================================================================

  @Get('admin/reviews')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List and filter reviews for moderation' })
  @ResponseMessage('Admin reviews retrieved')
  async listAdminReviews(@Query() query: QueryAdminReviewsDto) {
    return this.adminReviewsService.listReviews(query);
  }

  @Get('admin/reviews/reports')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List customer review reports' })
  @ResponseMessage('Review reports retrieved')
  async listReports(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminReviewsService.listReports(status, Number(page) || 1, Number(limit) || 20);
  }

  @Get('admin/reviews/:reviewId')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get review details, reports, and moderation history' })
  @ResponseMessage('Admin review detail retrieved')
  async getAdminReviewDetail(@Param('reviewId') reviewId: string) {
    return this.adminReviewsService.getReviewDetail(reviewId);
  }

  @Post('admin/reviews/:reviewId/approve')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a review and update product rating aggregate' })
  @ResponseMessage('Review approved')
  async approveReview(
    @CurrentUser('id') adminUserId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminReviewsService.approveReview(adminUserId, reviewId, dto);
  }

  @Post('admin/reviews/:reviewId/reject')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a review with mandatory reason' })
  @ResponseMessage('Review rejected')
  async rejectReview(
    @CurrentUser('id') adminUserId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: RejectReviewDto,
  ) {
    return this.adminReviewsService.rejectReview(adminUserId, reviewId, dto);
  }

  @Post('admin/reviews/:reviewId/hide')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hide an approved review from public view' })
  @ResponseMessage('Review hidden')
  async hideReview(
    @CurrentUser('id') adminUserId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminReviewsService.hideReview(adminUserId, reviewId, dto);
  }

  @Post('admin/reviews/:reviewId/restore')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a hidden/rejected review to APPROVED' })
  @ResponseMessage('Review restored')
  async restoreReview(
    @CurrentUser('id') adminUserId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminReviewsService.restoreReview(adminUserId, reviewId, dto);
  }

  @Post('admin/reviews/reports/:reportId/resolve')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve or dismiss a review report' })
  @ResponseMessage('Report updated')
  async resolveReport(
    @CurrentUser('id') adminUserId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminReviewsService.resolveReport(adminUserId, reportId, dto);
  }

  @Post('admin/products/:productId/rating-reconcile')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile product rating aggregate from approved reviews' })
  @ResponseMessage('Product rating aggregate reconciled')
  async reconcileProductRating(@Param('productId') productId: string) {
    return this.adminReviewsService.reconcileProductRating(productId);
  }
}
