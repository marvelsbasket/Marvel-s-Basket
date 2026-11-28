import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentsService } from '../payments.service';
import { PaymentReconciliationService } from '../reconciliation/payment-reconciliation.service';
import { RefundsService } from './refunds.service';
import { CreateRefundDto, QueryPaymentsDto, QueryRefundsDto } from '../dto/payments.dto';

@ApiTags('Admin — Payments & Refunds')
@ApiBearerAuth('JWT-auth')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin')
export class AdminPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
    private readonly reconciliationService: PaymentReconciliationService,
  ) {}

  @Get('payments')
  @ApiOperation({ summary: 'List platform payment transactions' })
  @ResponseMessage('Admin payments retrieved')
  async listPayments(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.listAdminPayments(query);
  }

  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get payment details, audit history, and refunds' })
  @ResponseMessage('Admin payment detail retrieved')
  async getPaymentDetail(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getAdminPaymentDetail(paymentId);
  }

  @Get('payments/:paymentId/history')
  @ApiOperation({ summary: 'Get immutable payment status transition history' })
  @ResponseMessage('Payment history retrieved')
  async getPaymentHistory(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getAdminPaymentHistory(paymentId);
  }

  @Post('payments/:paymentId/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile payment status with live Razorpay gateway state' })
  @ResponseMessage('Payment reconciliation completed')
  async reconcilePayment(
    @CurrentUser('id') adminUserId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.reconciliationService.reconcilePayment(paymentId, adminUserId, 'MANUAL_ADMIN');
  }

  @Post('payments/:paymentId/refunds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a full or partial Razorpay refund' })
  @ResponseMessage('Refund initiated successfully')
  async createRefund(
    @CurrentUser('id') adminUserId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.refundsService.createRefund(adminUserId, paymentId, dto);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List platform refunds' })
  @ResponseMessage('Admin refunds retrieved')
  async listRefunds(@Query() query: QueryRefundsDto) {
    return this.refundsService.listAdminRefunds(query);
  }

  @Get('refunds/:refundId')
  @ApiOperation({ summary: 'Get refund details' })
  @ResponseMessage('Admin refund detail retrieved')
  async getRefundDetail(@Param('refundId') refundId: string) {
    return this.refundsService.getAdminRefundDetail(refundId);
  }
}
