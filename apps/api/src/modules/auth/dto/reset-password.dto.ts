import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Cryptographically secure password reset token received via email',
    example: 'd9b3e1f0a82b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol)',
    example: 'NewSecurePass@2026!',
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
  newPassword!: string;
}
