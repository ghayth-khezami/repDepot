import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty({ description: "Product name", example: "Laptop" })
  @IsString()
  productName: string;

  @ApiPropertyOptional({
    description: "Product description",
    example: "High performance laptop",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Selling price", example: 999.99 })
  @IsNumber()
  @Min(0)
  PrixVente: number;

  @ApiPropertyOptional({
    description: "Purchase price (required if not depot)",
    example: 699.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixAchat?: number;

  @ApiProperty({ description: "Stock quantity", example: 50 })
  @IsNumber()
  stockQuantity: number;

  @ApiProperty({ description: "Is in depot", example: true })
  @IsBoolean()
  isDepot: boolean;

  @ApiPropertyOptional({
    description: "Depot percentage (0-100, required if depot)",
    example: 20,
  })
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

  @ApiProperty({ description: "Category ID", example: "uuid" })
  @IsString()
  categoryId: string;
}
