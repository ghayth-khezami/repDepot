import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from "class-validator";

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "Product name", example: "Laptop" })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({
    description: "Product description",
    example: "High performance laptop",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Selling price", example: 999.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixVente?: number;

  @ApiPropertyOptional({ description: "Purchase price", example: 699.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixAchat?: number;

  @ApiPropertyOptional({ description: "Stock quantity", example: 50 })
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: "Is in depot", example: true })
  @IsOptional()
  @IsBoolean()
  isDepot?: boolean;

  @ApiPropertyOptional({ description: "Depot percentage (0-100)", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depotPercentage?: number;

  @ApiPropertyOptional({ description: "Surcharge amount", example: 10.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surcharge?: number;

  @ApiPropertyOptional({ description: "CoClient ID", example: "uuid" })
  @IsOptional()
  @IsString()
  coclientId?: string;

  @ApiPropertyOptional({ description: "Category ID", example: "uuid" })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
