import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsUUID } from "class-validator";

/** In-shop sale: unknown client ("Client sur place"), shop address, delivered at once. */
export class SurPlaceCommandDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: "Choisissez au moins un article." })
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  productIds: string[];

  @ApiPropertyOptional({ description: "Date de la vente (défaut : maintenant)" })
  @IsOptional()
  @IsDateString({}, { message: "Date invalide." })
  date?: string;
}
