import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailOtpDto {
  @ApiProperty({
    description: 'Registered account email address to verify',
    example: 'rohan.sharma@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  @ApiProperty({
    description: '6-digit numeric verification OTP received via email',
    example: '482910',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification OTP must contain only digits' })
  @Transform(({ value }) => value?.trim())
  otp!: string;
}
