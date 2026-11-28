import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { DeliveryStatus, VerificationStatus } from '@prisma/client';
import { DELIVERY_FAILURE_REASONS, DeliveryFailureReason } from '../delivery-state-machine';

export class QueryDeliveriesDto {
  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Search by order number or store name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AssignDeliveryDto {
  @ApiProperty({ description: 'Verified DeliveryPartner UUID' })
  @IsUUID()
  deliveryPartnerId!: string;

  @ApiPropertyOptional({ description: 'Optional assignment note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReassignDeliveryDto {
  @ApiProperty({ description: 'New verified DeliveryPartner UUID' })
  @IsUUID()
  deliveryPartnerId!: string;

  @ApiProperty({ description: 'Audit reason for reassignment' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CancelDeliveryDto {
  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class RejectAssignmentDto {
  @ApiProperty({ description: 'Reason for rejecting the delivery assignment' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CompleteDeliveryDto {
  @ApiPropertyOptional({ description: '4-digit customer handover OTP' })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({ description: 'Name of person receiving the package' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Whether COD cash/UPI was collected (required for COD)' })
  @IsOptional()
  @IsBoolean()
  codCollected?: boolean;

  @ApiPropertyOptional({ description: 'Collected COD amount in INR' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  codCollectedAmount?: number;

  @ApiPropertyOptional({ description: 'Optional completion note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class FailDeliveryDto {
  @ApiProperty({ enum: DELIVERY_FAILURE_REASONS })
  @IsIn(DELIVERY_FAILURE_REASONS)
  reason!: DeliveryFailureReason;

  @ApiPropertyOptional({ description: 'Additional failure details' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReportHandoverIssueDto {
  @ApiProperty({ description: 'Issue reason' })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePartnerAvailabilityDto {
  @ApiProperty({ enum: ['AVAILABLE', 'OFFLINE'] })
  @IsIn(['AVAILABLE', 'OFFLINE'])
  availabilityStatus!: 'AVAILABLE' | 'OFFLINE';
}

export class RegisterDeliveryPartnerDto {
  @ApiProperty({ description: 'User UUID to register as a delivery partner' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Vehicle type (e.g., BIKE, SCOOTER, BICYCLE)' })
  @IsString()
  @MinLength(2)
  vehicleType!: string;

  @ApiPropertyOptional({ description: 'Vehicle registration number' })
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus = VerificationStatus.VERIFIED;
}
