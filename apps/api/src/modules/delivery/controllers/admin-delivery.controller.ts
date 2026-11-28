import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DeliveryService } from '../delivery.service';
import {
  AssignDeliveryDto,
  CancelDeliveryDto,
  QueryDeliveriesDto,
  ReassignDeliveryDto,
  RegisterDeliveryPartnerDto,
} from '../dto/delivery.dto';

@ApiTags('Admin — Delivery Operations')
@ApiBearerAuth('JWT-auth')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin')
export class AdminDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('deliveries')
  @ApiOperation({ summary: 'List platform deliveries with status and search filters' })
  @ResponseMessage('Admin deliveries retrieved')
  async listDeliveries(@Query() query: QueryDeliveriesDto) {
    return this.deliveryService.listAdminDeliveries(query);
  }

  @Get('deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get full delivery dossier including assignments and history' })
  @ResponseMessage('Admin delivery detail retrieved')
  async getDeliveryDetail(@Param('deliveryId') deliveryId: string) {
    return this.deliveryService.getAdminDeliveryDetail(deliveryId);
  }

  @Get('deliveries/:deliveryId/history')
  @ApiOperation({ summary: 'Get immutable delivery status history' })
  @ResponseMessage('Delivery status history retrieved')
  async getDeliveryHistory(@Param('deliveryId') deliveryId: string) {
    return this.deliveryService.getAdminDeliveryHistory(deliveryId);
  }

  @Post('deliveries/:deliveryId/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a verified delivery partner to a delivery' })
  @ResponseMessage('Delivery partner assigned')
  async assignDelivery(
    @CurrentUser('id') adminUserId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.deliveryService.assignDelivery(adminUserId, deliveryId, dto);
  }

  @Post('deliveries/:deliveryId/reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reassign a delivery to another verified delivery partner' })
  @ResponseMessage('Delivery partner reassigned')
  async reassignDelivery(
    @CurrentUser('id') adminUserId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: ReassignDeliveryDto,
  ) {
    return this.deliveryService.reassignDelivery(adminUserId, deliveryId, dto);
  }

  @Post('deliveries/:deliveryId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a delivery with audit reason' })
  @ResponseMessage('Delivery cancelled')
  async cancelDelivery(
    @CurrentUser('id') adminUserId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: CancelDeliveryDto,
  ) {
    return this.deliveryService.cancelDeliveryByAdmin(adminUserId, deliveryId, dto);
  }

  @Get('delivery-partners')
  @ApiOperation({ summary: 'List registered delivery partners' })
  @ResponseMessage('Delivery partners retrieved')
  async listPartners(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.deliveryService.listDeliveryPartners(Number(page) || 1, Number(limit) || 20);
  }

  @Post('delivery-partners')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register or verify a platform delivery partner' })
  @ResponseMessage('Delivery partner saved')
  async registerPartner(@Body() dto: RegisterDeliveryPartnerDto) {
    return this.deliveryService.registerOrUpdatePartner(dto);
  }
}
