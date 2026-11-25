import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminOrdersService } from './admin-orders.service';
import { ComplaintsService } from './complaints.service';
import {
  AdminInterveneOrderDto,
  QueryComplaintsDto,
  QueryOrdersDto,
  ReviewComplaintDto,
} from './dto/orders.dto';

@ApiTags('Admin — Orders & Complaints')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin')
export class AdminOrdersController {
  constructor(
    private readonly adminOrdersService: AdminOrdersService,
    private readonly complaintsService: ComplaintsService,
  ) {}

  @Get('orders')
  @ApiOperation({ summary: 'List platform orders with search and filters' })
  @ResponseMessage('Admin orders retrieved')
  async listOrders(@Query() query: QueryOrdersDto) {
    return this.adminOrdersService.listOrders(query);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Inspect order details and immutable snapshots' })
  @ResponseMessage('Admin order detail retrieved')
  async getOrderDetail(@Param('orderId') orderId: string) {
    return this.adminOrdersService.getOrderDetail(orderId);
  }

  @Get('orders/:orderId/history')
  @ApiOperation({ summary: 'Inspect order status audit history' })
  @ResponseMessage('Order status history retrieved')
  async getOrderHistory(@Param('orderId') orderId: string) {
    return this.adminOrdersService.getOrderHistory(orderId);
  }

  @Post('orders/:orderId/intervene')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform an audited administrative order state intervention' })
  @ResponseMessage('Admin intervention recorded')
  async interveneOrder(
    @CurrentUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: AdminInterveneOrderDto,
  ) {
    return this.adminOrdersService.interveneOrder(adminUserId, orderId, dto);
  }

  @Get('complaints')
  @ApiOperation({ summary: 'List customer order complaints' })
  @ResponseMessage('Complaints retrieved')
  async listComplaints(@Query() query: QueryComplaintsDto) {
    return this.complaintsService.adminListComplaints(query);
  }

  @Get('complaints/:complaintId')
  @ApiOperation({ summary: 'Get complaint details' })
  @ResponseMessage('Complaint details retrieved')
  async getComplaint(@Param('complaintId') complaintId: string) {
    return this.complaintsService.adminGetComplaint(complaintId);
  }

  @Post('complaints/:complaintId/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review and update complaint status' })
  @ResponseMessage('Complaint reviewed')
  async reviewComplaint(
    @CurrentUser('id') adminUserId: string,
    @Param('complaintId') complaintId: string,
    @Body() dto: ReviewComplaintDto,
  ) {
    return this.complaintsService.adminReviewComplaint(adminUserId, complaintId, dto);
  }
}
