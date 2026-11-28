import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DeliveryService } from '../delivery.service';
import { QueryDeliveriesDto, ReportHandoverIssueDto } from '../dto/delivery.dto';

@ApiTags('Seller — Fulfillment & Deliveries')
@ApiBearerAuth('JWT-auth')
@Roles(UserRoleType.SELLER)
@Controller('seller/deliveries')
export class SellerDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries for the authenticated seller store' })
  @ResponseMessage('Seller deliveries retrieved')
  async listDeliveries(
    @CurrentUser('id') sellerUserId: string,
    @Query() query: QueryDeliveriesDto,
  ) {
    return this.deliveryService.listSellerDeliveries(sellerUserId, query);
  }

  @Get(':deliveryId')
  @ApiOperation({ summary: 'Get delivery detail for the authenticated seller store' })
  @ResponseMessage('Seller delivery detail retrieved')
  async getDeliveryDetail(
    @CurrentUser('id') sellerUserId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.getSellerDeliveryDetail(sellerUserId, deliveryId);
  }

  @Post(':deliveryId/ready-for-pickup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a packed order delivery as ready for rider pickup' })
  @ResponseMessage('Delivery marked ready for pickup')
  async markReadyForPickup(
    @CurrentUser('id') sellerUserId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.markSellerReadyForPickup(sellerUserId, deliveryId);
  }

  @Post(':deliveryId/handover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm physical handover readiness to assigned rider' })
  @ResponseMessage('Handover readiness confirmed')
  async confirmHandover(
    @CurrentUser('id') sellerUserId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveryService.confirmSellerHandover(sellerUserId, deliveryId);
  }

  @Post(':deliveryId/report-issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a packing or handover issue on a delivery' })
  @ResponseMessage('Delivery issue reported')
  async reportIssue(
    @CurrentUser('id') sellerUserId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: ReportHandoverIssueDto,
  ) {
    return this.deliveryService.reportSellerIssue(sellerUserId, deliveryId, dto);
  }
}
