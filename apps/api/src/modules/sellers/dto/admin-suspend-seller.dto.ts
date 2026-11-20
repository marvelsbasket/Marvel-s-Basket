import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminSuspendSellerDto {
  @ApiProperty({
    description: 'Specific reason for store suspension',
    example: 'Expired food safety compliance license and failed regulatory audit.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
