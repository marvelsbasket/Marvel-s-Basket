import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [PrismaModule, StoresModule, CartModule, InventoryModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
