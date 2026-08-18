import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsEmail,
  ValidateNested,
  Matches,
  MaxLength,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { IsUniqueStrings } from "../../common/validators/unique-strings.validator";

class GuestClientDto {
  @ApiProperty({ example: "John" })
  @IsString()
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @MaxLength(80)
  lastName: string;

  @ApiProperty({ example: "123 Main St, City" })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: "12345678" })
  @IsString()
  @Matches(/^\d{8}$/, { message: "phoneNumber must be exactly 8 digits" })
  phoneNumber: string;
}

/** Public storefront checkout — prices are computed server-side. */
export class CheckoutCommandDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsUUID("4", { each: true })
  @IsUniqueStrings()
  productIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ type: GuestClientDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestClientDto)
  guestClient?: GuestClientDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiProperty({ example: "123 Main St, City" })
  @IsString()
  @MaxLength(500)
  adresseLivraison: string;
}
