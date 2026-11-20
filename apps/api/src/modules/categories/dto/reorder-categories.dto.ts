import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class CategoryOrderItem {
  @ApiProperty({ description: 'Category UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4')
  id!: string;

  @ApiProperty({ description: 'New display order index', example: 1 })
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({
    description: 'Array of categories with updated display order',
    type: [CategoryOrderItem],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  items!: CategoryOrderItem[];
}
