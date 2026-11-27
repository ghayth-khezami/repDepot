import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class StatsQueryDto {
  @ApiPropertyOptional({
    description: "Start date (ISO format)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date (ISO format)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Category ID filter" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Time period",
    enum: ["month", "year", "all"],
  })
  @IsOptional()
  @IsEnum(["month", "year", "all"])
  period?: "month" | "year" | "all";

  @ApiPropertyOptional({ description: "Calendar year for monthly charts", example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ description: "Map points: page (1-based)", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Map points per page (max 100)", example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
