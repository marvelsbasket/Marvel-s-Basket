import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRoleType } from '@prisma/client';
import { AdminSellersService } from './admin-sellers.service';
import {
  AdminRejectApplicationDto,
  AdminReviewDocumentDto,
  AdminSuspendSellerDto,
  QuerySellersDto,
} from './dto';

@ApiTags('Admin — Seller Verification & Store Management')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(private readonly adminSellersService: AdminSellersService) {}

  @Get()
  @ApiOperation({ summary: 'List seller applications with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated seller applications list' })
  async listApplications(@Query() query: QuerySellersDto) {
    return this.adminSellersService.listApplications(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve comprehensive seller application detail for inspection' })
  async getApplicationDetail(@Param('id') sellerId: string) {
    return this.adminSellersService.getApplicationDetail(sellerId);
  }

  @Get(':id/documents/:documentId/preview')
  @ApiOperation({ summary: 'Generate secure in-app document preview for authorized admins' })
  async getDocumentPreview(
    @CurrentUser('id') adminUserId: string,
    @Param('id') sellerId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.adminSellersService.getDocumentPreview(adminUserId, sellerId, documentId);
  }

  @Post(':id/documents/:documentId/review')
  @ApiOperation({ summary: 'Verify or reject an individual KYC document' })
  async reviewDocument(
    @CurrentUser('id') adminUserId: string,
    @Param('id') sellerId: string,
    @Param('documentId') documentId: string,
    @Body() dto: AdminReviewDocumentDto,
  ) {
    return this.adminSellersService.reviewDocument(adminUserId, sellerId, documentId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Authorize seller application approval and store activation' })
  async approveSeller(@CurrentUser('id') adminUserId: string, @Param('id') sellerId: string) {
    return this.adminSellersService.approveSeller(adminUserId, sellerId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject seller application with specific feedback for resubmission' })
  async rejectSeller(
    @CurrentUser('id') adminUserId: string,
    @Param('id') sellerId: string,
    @Body() dto: AdminRejectApplicationDto,
  ) {
    return this.adminSellersService.rejectSeller(adminUserId, sellerId, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active seller store' })
  async suspendSeller(
    @CurrentUser('id') adminUserId: string,
    @Param('id') sellerId: string,
    @Body() dto: AdminSuspendSellerDto,
  ) {
    return this.adminSellersService.suspendSeller(adminUserId, sellerId, dto);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended seller store' })
  async reactivateSeller(@CurrentUser('id') adminUserId: string, @Param('id') sellerId: string) {
    return this.adminSellersService.reactivateSeller(adminUserId, sellerId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Retrieve application status lifecycle and audit trail' })
  async getStatusHistory(@Param('id') sellerId: string) {
    return this.adminSellersService.getStatusHistory(sellerId);
  }
}
