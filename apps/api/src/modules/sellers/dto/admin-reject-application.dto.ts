import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminRejectApplicationDto {
  @ApiProperty({
    description: 'Specific reason for rejecting seller application or requesting resubmission',
    example:
      'Bank account holder name does not match legal business entity name. Please update bank details.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
