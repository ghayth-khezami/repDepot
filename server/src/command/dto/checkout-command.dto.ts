import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsEmail,
  ValidateNested,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

class GuestClientDto {
  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiProperty({ example: "123 Main St, City" })
  @IsString()
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
  @IsString({ each: true })
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
  adresseLivraison: string;
}
