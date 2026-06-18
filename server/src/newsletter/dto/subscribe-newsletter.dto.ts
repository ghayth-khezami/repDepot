import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class SubscribeNewsletterDto {
  @ApiProperty({ example: "client@example.com" })
  @IsEmail()
  @IsString()
  email: string;
}
