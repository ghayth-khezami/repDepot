import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: "Secret123!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "55863578", description: "8 chiffres, sans +216. Relie les commandes passées avec ce numéro." })
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "") : value))
  @Matches(/^\d{8}$/, { message: "Le téléphone doit contenir 8 chiffres." })
  phoneNumber: string;

  @ApiPropertyOptional({ example: "mme-khezami" })
  @IsOptional()
  @IsString()
  username?: string;
}

