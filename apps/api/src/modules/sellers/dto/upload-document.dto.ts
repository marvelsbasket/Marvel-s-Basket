import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AllowedSellerDocumentType {
  PAN_CARD = 'PAN_CARD',
  BANK_PROOF = 'BANK_PROOF',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  FSSAI_CERTIFICATE = 'FSSAI_CERTIFICATE',
  GST_CERTIFICATE = 'GST_CERTIFICATE',
  STORE_FRONT_PHOTO = 'STORE_FRONT_PHOTO',
  OTHER = 'OTHER',
}

export class UploadSellerDocumentDto {
  @ApiProperty({
    description: 'Document classification type',
    enum: AllowedSellerDocumentType,
    example: AllowedSellerDocumentType.PAN_CARD,
  })
  @IsNotEmpty()
  @IsEnum(AllowedSellerDocumentType, {
    message:
      'Invalid document type. Allowed types: PAN_CARD, BANK_PROOF, ADDRESS_PROOF, FSSAI_CERTIFICATE, GST_CERTIFICATE, STORE_FRONT_PHOTO, OTHER',
  })
  documentType!: AllowedSellerDocumentType;

  @ApiPropertyOptional({
    description: 'Document expiration date if applicable',
    example: '2028-12-31',
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;
}
