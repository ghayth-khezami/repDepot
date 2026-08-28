import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  IsArray,
  IsUUID,
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

  @ApiPropertyOptional({
    description: "Instagram reel/post URL",
    example: "https://www.instagram.com/reel/abc123/",
  })
  @IsOptional()
  @IsString()
  instagramLink?: string;

  @ApiPropertyOptional({
    description: "Facebook post/reel URL",
    example: "https://www.facebook.com/share/r/abc123/",
  })
  @IsOptional()
  @IsString()
  facebookLink?: string;

  @ApiPropertyOptional({
    description: "TikTok video URL",
    example: "https://www.tiktok.com/@user/video/123456789",
  })
  @IsOptional()
  @IsString()
  tiktokLink?: string;

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

  @ApiProperty({ description: "Is in depot", example: true })
  @IsBoolean()
  isDepot: boolean;

  @ApiPropertyOptional({ description: "Whether the single product item is available", default: true })
  @IsOptional()
  @IsBoolean()
  isDispo?: boolean;

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

  @ApiPropertyOptional({ type: [String], description: "Category IDs for multi-category assignment" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: "Sub-category ID", example: "uuid" })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiPropertyOptional({ type: [String], description: "Sub-category IDs for multi-assignment" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  subCategoryIds?: string[];

  @ApiPropertyOptional({ description: "Sub-sub-category level 1 ID", example: "uuid" })
  @IsOptional()
  @IsString()
  subSubCategory1Id?: string;

  @ApiPropertyOptional({ description: "Sub-sub-category level 2 ID", example: "uuid" })
  @IsOptional()
  @IsString()
  subSubCategory2Id?: string;

  @ApiPropertyOptional({ description: "Sub-sub-category level 3 ID", example: "uuid" })
  @IsOptional()
  @IsString()
  subSubCategory3Id?: string;

  @ApiPropertyOptional({ type: [String], description: "Sub-sub-category level 1 IDs" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  subSubCategory1Ids?: string[];

  @ApiPropertyOptional({ type: [String], description: "Sub-sub-category level 2 IDs" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  subSubCategory2Ids?: string[];

  @ApiPropertyOptional({ type: [String], description: "Sub-sub-category level 3 IDs" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  subSubCategory3Ids?: string[];

  @ApiPropertyOptional({ description: "Store barcode (auto-generated if omitted)" })
  @IsOptional()
  @IsString()
  barcode?: string;
}
