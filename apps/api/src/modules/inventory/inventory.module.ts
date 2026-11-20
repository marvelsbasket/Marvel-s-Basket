import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../cache/redis.module';
import { SellerListingsController } from './controllers/seller-listings.controller';
import { SellerInventoryController } from './controllers/seller-inventory.controller';
import { InventoryOperationsController } from './controllers/inventory-operations.controller';
import { SellerListingsService } from './services/seller-listings.service';
import { InventoryService } from './services/inventory.service';
import { InventoryReservationService } from './services/inventory-reservation.service';
import { ReservationExpirationWorker } from './services/reservation-expiration.worker';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SellerListingsController, SellerInventoryController, InventoryOperationsController],
  providers: [
    SellerListingsService,
    InventoryService,
    InventoryReservationService,
    ReservationExpirationWorker,
  ],
  exports: [SellerListingsService, InventoryService, InventoryReservationService],
})
export class InventoryModule {}
