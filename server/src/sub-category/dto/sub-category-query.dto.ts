import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SubCategoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by parent category ID" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Search by title or description" })
  @IsOptional()
  @IsString()
  search?: string;
}
