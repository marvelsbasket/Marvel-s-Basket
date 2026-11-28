import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DeliveryService } from '../delivery.service';
import {
  CompleteDeliveryDto,
  FailDeliveryDto,
  QueryDeliveriesDto,
  RejectAssignmentDto,
  UpdatePartnerAvailabilityDto,
} from '../dto/delivery.dto';

@ApiTags('Delivery Partner — Assignments')
@ApiBearerAuth('JWT-auth')
@Roles(UserRoleType.DELIVERY_PARTNER)
@Controller('delivery')
export class RiderDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated delivery partner profile' })
  @ResponseMessage('Delivery partner profile retrieved')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.deliveryService.getRiderProfile(userId);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Update delivery partner availability (AVAILABLE / OFFLINE)' })
  @ResponseMessage('Availability updated')
  async updateAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePartnerAvailabilityDto,
  ) {
    return this.deliveryService.updateRiderAvailability(userId, dto);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'List delivery assignments for authenticated partner' })
  @ResponseMessage('Assignments retrieved')
  async listAssignments(
    @CurrentUser('id') userId: string,
    @Query() query: QueryDeliveriesDto,
  ) {
    return this.deliveryService.listRiderAssignments(userId, query);
  }

  @Get('assignments/:deliveryId')
  @ApiOperation({ summary: 'Get details of a specific assigned delivery' })
  @ResponseMessage('Assignment detail retrieved')
  async getAssignmentDetail(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.getRiderAssignmentDetail(userId, deliveryId);
  }

  @Post('assignments/:deliveryId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an offered delivery assignment' })
  @ResponseMessage('Assignment accepted')
  async acceptAssignment(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.acceptAssignment(userId, deliveryId);
  }

  @Post('assignments/:deliveryId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an offered delivery assignment' })
  @ResponseMessage('Assignment rejected')
  async rejectAssignment(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: RejectAssignmentDto,
  ) {
    return this.deliveryService.rejectAssignment(userId, deliveryId, dto);
  }

  @Post('assignments/:deliveryId/pickup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm pickup from store and transition order to OUT_FOR_DELIVERY' })
  @ResponseMessage('Order picked up')
  async pickupDelivery(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.pickupDelivery(userId, deliveryId);
  }

  @Post('assignments/:deliveryId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete delivery with OTP / COD verification' })
  @ResponseMessage('Delivery completed successfully')
  async completeDelivery(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: CompleteDeliveryDto,
  ) {
    return this.deliveryService.completeDelivery(userId, deliveryId, dto);
  }

  @Post('assignments/:deliveryId/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a failed delivery attempt with mandatory reason' })
  @ResponseMessage('Delivery failure recorded')
  async failDelivery(
    @CurrentUser('id') userId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: FailDeliveryDto,
  ) {
    return this.deliveryService.failDelivery(userId, deliveryId, dto);
  }
}
