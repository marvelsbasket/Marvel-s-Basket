import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AccountOverviewResponse,
  AccountPreferencesResponse,
  CustomerProfileResponse,
} from '@marvels-basket/shared';
import { ResponseMessage } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdatePreferencesDto, UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Customer Users & Profile')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({
    summary: 'Get current customer profile',
    description: 'Retrieves personal profile details for the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('id') userId: string): Promise<CustomerProfileResponse> {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @ResponseMessage('Profile updated successfully')
  @ApiOperation({
    summary: 'Update current customer profile',
    description:
      'Updates personal information such as display name, avatar, and date of birth. Sensitive fields (roles, email, verification status) are strictly immutable through this endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<CustomerProfileResponse> {
    return this.usersService.updateMe(userId, dto);
  }

  @Get('me/account')
  @ResponseMessage('Account details retrieved successfully')
  @ApiOperation({
    summary: 'Get account overview and status',
    description:
      'Retrieves high-level account metadata including verification status, creation date, and total saved addresses.',
  })
  @ApiResponse({ status: 200, description: 'Account metadata retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAccountOverview(@CurrentUser('id') userId: string): Promise<AccountOverviewResponse> {
    return this.usersService.getAccountOverview(userId);
  }

  @Get('me/preferences')
  @ResponseMessage('Account preferences retrieved successfully')
  @ApiOperation({
    summary: 'Get customer notification preferences',
    description: 'Retrieves channel opt-in settings for email, SMS, push, and in-app alerts.',
  })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@CurrentUser('id') userId: string): Promise<AccountPreferencesResponse> {
    return this.usersService.getPreferences(userId);
  }

  @Patch('me/preferences')
  @ResponseMessage('Account preferences updated successfully')
  @ApiOperation({
    summary: 'Update customer notification preferences',
    description: 'Updates communication channel preferences for the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<AccountPreferencesResponse> {
    return this.usersService.updatePreferences(userId, dto);
  }

  @Patch('me/deactivate')
  @ResponseMessage('Account deactivated successfully')
  @ApiOperation({
    summary: 'Deactivate customer account',
    description:
      'Soft-deactivates the customer account (status INACTIVE) and revokes all active authenticated sessions.',
  })
  @ApiResponse({ status: 200, description: 'Account deactivated and sessions revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateAccount(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.deactivateAccount(userId);
  }
}
