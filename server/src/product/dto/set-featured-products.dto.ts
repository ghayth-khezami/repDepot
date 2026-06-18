import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString, IsUUID } from "class-validator";

export class SetFeaturedProductsDto {
  @ApiProperty({ type: [String], maxItems: 8, description: "Up to 8 product IDs in display order" })
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @IsUUID("4", { each: true })
  productIds: string[];
}
