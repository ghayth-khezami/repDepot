import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsUUID } from "class-validator";

export class PublishProductsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: "Sélectionnez au moins un produit." })
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  ids: string[];

  @ApiProperty({ description: "true = publier sur le site, false = retirer du site" })
  @IsBoolean()
  published: boolean;
}
