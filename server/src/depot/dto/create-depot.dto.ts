import { COMMISSION_MESSAGE, COMMISSION_VALUES } from "../../common/commission";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
/** Empty optional strings become undefined so "optional" really means optional. */
const trimOrUndef = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const t = value.trim();
  return t === "" ? undefined : t;
};
const digitsOrUndef = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const d = value.replace(/\s/g, "");
  return d === "" ? undefined : d;
};

export class NewDeposantDto {
  @ApiProperty({ example: "Sarra" })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Le prénom est obligatoire." })
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: "Ben Ali" })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Le nom est obligatoire." })
  @MaxLength(80)
  lastName: string;

  @ApiProperty({ example: "55863578", description: "8 digits, without +216" })
  @Transform(digitsOrUndef)
  @Matches(/^\d{8}$/, { message: "Le téléphone doit contenir exactement 8 chiffres." })
  phone: string;

  @ApiPropertyOptional()
  @Transform(trimOrUndef)
  @IsOptional()
  @IsEmail({}, { message: "Email invalide." })
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: "20 digits" })
  @Transform(digitsOrUndef)
  @IsOptional()
  @Matches(/^\d{20}$/, { message: "Le RIB doit contenir exactement 20 chiffres." })
  rib?: string;

  @ApiPropertyOptional({ enum: ["F", "M"], description: "F = femme, M = homme (illustration)" })
  @IsOptional()
  @IsIn(["F", "M"], { message: "Choisissez Femme ou Homme." })
  gender?: "F" | "M";
}

export class DepotItemDto {
  @ApiProperty({ example: "Poussette Chicco" })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Le nom de l'article est obligatoire." })
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 320, description: "Selling price in TND (max 3 decimals)" })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: "Prix invalide (3 décimales max)." })
  @Min(0.001, { message: "Le prix doit être supérieur à 0." })
  @Max(1_000_000)
  price: number;

  @ApiProperty({ example: 25, enum: COMMISSION_VALUES })
  @Type(() => Number)
  @IsIn(COMMISSION_VALUES as unknown as number[], { message: COMMISSION_MESSAGE })
  commissionPercent: number;

  @ApiProperty({ description: "Category id (Product.categoryId is required)" })
  @IsUUID("4", { message: "Catégorie obligatoire." })
  categoryId: string;

  @ApiPropertyOptional({ description: "Sous-catégorie (optional)" })
  @IsOptional()
  @IsUUID("4")
  subCategoryId?: string;

  @ApiPropertyOptional({ description: "Sous-sous-catégorie niveau 1 (optional)" })
  @IsOptional()
  @IsUUID("4")
  subSubCategory1Id?: string;

  @ApiPropertyOptional({ type: [String], description: "URLs returned by /media/upload (Cloudinary https URL or /uploads/… fallback)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4, { message: "Maximum 4 photos par article." })
  @Matches(/^(https:\/\/\S+|\/uploads\/[\w./-]+)$/, { each: true, message: "Photo invalide." })
  photos?: string[];
}

export class CreateDepotDto {
  @ApiPropertyOptional({ description: "Existing déposant id. Omit to create `deposant`." })
  @IsOptional()
  @IsUUID("4")
  deposantId?: string;

  @ApiPropertyOptional({ type: NewDeposantDto })
  @ValidateIf((o: CreateDepotDto) => !o.deposantId)
  @ValidateNested()
  @Type(() => NewDeposantDto)
  deposant?: NewDeposantDto;

  @ApiProperty({ enum: [1, 3, 6] })
  @Type(() => Number)
  @IsIn([1, 3, 6], { message: "Durée: 1, 3 ou 6 mois." })
  durationMonths: number;

  @ApiPropertyOptional({ description: "Date du dépôt (YYYY-MM-DD). Défaut : aujourd'hui. Le contrat court à partir de cette date." })
  @IsOptional()
  @IsDateString({}, { message: "Date de dépôt invalide." })
  depositDate?: string;

  @ApiPropertyOptional()
  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;

  @ApiProperty({ type: [DepotItemDto], description: "May be empty (articles step skipped)" })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DepotItemDto)
  items: DepotItemDto[];
}

export class AddDepotItemsDto {
  @ApiProperty({ type: [DepotItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DepotItemDto)
  items: DepotItemDto[];
}

export class DeposantSearchDto {
  @ApiPropertyOptional()
  @Transform(trimOrUndef)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
