import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SellersService } from './sellers.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  CreateSellerApplicationDto,
  UpdateSellerApplicationDto,
  UpdateSellerProfileDto,
  UpdateSellerStoreDto,
  UploadSellerDocumentDto,
} from './dto';
import { Response } from 'express';
import * as crypto from 'crypto';

@ApiTags('Seller Onboarding & Management')
@ApiBearerAuth('JWT')
@Controller('sellers')
export class SellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('applications')
  @ApiOperation({ summary: 'Initiate or retrieve seller registration application draft' })
  @ApiResponse({ status: 201, description: 'Application draft created or retrieved' })
  async createApplication(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSellerApplicationDto,
  ) {
    return this.sellersService.getOrCreateApplication(userId, dto);
  }

  @Get('me/application')
  @ApiOperation({ summary: 'Retrieve own seller onboarding application' })
  async getMyApplication(@CurrentUser('id') userId: string) {
    return this.sellersService.getApplication(userId);
  }

  @Patch('me/application')
  @ApiOperation({ summary: 'Update own draft or rejected seller application' })
  async updateMyApplication(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSellerApplicationDto,
  ) {
    return this.sellersService.updateApplication(userId, dto);
  }

  @Post('me/application/submit')
  @ApiOperation({ summary: 'Submit completed seller application for administrative verification' })
  async submitMyApplication(@CurrentUser('id') userId: string) {
    return this.sellersService.submitApplication(userId);
  }

  @Get('me/status')
  @ApiOperation({ summary: 'Retrieve application review and verification status' })
  async getMyStatus(@CurrentUser('id') userId: string) {
    return this.sellersService.getStatus(userId);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Retrieve seller operational profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.sellersService.getProfile(userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update seller operational profile' })
  async updateMyProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateSellerProfileDto) {
    return this.sellersService.updateProfile(userId, dto);
  }

  @Get('me/store')
  @ApiOperation({ summary: 'Retrieve seller store information' })
  async getMyStore(@CurrentUser('id') userId: string) {
    return this.sellersService.getStore(userId);
  }

  @Patch('me/store')
  @ApiOperation({ summary: 'Update permitted seller store information' })
  async updateMyStore(@CurrentUser('id') userId: string, @Body() dto: UpdateSellerStoreDto) {
    return this.sellersService.updateStore(userId, dto);
  }

  @Post('me/documents')
  @ApiOperation({ summary: 'Upload KYC verification document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', example: 'PAN_CARD' },
        expiryDate: { type: 'string', example: '2028-12-31' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSellerDocumentDto,
  ) {
    return this.sellersService.uploadDocument(userId, file, dto);
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'List own uploaded KYC documents' })
  async listDocuments(@CurrentUser('id') userId: string) {
    return this.sellersService.listDocuments(userId);
  }

  @Delete('me/documents/:id')
  @ApiOperation({ summary: 'Delete eligible uploaded document (draft/rejected)' })
  async deleteDocument(@CurrentUser('id') userId: string, @Param('id') documentId: string) {
    return this.sellersService.deleteDocument(userId, documentId);
  }

  /**
   * Secure streaming endpoint for local mock / authenticated previews.
   * Validates HMAC token and expiration.
   */
  @Public()
  @Get('documents/stream/:publicId(*)')
  @ApiOperation({ summary: 'Secure document preview streaming (for mock & verified assets)' })
  async streamDocument(
    @Param('publicId') publicId: string,
    @Query('expires') expires: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!expires || !token) {
      return res.status(403).json({ error: 'Missing security verification token or expiry' });
    }

    const expiresAt = parseInt(expires, 10);
    if (Date.now() / 1000 > expiresAt) {
      return res.status(403).json({ error: 'Signed document preview URL has expired' });
    }

    const expectedToken = crypto
      .createHmac('sha256', 'marvels-secret-mock-token')
      .update(`${publicId}:${expiresAt}`)
      .digest('hex');

    if (token !== expectedToken) {
      return res.status(403).json({ error: 'Invalid document access signature' });
    }

    const file = this.cloudinaryService.getMockFile(publicId);
    if (!file) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
    return res.send(file.buffer);
  }
}
