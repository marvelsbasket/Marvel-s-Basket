import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule, StoresModule, InventoryModule],
  controllers: [CartController],
  providers: [CartService, PricingService],
  exports: [CartService, PricingService],
})
export class CartModule {}
