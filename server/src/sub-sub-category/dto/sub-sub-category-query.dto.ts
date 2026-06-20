import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SubSubCategory1QueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Parent sub-category ID" })
  @IsOptional()
  @IsString()
  subCategoryId?: string;
}

export class SubSubCategory2QueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Parent sub-sub-category 1 ID" })
  @IsOptional()
  @IsString()
  subSubCategory1Id?: string;
}

export class SubSubCategory3QueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Parent sub-sub-category 2 ID" })
  @IsOptional()
  @IsString()
  subSubCategory2Id?: string;
}
