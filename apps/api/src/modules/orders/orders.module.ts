import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { InventoryModule } from '../inventory/inventory.module';
import { EmailModule } from '../email/email.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './seller-orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrdersService } from './seller-orders.service';
import { AdminOrdersService } from './admin-orders.service';
import { ComplaintsService } from './complaints.service';
import { OrderNotificationsService } from './order-notifications.service';

@Module({
  imports: [
    PrismaModule,
    StoresModule,
    InventoryModule,
    EmailModule,
    CloudinaryModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController, SellerOrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    SellerOrdersService,
    AdminOrdersService,
    ComplaintsService,
    OrderNotificationsService,
  ],
  exports: [
    OrdersService,
    SellerOrdersService,
    AdminOrdersService,
    ComplaintsService,
    OrderNotificationsService,
  ],
})
export class OrdersModule {}
