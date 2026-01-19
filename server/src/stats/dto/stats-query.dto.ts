import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class StatsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO format)', example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)', example: '2024-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Time period', enum: ['month', 'year', 'all'] })
  @IsOptional()
  @IsEnum(['month', 'year', 'all'])
  period?: 'month' | 'year' | 'all';
}
