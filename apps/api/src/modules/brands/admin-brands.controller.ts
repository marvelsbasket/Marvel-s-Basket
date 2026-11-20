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
import { BrandsService } from './brands.service';
import { CreateBrandDto, QueryBrandsDto, UpdateBrandDto } from './dto';

@ApiTags('Admin — Brand Management')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List brands with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of brands' })
  @ResponseMessage('Brands retrieved successfully')
  async list(@Query() query: QueryBrandsDto) {
    return this.brandsService.getAdminList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve brand details by UUID' })
  @ApiResponse({ status: 200, description: 'Brand details' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ResponseMessage('Brand retrieved successfully')
  async getById(@Param('id') id: string) {
    return this.brandsService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({ status: 201, description: 'Brand created' })
  @ApiResponse({ status: 409, description: 'Brand name or slug already exists' })
  @ResponseMessage('Brand created successfully')
  async create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update brand details' })
  @ApiResponse({ status: 200, description: 'Brand updated' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ResponseMessage('Brand updated successfully')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a brand safely' })
  @ApiResponse({ status: 200, description: 'Brand deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete: assigned to products' })
  @ResponseMessage('Brand deleted successfully')
  async delete(@Param('id') id: string) {
    return this.brandsService.delete(id);
  }

  @Post(':id/logo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload brand logo via Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Brand logo uploaded successfully')
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.brandsService.uploadLogo(id, file);
  }
}
