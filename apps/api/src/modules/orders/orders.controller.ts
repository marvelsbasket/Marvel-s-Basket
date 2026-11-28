import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { ComplaintsService } from './complaints.service';
import { PaymentsService } from '../payments/payments.service';
import {
  CancelOrderDto,
  CreateComplaintDto,
  CreateOrderDto,
  QueryOrdersDto,
} from './dto/orders.dto';

@ApiTags('Customer Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly complaintsService: ComplaintsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a single-store order from an active checkout session' })
  @ResponseMessage('Order placed successfully')
  async createOrder(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List authenticated customer orders' })
  @ResponseMessage('Orders retrieved successfully')
  async listOrders(@CurrentUser('id') userId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.listCustomerOrders(userId, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details and immutable purchase-time snapshots' })
  @ResponseMessage('Order details retrieved')
  async getOrderDetail(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.ordersService.getCustomerOrderDetail(userId, orderId);
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an eligible order before packing' })
  @ResponseMessage('Order cancelled successfully')
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelCustomerOrder(userId, orderId, dto);
  }

  @Get(':orderId/payment')
  @ApiOperation({ summary: 'Get latest payment status for an authenticated customer order' })
  @ResponseMessage('Order payment status retrieved')
  async getOrderPayment(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.paymentsService.getCustomerOrderPayment(userId, orderId);
  }

  @Get(':orderId/tracking')
  @ApiOperation({ summary: 'Get order milestone tracking timeline' })
  @ResponseMessage('Order tracking retrieved')
  async getOrderTracking(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.ordersService.getOrderTracking(userId, orderId);
  }

  @Post(':orderId/complaints')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images', 3))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Submit a post-delivery order complaint' })
  @ResponseMessage('Complaint submitted successfully')
  async submitComplaint(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateComplaintDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.complaintsService.submitComplaint(userId, orderId, dto, files);
  }

  @Get(':orderId/complaints')
  @ApiOperation({ summary: 'List complaints for an order' })
  @ResponseMessage('Order complaints retrieved')
  async listOrderComplaints(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.complaintsService.listOrderComplaints(userId, orderId);
  }
}
