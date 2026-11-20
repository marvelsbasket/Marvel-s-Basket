import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { InventoryReservationService } from '../services/inventory-reservation.service';
import {
  CommitReservationDto,
  CreateStockReservationDto,
  PickerShortageWriteOffDto,
  ReleaseReservationDto,
  RevalidateCartDto,
} from '../dto';

@ApiTags('Inventory Operations & Reservation Engine')
@Controller('inventory')
export class InventoryOperationsController {
  constructor(private readonly reservationService: InventoryReservationService) {}

  @Public()
  @Post('revalidate-cart')
  @ApiOperation({
    summary:
      'Revalidate customer cart quantities, prices, store orderability, and stock availability without locking inventory',
  })
  @ApiResponse({ status: 200, description: 'Cart revalidation results' })
  async revalidateCart(@Body() dto: RevalidateCartDto) {
    return this.reservationService.revalidateCart(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('reservations')
  @ApiOperation({
    summary:
      'Atomically reserve stock during checkout initiation (deadlock-free order, parameterized conditional SQL, idempotency)',
  })
  @ApiResponse({ status: 201, description: 'Inventory reserved successfully' })
  @ApiResponse({ status: 409, description: 'Insufficient stock or concurrent race lost' })
  async createReservation(@Body() dto: CreateStockReservationDto) {
    return this.reservationService.createReservation(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('reservations/commit')
  @ApiOperation({
    summary:
      'Commit active stock reservation upon confirmed payment (deducts physical stock and reserved quantity, idempotent)',
  })
  @ApiResponse({ status: 200, description: 'Reservation committed successfully' })
  async commitReservation(@Body() dto: CommitReservationDto) {
    return this.reservationService.commitReservation(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('reservations/release')
  @ApiOperation({
    summary:
      'Release active stock reservation upon checkout cancellation or payment failure (restores available stock, idempotent)',
  })
  @ApiResponse({ status: 200, description: 'Reservation released successfully' })
  async releaseReservation(@Body() dto: ReleaseReservationDto) {
    return this.reservationService.releaseReservation(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('picker-shortage')
  @ApiOperation({
    summary:
      'Record picker shortage write-off during order fulfillment assembly (adjusts stock safely and generates audit ledger)',
  })
  @ApiResponse({ status: 200, description: 'Picker shortage recorded successfully' })
  async recordPickerShortage(@Body() dto: PickerShortageWriteOffDto) {
    return this.reservationService.recordPickerShortage(dto);
  }
}
