import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ClientQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Search by first name, last name, email, or phone number",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
