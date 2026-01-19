import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CoClientQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Search by first name, last name, email, phone number, or RIB",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
