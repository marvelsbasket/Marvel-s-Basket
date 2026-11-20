import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockAdjustmentOperation {
  RESTOCK = 'RESTOCK',
  MANUAL_INCREASE = 'MANUAL_INCREASE',
  MANUAL_DECREASE = 'MANUAL_DECREASE',
  DAMAGED_STOCK_WRITEOFF = 'DAMAGED_STOCK_WRITEOFF',
  EXPIRED_STOCK_WRITEOFF = 'EXPIRED_STOCK_WRITEOFF',
  PICKER_SHORTAGE_WRITEOFF = 'PICKER_SHORTAGE_WRITEOFF',
  INVENTORY_CORRECTION = 'INVENTORY_CORRECTION',
}

export class AdjustStockDto {
  @ApiProperty({
    enum: StockAdjustmentOperation,
    description: 'Type of inventory adjustment operation',
    example: StockAdjustmentOperation.RESTOCK,
  })
  @IsEnum(StockAdjustmentOperation)
  operation!: StockAdjustmentOperation;

  @ApiProperty({
    description:
      'Quantity for adjustment. For RESTOCK/INCREASE/DECREASE/WRITEOFF, this is the delta. For INVENTORY_CORRECTION, this is the new target stock on hand.',
    example: 20,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({
    description: 'Mandatory operational explanation or reason for adjustment',
    example: 'Received weekly distributor delivery from Amul',
  })
  @IsNotEmpty()
  @IsString()
  note!: string;

  @ApiPropertyOptional({ description: 'External reference type, e.g., PO_INVOICE, DAMAGE_REPORT' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'External reference identifier' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent double adjustments on retry' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class QueryInventoryHistoryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by adjustment transaction type' })
  @IsOptional()
  @IsString()
  type?: string;
}
