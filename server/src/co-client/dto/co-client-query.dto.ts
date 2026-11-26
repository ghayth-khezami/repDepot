import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CoClientQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Search by first name, last name, email, phone number, or RIB",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["all", "with", "without"], description: "Avec / sans articles" })
  @IsOptional()
  @IsIn(["all", "with", "without"])
  articles?: "all" | "with" | "without";
}
