import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class CreateDepositRequestDto {
  @ApiProperty({ example: "Sarra Ben Ali" })
  @IsString()
  fullName: string;

  @ApiProperty({ example: "+21612345678" })
  @IsString()
  @Matches(/^\d{8}$/, { message: "phoneNumber must be exactly 8 digits" })
  phoneNumber: string;

  @ApiProperty({ example: 120.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proposedPrice: number;

  @ApiPropertyOptional({ example: "Produit en excellent etat" })
  @IsOptional()
  @IsString()
  message?: string;
}
