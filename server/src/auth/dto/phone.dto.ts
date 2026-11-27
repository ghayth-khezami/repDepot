import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";
import { Transform } from "class-transformer";

export class SetPhoneDto {
  @ApiProperty({ example: "55863578" })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "") : value))
  @Matches(/^\d{8}$/, { message: "Le téléphone doit contenir 8 chiffres." })
  phoneNumber: string;
}
