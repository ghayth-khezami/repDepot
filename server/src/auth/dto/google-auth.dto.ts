import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class GoogleAuthDto {
  @ApiProperty({ description: "Google ID token from GIS" })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({ enum: ["CLIENT", "DEPOSER"], default: "CLIENT" })
  @IsOptional()
  @IsIn(["CLIENT", "DEPOSER"])
  intent?: "CLIENT" | "DEPOSER";
}
