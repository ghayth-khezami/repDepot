import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum, IsUUID , IsIn, Matches } from "class-validator";
import { ProductStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Search by product name or description" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Filter by sub-category ID" })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiPropertyOptional({ description: "Filter by sub-sub-category level 1 ID" })
  @IsOptional()
  @IsString()
  subSubCategory1Id?: string;

  @ApiPropertyOptional({ description: "Filter by sub-sub-category level 2 ID" })
  @IsOptional()
  @IsString()
  subSubCategory2Id?: string;

  @ApiPropertyOptional({ description: "Filter by sub-sub-category level 3 ID" })
  @IsOptional()
  @IsString()
  subSubCategory3Id?: string;

  @ApiPropertyOptional({ description: "Filter by coClient ID" })
  @IsOptional()
  @IsString()
  coclientId?: string;

  @ApiPropertyOptional({ description: "Filter by isDepot status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDepot?: boolean;

  @ApiPropertyOptional({ description: "Filter by minimum price" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: "Filter by maximum price" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: "Filter by availability (in stock)" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDispo?: boolean;

  @ApiPropertyOptional({
    description: "Sort: newest | price_asc | price_desc | name_asc",
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: "Filter by shop-by-age group: 0-6 | 6-12 | 12-24 | 2-3 | 4plus",
  })
  @IsOptional()
  @IsString()
  age?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: "Filter by dépôt contract (deposit request) id" })
  @IsOptional()
  @IsUUID("4")
  depositRequestId?: string;

  @ApiPropertyOptional({ enum: ["EN_VENTE", "VENDU", "PAYE", "RETIRE"], description: "Admin: visible stage (PAYE = VENDU + payé)" })
  @IsOptional()
  @IsIn(["EN_VENTE", "VENDU", "PAYE", "RETIRE"])
  stage?: "EN_VENTE" | "VENDU" | "PAYE" | "RETIRE";

  @ApiPropertyOptional({ enum: ["yes", "no"], description: "Admin: publiés / non publiés sur le site" })
  @IsOptional()
  @IsIn(["yes", "no"])
  published?: "yes" | "no";
}

/** QR labels export: same filters + the print format ("a4" sheet, or a label roll like "50x30" in mm). */
export class LabelExportQueryDto extends ProductQueryDto {
  @ApiPropertyOptional({ description: "Format : a4 (12 cartes) ou LxH en mm pour un rouleau d'étiquettes, ex. 50x30" })
  @IsOptional()
  @Matches(/^(a4|\d{2,3}(\.\d)?x\d{2,3}(\.\d)?)$/i)
  format?: string;
}
