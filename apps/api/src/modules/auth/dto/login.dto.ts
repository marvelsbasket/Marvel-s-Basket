import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Registered email address of the account',
    example: 'rohan.sharma@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'SecurePass@2026!',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
