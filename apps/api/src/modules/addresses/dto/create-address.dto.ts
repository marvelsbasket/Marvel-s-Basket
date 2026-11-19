import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Address category label (e.g., Home, Work, Other)',
    example: 'Home',
    default: 'Home',
  })
  @IsString()
  @IsNotEmpty({ message: 'Address label is required' })
  @MaxLength(50, { message: 'Address label cannot exceed 50 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;

  @ApiProperty({
    description: 'Full name of the recipient at this address',
    example: 'Rohan Sharma',
  })
  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  @MinLength(2, { message: 'Recipient name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Recipient name cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  recipientName!: string;

  @ApiProperty({
    description: '10-digit Indian delivery contact mobile number',
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty({ message: 'Contact phone number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  phone!: string;

  @ApiProperty({
    description: 'House/flat number, building name, and street address',
    example: 'Flat 402, Green Valley Apartments, Civil Lines',
  })
  @IsString()
  @IsNotEmpty({ message: 'Address line 1 is required' })
  @MinLength(3, { message: 'Address line 1 must be at least 3 characters long' })
  @MaxLength(255, { message: 'Address line 1 cannot exceed 255 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  addressLine1!: string;

  @ApiPropertyOptional({
    description: 'Locality, floor, or sub-area details',
    example: 'Near Collectorate',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Address line 2 cannot exceed 255 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Nearby landmark to facilitate delivery partner navigation',
    example: 'Opposite State Bank of India',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Landmark cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  landmark?: string;

  @ApiProperty({
    description: 'City or town name',
    example: 'Azamgarh',
  })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MinLength(2, { message: 'City must be at least 2 characters long' })
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city!: string;

  @ApiProperty({
    description: 'State name',
    example: 'Uttar Pradesh',
  })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  @MinLength(2, { message: 'State must be at least 2 characters long' })
  @MaxLength(100, { message: 'State cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  state!: string;

  @ApiProperty({
    description: '6-digit Indian postal code (PIN code)',
    example: '276001',
  })
  @IsString()
  @IsNotEmpty({ message: 'PIN code is required' })
  @Matches(/^\d{6}$/, { message: 'PIN code must be a valid 6-digit Indian postal code' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  postalCode!: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'India',
    default: 'India',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country cannot exceed 100 characters' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  country?: string;

  @ApiPropertyOptional({
    description: 'Delivery coordinate latitude',
    example: 26.0688,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Delivery coordinate longitude',
    example: 83.1859,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Flag indicating if this address is set as the default delivery address',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
