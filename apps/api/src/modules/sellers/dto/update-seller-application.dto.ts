import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSellerApplicationDto {
  @ApiPropertyOptional({ description: 'Current step in onboarding form (1-5)', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep?: number;

  // Step 1: Personal profile
  @ApiPropertyOptional({ description: 'Owner or signatory full name', example: 'Rajesh Gupta' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ description: '10-digit Indian mobile number', example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9',
  })
  businessPhone?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  // Step 2: Store information
  @ApiPropertyOptional({ description: 'Public store display name', example: 'Gupta Supermart' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeDisplayName?: string;

  @ApiPropertyOptional({ description: 'Store Category', example: 'GROCERY' })
  @IsOptional()
  @IsString()
  storeCategory?: string;

  @ApiPropertyOptional({
    description: 'Shop / building address line 1',
    example: 'Shop #4, Main Market',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Street / locality line 2', example: 'Civil Lines' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Prominent landmark', example: 'Near Clock Tower' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  landmark?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Azamgarh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'Uttar Pradesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: '6-digit Indian PIN code', example: '276001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Postal code must be a valid 6-digit Indian PIN code' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Store Latitude coordinate', example: 26.0688 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Store Longitude coordinate', example: 83.1859 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Delivery service radius in km', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  serviceRadiusKm?: number;

  @ApiPropertyOptional({ description: 'Store opening time (HH:MM)', example: '07:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Opening time must be in HH:MM format' })
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Store closing time (HH:MM)', example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Closing time must be in HH:MM format' })
  closingTime?: string;

  @ApiPropertyOptional({ description: 'Weekly off days (e.g. None or Sunday)', example: 'None' })
  @IsOptional()
  @IsString()
  weeklyOffDays?: string;

  @ApiPropertyOptional({ description: 'Storefront photo URL' })
  @IsOptional()
  @IsString()
  storefrontPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Store interior photo URL' })
  @IsOptional()
  @IsString()
  storeInteriorPhotoUrl?: string;

  // Step 3: Business & Tax
  @ApiPropertyOptional({
    description: 'Registered legal business name',
    example: 'Gupta Enterprises LLP',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  legalBusinessName?: string;

  @ApiPropertyOptional({ description: 'Business entity structure', example: 'SOLE_PROPRIETORSHIP' })
  @IsOptional()
  @IsString()
  businessEntityType?: string;

  @ApiPropertyOptional({ description: '10-character PAN number', example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'PAN must be a valid 10-character alphanumeric Indian PAN code (e.g. ABCDE1234F)',
  })
  pan?: string;

  @ApiPropertyOptional({
    description: '15-character GSTIN (optional/conditional)',
    example: '09ABCDE1234F1Z5',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'GSTIN must be a valid 15-character Indian GST identification number',
  })
  gstin?: string;

  @ApiPropertyOptional({
    description: '14-digit FSSAI license number (conditional)',
    example: '12345678901234',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, {
    message: 'FSSAI License number must be exactly 14 digits',
  })
  fssaiNumber?: string;

  @ApiPropertyOptional({
    description: 'FSSAI License expiry date (ISO date string)',
    example: '2028-12-31',
  })
  @IsOptional()
  @IsString()
  fssaiExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Shop and Establishment license number' })
  @IsOptional()
  @IsString()
  shopEstablishmentNumber?: string;

  // Step 4: Bank & Settlement
  @ApiPropertyOptional({ description: 'Bank account beneficiary name', example: 'Rajesh Gupta' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankAccountHolderName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (9-18 digits)',
    example: '12345678901234',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,18}$/, {
    message: 'Bank account number must be between 9 and 18 digits',
  })
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Confirm bank account number (must match bankAccountNumber)',
  })
  @IsOptional()
  @IsString()
  confirmBankAccountNumber?: string;

  @ApiPropertyOptional({ description: '11-character Indian IFSC code', example: 'SBIN0001234' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC must be a valid 11-character Indian code (e.g. SBIN0001234)',
  })
  bankIfscCode?: string;

  @ApiPropertyOptional({ description: 'Bank Name', example: 'State Bank of India' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Account Type', example: 'CURRENT' })
  @IsOptional()
  @IsString()
  bankAccountType?: string;

  @ApiPropertyOptional({ description: 'UPI ID (optional)', example: 'rajesh@sbi' })
  @IsOptional()
  @IsString()
  @Matches(/^[\w.-]+@[\w.-]+$/, {
    message: 'UPI ID must be a valid handle (e.g. username@bank)',
  })
  upiId?: string;
}
