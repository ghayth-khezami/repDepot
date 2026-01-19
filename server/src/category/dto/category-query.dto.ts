import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CategoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Search by category name or description",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
