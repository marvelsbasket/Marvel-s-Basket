import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export enum DocumentReviewActionStatus {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_RESUBMISSION = 'NEEDS_RESUBMISSION',
}

export class AdminReviewDocumentDto {
  @ApiProperty({
    description: 'Document review decision',
    enum: DocumentReviewActionStatus,
    example: DocumentReviewActionStatus.VERIFIED,
  })
  @IsNotEmpty()
  @IsEnum(DocumentReviewActionStatus, {
    message: 'Status must be VERIFIED, REJECTED, or NEEDS_RESUBMISSION',
  })
  status!: DocumentReviewActionStatus;

  @ApiPropertyOptional({
    description: 'Specific notes or rejection reasons for the document',
    example: 'Document is blurry. Please provide a clear scan of the PAN card.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  notes?: string;
}
