import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendEmailOtpDto {
  @ApiProperty({
    description: 'Registered account email address to resend OTP to',
    example: 'rohan.sharma@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;
}

export { ResendEmailOtpDto as ResendOtpDto };
