import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../database/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { DELIVERY_OPERATIONS_QUEUE, DeliveryService } from './delivery.service';
import { DeliveryTimeoutProcessor } from './delivery-timeout.processor';
import { DELIVERY_PROVIDER_TOKEN } from './providers/delivery-provider.interface';
import { InternalDeliveryProvider } from './providers/internal-delivery.provider';
import { CustomerDeliveryController } from './controllers/customer-delivery.controller';
import { SellerDeliveryController } from './controllers/seller-delivery.controller';
import { RiderDeliveryController } from './controllers/rider-delivery.controller';
import { AdminDeliveryController } from './controllers/admin-delivery.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => OrdersModule),
    BullModule.registerQueue({ name: DELIVERY_OPERATIONS_QUEUE }),
  ],
  controllers: [
    CustomerDeliveryController,
    SellerDeliveryController,
    RiderDeliveryController,
    AdminDeliveryController,
  ],
  providers: [
    DeliveryService,
    DeliveryTimeoutProcessor,
    InternalDeliveryProvider,
    {
      provide: DELIVERY_PROVIDER_TOKEN,
      useExisting: InternalDeliveryProvider,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
