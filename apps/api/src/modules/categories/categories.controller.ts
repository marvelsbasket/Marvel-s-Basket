import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Catalog — Categories (Public)')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Retrieve active category tree',
    description:
      'Returns the full nested category and subcategory hierarchy with active product counts and media assets for storefront navigation.',
  })
  @ApiResponse({ status: 200, description: 'Hierarchical category tree' })
  @ResponseMessage('Category tree retrieved successfully')
  async getTree() {
    return this.categoriesService.getTree(true);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Retrieve single category by URL slug',
    description:
      'Returns category details, parent breadcrumb, and active subcategories for category-specific listing pages.',
  })
  @ApiResponse({ status: 200, description: 'Category details and subcategories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ResponseMessage('Category details retrieved successfully')
  async getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug);
  }
}
