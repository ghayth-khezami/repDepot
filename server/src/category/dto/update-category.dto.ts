import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength } from "class-validator";

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: "Category name", example: "Electronics" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryName?: string;

  @ApiPropertyOptional({
    description: "Category description",
    example: "Electronic products",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Lucide icon name for category",
    example: "Baby",
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: "Cover image path for storefront cards" })
  @IsOptional()
  @IsString()
  coverDoc?: string;
}
