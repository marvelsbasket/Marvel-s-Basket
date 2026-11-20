import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminProductsService } from './admin-products.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
  QueryAdminProductsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  UpdateProductVariantDto,
} from './dto';

@ApiTags('Admin — Master Product Catalog Management')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List master products with search, status filters, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated master products list' })
  @ResponseMessage('Products retrieved successfully')
  async list(@Query() query: QueryAdminProductsDto) {
    return this.adminProductsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve full master product dossier with all variants and images' })
  @ApiResponse({ status: 200, description: 'Master product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ResponseMessage('Product retrieved successfully')
  async getById(@Param('id') id: string) {
    return this.adminProductsService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new platform-owned master product (default DRAFT)' })
  @ApiResponse({ status: 201, description: 'Master product created' })
  @ApiResponse({ status: 409, description: 'Product slug already exists' })
  @ResponseMessage('Master product created successfully')
  async create(@Body() dto: CreateProductDto) {
    return this.adminProductsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update master product details and compliance fields' })
  @ApiResponse({ status: 200, description: 'Master product updated' })
  @ResponseMessage('Master product updated successfully')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminProductsService.update(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transition product status (DRAFT, ACTIVE, DISCONTINUED, INACTIVE)',
    description:
      'Publishing to ACTIVE enforces validations: at least 1 active variant, positive MRP, and primary image.',
  })
  @ApiResponse({ status: 200, description: 'Product status updated' })
  @ApiResponse({ status: 400, description: 'Publish validation failed' })
  @ResponseMessage('Product status updated successfully')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.adminProductsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/soft-delete a master product' })
  @ApiResponse({ status: 200, description: 'Master product archived' })
  @ResponseMessage('Product archived successfully')
  async delete(@Param('id') id: string) {
    return this.adminProductsService.delete(id);
  }

  // ===========================================================================
  // Variants Management
  // ===========================================================================

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new pack-size variant to a master product' })
  @ApiResponse({ status: 201, description: 'Variant added' })
  @ApiResponse({ status: 409, description: 'SKU code collision' })
  @ResponseMessage('Variant added successfully')
  async addVariant(@Param('id') id: string, @Body() dto: CreateProductVariantDto) {
    return this.adminProductsService.addVariant(id, dto);
  }

  @Patch(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing product variant (MRP, pack size, units, SKU)' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ResponseMessage('Variant updated successfully')
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.adminProductsService.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a variant safely' })
  @ApiResponse({ status: 200, description: 'Variant deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete the only active variant of active product',
  })
  @ResponseMessage('Variant deleted successfully')
  async deleteVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.adminProductsService.deleteVariant(id, variantId);
  }

  // ===========================================================================
  // Media / Cloudinary Uploads
  // ===========================================================================

  @Post(':id/variants/:variantId/images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload product variant image (Cloudinary, max 5 per variant)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        isPrimary: { type: 'boolean', default: false },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Product variant image uploaded successfully')
  async uploadVariantImage(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('isPrimary') isPrimary?: string | boolean,
  ) {
    const isPrimaryBool = isPrimary === 'true' || isPrimary === true;
    return this.adminProductsService.uploadVariantImage(id, variantId, file, isPrimaryBool);
  }

  @Delete(':id/variants/:variantId/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete variant image and clean up Cloudinary asset' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ResponseMessage('Product image deleted successfully')
  async deleteVariantImage(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.adminProductsService.deleteVariantImage(id, variantId, imageId);
  }

  // ===========================================================================
  // Store Inventory Inspection
  // ===========================================================================

  @Get(':id/store-listings')
  @ApiOperation({
    summary: 'Inspect store-specific inventory and pricing mapped to this master product',
    description:
      'Demonstrates the strict separation: lists how individual stores map this master product with their own selling prices and stock.',
  })
  @ApiResponse({ status: 200, description: 'Store inventory mapping records' })
  @ResponseMessage('Store inventory listings retrieved')
  async getStoreListings(@Param('id') id: string) {
    return this.adminProductsService.getStoreListings(id);
  }
}
