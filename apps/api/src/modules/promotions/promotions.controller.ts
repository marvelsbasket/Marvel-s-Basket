import {
  Body,
  Controller,
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
import { AdminCouponsService } from './admin-coupons.service';
import { SellerDiscountsService } from './seller-discounts.service';
import {
  CreateCouponDto,
  CreateSellerDiscountDto,
  QueryCouponsDto,
  QuerySellerDiscountsDto,
  UpdateCouponDto,
  UpdateSellerDiscountDto,
} from './dto/promotions.dto';

@ApiTags('Promotions & Discounts')
@Controller()
export class PromotionsController {
  constructor(
    private readonly sellerDiscountsService: SellerDiscountsService,
    private readonly adminCouponsService: AdminCouponsService,
  ) {}

  // ===========================================================================
  // PUBLIC OFFERS
  // ===========================================================================

  @Get('offers')
  @Public()
  @ApiOperation({ summary: 'List active platform-funded coupon offers' })
  @ResponseMessage('Active offers retrieved')
  async listPublicOffers() {
    return this.adminCouponsService.listPublicActiveOffers();
  }

  // ===========================================================================
  // SELLER PRODUCT DISCOUNTS
  // ===========================================================================

  @Post('seller/discounts')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a seller-funded product discount for an owned listing' })
  @ResponseMessage('Product discount created')
  async createSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Body() dto: CreateSellerDiscountDto,
  ) {
    return this.sellerDiscountsService.createDiscount(sellerUserId, dto);
  }

  @Get('seller/discounts')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @ApiOperation({ summary: 'List seller product discounts' })
  @ResponseMessage('Seller discounts retrieved')
  async listSellerDiscounts(
    @CurrentUser('id') sellerUserId: string,
    @Query() query: QuerySellerDiscountsDto,
  ) {
    return this.sellerDiscountsService.listDiscounts(sellerUserId, query);
  }

  @Get('seller/discounts/:discountId')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @ApiOperation({ summary: 'Get seller product discount detail' })
  @ResponseMessage('Seller discount retrieved')
  async getSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Param('discountId') discountId: string,
  ) {
    return this.sellerDiscountsService.getDiscount(sellerUserId, discountId);
  }

  @Patch('seller/discounts/:discountId')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @ApiOperation({ summary: 'Update an eligible seller product discount' })
  @ResponseMessage('Seller discount updated')
  async updateSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Param('discountId') discountId: string,
    @Body() dto: UpdateSellerDiscountDto,
  ) {
    return this.sellerDiscountsService.updateDiscount(sellerUserId, discountId, dto);
  }

  @Post('seller/discounts/:discountId/activate')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or resume a seller product discount' })
  @ResponseMessage('Seller discount activated')
  async activateSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Param('discountId') discountId: string,
  ) {
    return this.sellerDiscountsService.transitionDiscountStatus(
      sellerUserId,
      discountId,
      'activate',
    );
  }

  @Post('seller/discounts/:discountId/pause')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active or scheduled seller product discount' })
  @ResponseMessage('Seller discount paused')
  async pauseSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Param('discountId') discountId: string,
  ) {
    return this.sellerDiscountsService.transitionDiscountStatus(
      sellerUserId,
      discountId,
      'pause',
    );
  }

  @Post('seller/discounts/:discountId/end')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently end a seller product discount' })
  @ResponseMessage('Seller discount ended')
  async endSellerDiscount(
    @CurrentUser('id') sellerUserId: string,
    @Param('discountId') discountId: string,
  ) {
    return this.sellerDiscountsService.transitionDiscountStatus(sellerUserId, discountId, 'end');
  }

  // ===========================================================================
  // ADMIN PLATFORM COUPONS
  // ===========================================================================

  @Post('admin/coupons')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a platform-funded coupon' })
  @ResponseMessage('Coupon created')
  async createCoupon(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.adminCouponsService.createCoupon(adminUserId, dto);
  }

  @Get('admin/coupons')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List platform coupons' })
  @ResponseMessage('Admin coupons retrieved')
  async listCoupons(@Query() query: QueryCouponsDto) {
    return this.adminCouponsService.listCoupons(query);
  }

  @Get('admin/coupons/:couponId')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform coupon details' })
  @ResponseMessage('Admin coupon retrieved')
  async getCoupon(@Param('couponId') couponId: string) {
    return this.adminCouponsService.getCoupon(couponId);
  }

  @Patch('admin/coupons/:couponId')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a platform coupon' })
  @ResponseMessage('Coupon updated')
  async updateCoupon(
    @CurrentUser('id') adminUserId: string,
    @Param('couponId') couponId: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.adminCouponsService.updateCoupon(adminUserId, couponId, dto);
  }

  @Post('admin/coupons/:couponId/activate')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a platform coupon' })
  @ResponseMessage('Coupon activated')
  async activateCoupon(
    @CurrentUser('id') adminUserId: string,
    @Param('couponId') couponId: string,
  ) {
    return this.adminCouponsService.setCouponActive(adminUserId, couponId, true);
  }

  @Post('admin/coupons/:couponId/pause')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a platform coupon' })
  @ResponseMessage('Coupon paused')
  async pauseCoupon(
    @CurrentUser('id') adminUserId: string,
    @Param('couponId') couponId: string,
  ) {
    return this.adminCouponsService.setCouponActive(adminUserId, couponId, false);
  }
}
