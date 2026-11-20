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
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  QueryCategoriesDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('Admin — Category Management')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories with filtering, search, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of categories' })
  @ResponseMessage('Categories retrieved successfully')
  async list(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.getAdminList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve category details by UUID' })
  @ApiResponse({ status: 200, description: 'Category detail' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ResponseMessage('Category retrieved successfully')
  async getById(@Param('id') id: string) {
    return this.categoriesService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category or subcategory' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  @ResponseMessage('Category created successfully')
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch update category display order' })
  @ApiResponse({ status: 200, description: 'Categories reordered' })
  @ResponseMessage('Category ordering updated successfully')
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto.items);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update category fields or hierarchy' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 400, description: 'Circular hierarchy or invalid parent' })
  @ResponseMessage('Category updated successfully')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category safely' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete: subcategories or products exist' })
  @ResponseMessage('Category deleted successfully')
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  @Post(':id/icon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload category icon (Cloudinary)' })
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
  @ResponseMessage('Category icon uploaded successfully')
  async uploadIcon(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.categoriesService.uploadIcon(id, file);
  }

  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload category banner/thumbnail (Cloudinary)' })
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
  @ResponseMessage('Category banner image uploaded successfully')
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.categoriesService.uploadImage(id, file);
  }
}
