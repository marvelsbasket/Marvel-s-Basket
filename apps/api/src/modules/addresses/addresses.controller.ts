import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { ResponseMessage } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@ApiTags('Customer Addresses')
@ApiBearerAuth()
@Controller({ path: 'addresses', version: '1' })
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ResponseMessage('Addresses retrieved successfully')
  @ApiOperation({
    summary: 'List customer delivery addresses',
    description:
      'Retrieves all saved addresses for the authenticated customer, sorted with the default address first.',
  })
  @ApiResponse({ status: 200, description: 'List of customer delivery addresses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listAddresses(@CurrentUser('id') userId: string): Promise<CustomerAddressResponse[]> {
    return this.addressesService.list(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Address created successfully')
  @ApiOperation({
    summary: 'Add a new delivery address',
    description:
      'Creates a new delivery address. If marked default or if it is the first address, sets it as the default address.',
  })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ): Promise<CustomerAddressResponse> {
    return this.addressesService.create(userId, dto);
  }

  @Get(':id')
  @ResponseMessage('Address retrieved successfully')
  @ApiOperation({
    summary: 'Get address details',
    description:
      'Retrieves a single delivery address by ID. Access is strictly scoped to the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Delivery address details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found or not owned by customer' })
  async getAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerAddressResponse> {
    return this.addressesService.findById(userId, id);
  }

  @Patch(':id')
  @ResponseMessage('Address updated successfully')
  @ApiOperation({
    summary: 'Update delivery address',
    description: 'Updates address fields. Ownership is verified before applying any changes.',
  })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found or not owned by customer' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<CustomerAddressResponse> {
    return this.addressesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Address deleted successfully')
  @ApiOperation({
    summary: 'Delete delivery address',
    description:
      'Removes the specified delivery address. If the deleted address was default, the next available address is promoted.',
  })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found or not owned by customer' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.addressesService.delete(userId, id);
  }

  @Patch(':id/default')
  @ResponseMessage('Default address updated successfully')
  @ApiOperation({
    summary: 'Set default delivery address',
    description:
      'Designates the specified address as the customer default address and clears any existing default atomically.',
  })
  @ApiResponse({ status: 200, description: 'Default address set successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found or not owned by customer' })
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerAddressResponse> {
    return this.addressesService.setDefault(userId, id);
  }
}
