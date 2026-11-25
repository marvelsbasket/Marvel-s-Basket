import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ReverseGeocodeDto, ServiceabilityQueryDto } from './dto';
import { LocationsService } from './locations.service';

@ApiTags('Storefront — Locations & Serviceability (Public)')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Public()
  @Post('reverse-geocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse-geocode GPS latitude & longitude into a delivery address',
  })
  @ApiResponse({ status: 200, description: 'Coordinates resolved to human-readable address' })
  @ApiResponse({ status: 422, description: 'Coordinates could not be mapped to an address' })
  @ApiResponse({ status: 502, description: 'Reverse geocoding service failed' })
  @ResponseMessage('Location detected successfully')
  async reverseGeocode(@Body() dto: ReverseGeocodeDto) {
    return this.locationsService.reverseGeocode(dto);
  }

  @Public()
  @Get('serviceability')
  @ApiOperation({
    summary: 'Resolve location serviceability and eligible nearby stores',
  })
  @ApiResponse({ status: 200, description: 'Serviceability and eligible store context' })
  @ResponseMessage('Serviceability checked successfully')
  async checkServiceability(@Query() query: ServiceabilityQueryDto) {
    return this.locationsService.checkServiceability(query);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({
    summary: 'Search supported serviceable cities, localities, and PIN codes',
  })
  @ApiResponse({ status: 200, description: 'Supported serviceable area suggestions' })
  @ResponseMessage('Location suggestions retrieved successfully')
  async getSuggestions(@Query('q') q?: string) {
    return this.locationsService.getLocationSuggestions(q);
  }

  @Public()
  @Get('places')
  @ApiOperation({
    summary: 'Forward-geocode cities, localities, streets, landmarks, and PIN codes across India',
  })
  @ApiResponse({ status: 200, description: 'Place search results retrieved successfully' })
  @ResponseMessage('Places retrieved successfully')
  async searchPlaces(@Query('q') q?: string) {
    return this.locationsService.searchPlaces(q || '');
  }
}
