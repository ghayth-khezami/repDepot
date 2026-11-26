import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

const trimOrUndef = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const t = value.trim();
  return t === "" ? undefined : t;
};
const digitsOrUndef = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const d = value.replace(/\s/g, "").replace(/^(\+216|00216)/, "");
  return d === "" ? undefined : d;
};

export class CreateCoClientDto {
  @ApiProperty({ description: "First name", example: "Jane" })
  @Transform(trimOrUndef)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ description: "Last name", example: "Smith" })
  @Transform(trimOrUndef)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName: string;

  @ApiPropertyOptional({ description: "Address", example: "456 Oak Ave, City" })
  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: "Email address (required only to create a login)" })
  @Transform(trimOrUndef)
  @ValidateIf((o: CreateCoClientDto) => o.email !== undefined || !!o.password)
  @IsEmail({}, { message: "Email invalide (obligatoire pour créer un accès)." })
  email?: string;

  @ApiProperty({ description: "Phone number, 8 digits without +216", example: "55863578" })
  @Transform(digitsOrUndef)
  @Matches(/^\d{8}$/, { message: "Le téléphone doit contenir exactement 8 chiffres." })
  phoneNumber: string;

  @ApiPropertyOptional({ description: "RIB, 20 digits" })
  @Transform(digitsOrUndef)
  @IsOptional()
  @Matches(/^\d{20}$/, { message: "Le RIB doit contenir exactement 20 chiffres." })
  RIB?: string;

  @ApiPropertyOptional({
    description: "Optional login password (creates DEPOSER account). Not needed for QR tracking.",
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
