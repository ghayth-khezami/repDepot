import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length } from "class-validator";

export class VerifyDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Code à 6 chiffres", example: "123456" })
  @IsString()
  @Length(6, 6)
  code: string;
}

