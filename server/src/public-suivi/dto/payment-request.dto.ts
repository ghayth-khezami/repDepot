import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, Matches } from "class-validator";

export class CreatePaymentRequestDto {
  @ApiProperty({ type: [String], description: "Réf. des articles vendus (ex. D-2-04)" })
  @IsArray()
  @ArrayMinSize(1, { message: "Choisissez au moins un article." })
  @ArrayMaxSize(200)
  @IsString({ each: true })
  refs: string[];

  @ApiProperty({ example: "2026-12-03", description: "Jour de passage (48 h minimum, pas le dimanche)" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Date invalide." })
  pickupDate: string;
}

export class SetPaymentRequestStatusDto {
  @ApiProperty({ enum: ["DONE", "CANCELLED"] })
  @IsIn(["DONE", "CANCELLED"])
  status: "DONE" | "CANCELLED";
}
