import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString } from "class-validator";

export class CheckLikesDto {
  @ApiProperty({ type: [String], maxItems: 100 })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds: string[];
}
