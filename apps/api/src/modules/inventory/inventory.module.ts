import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../cache/redis.module';
import { SellerListingsController } from './controllers/seller-listings.controller';
import { SellerInventoryController } from './controllers/seller-inventory.controller';
import { InventoryOperationsController } from './controllers/inventory-operations.controller';
import { SellerListingsService } from './services/seller-listings.service';
import { InventoryService } from './services/inventory.service';
import {
  InventoryReservationService,
  RESERVATION_EXPIRATION_QUEUE,
} from './services/inventory-reservation.service';
import { ReservationExpirationWorker } from './services/reservation-expiration.worker';
import { ReservationExpirationProcessor } from './services/reservation-expiration.processor';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: RESERVATION_EXPIRATION_QUEUE,
    }),
  ],
  controllers: [SellerListingsController, SellerInventoryController, InventoryOperationsController],
  providers: [
    SellerListingsService,
    InventoryService,
    InventoryReservationService,
    ReservationExpirationWorker,
    ReservationExpirationProcessor,
  ],
  exports: [SellerListingsService, InventoryService, InventoryReservationService],
})
export class InventoryModule {}
