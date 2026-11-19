import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Full display name of the user',
    example: 'Rohan Sharma',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({
    description: 'Unique email address for login and verification',
    example: 'rohan.sharma@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  @ApiProperty({
    description:
      'Account password (min 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol)',
    example: 'SecurePass@2026!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"'<>,./~`|\\])[A-Za-z\d@$!%*?&#^()_\-+={}[\]:;"'<>,./~`|\\]{8,64}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password!: string;

  @ApiPropertyOptional({
    description: 'Optional mobile phone number formatted in E.164 (e.g. +919876543210)',
    example: '+919876543210',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +919876543210)',
  })
  @Transform(({ value }) => value?.trim())
  phone?: string;
}
