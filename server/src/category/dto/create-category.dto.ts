import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  @MinLength(1)
  categoryName: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Electronic products' })
  @IsOptional()
  @IsString()
  description?: string;
}
