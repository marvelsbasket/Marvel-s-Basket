import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SellerDiscountsService } from './seller-discounts.service';
import { AdminCouponsService } from './admin-coupons.service';
import { PromotionsController } from './promotions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [SellerDiscountsService, AdminCouponsService],
  exports: [SellerDiscountsService, AdminCouponsService],
})
export class PromotionsModule {}
