import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSubSubCategory1Dto {
  @ApiProperty({ example: "0-3 mois" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Parent sub-category ID" })
  @IsString()
  subCategoryId: string;
}

export class CreateSubSubCategory2Dto {
  @ApiProperty({ example: "Coton bio" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Parent sub-sub-category 1 ID" })
  @IsString()
  subSubCategory1Id: string;
}

export class CreateSubSubCategory3Dto {
  @ApiProperty({ example: "Manches courtes" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Parent sub-sub-category 2 ID" })
  @IsString()
  subSubCategory2Id: string;
}
