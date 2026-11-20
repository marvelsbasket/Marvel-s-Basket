import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { BrandsService } from './brands.service';

@ApiTags('Catalog — Brands (Public)')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active brands with active product counts' })
  @ApiResponse({ status: 200, description: 'Active brands list' })
  @ResponseMessage('Brands retrieved successfully')
  async listActive() {
    return this.brandsService.listActive();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get brand detail by ID' })
  @ApiResponse({ status: 200, description: 'Brand details' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ResponseMessage('Brand retrieved successfully')
  async getById(@Param('id') id: string) {
    return this.brandsService.getById(id);
  }
}
