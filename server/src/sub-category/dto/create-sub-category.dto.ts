import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSubCategoryDto {
  @ApiProperty({ example: "Bodies & pyjamas" })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: "Bodies et grenouillères bébé" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Parent category ID" })
  @IsString()
  categoryId: string;
}
