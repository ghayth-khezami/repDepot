import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsEmail,
  ValidateNested,
  Matches,
} from "class-validator";
import { CommandStatus } from "@prisma/client";
import { Type } from "class-transformer";

class GuestClientDto {
  @ApiProperty({ description: "Guest first name", example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Guest last name", example: "Doe" })
  @IsString()
  lastName: string;

  @ApiProperty({ description: "Guest address", example: "123 Main St, City" })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: "Guest email (optional — derived from phone if omitted)" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "Guest phone", example: "+21600000000" })
  @IsString()
  @Matches(/^\d{8}$/, { message: "phoneNumber must be exactly 8 digits" })
  phoneNumber: string;
}

export class CreateCommandDto {
  @ApiProperty({ description: "Number of products", example: 5 })
  @IsNumber()
  @Min(1)
  productsNumber: number;

  @ApiProperty({ description: "Selling price", example: 999.99 })
  @IsNumber()
  @Min(0)
  PrixVente: number;

  @ApiProperty({ description: "Purchase price", example: 699.99 })
  @IsNumber()
  @Min(0)
  PrixAchat: number;

  @ApiProperty({
    description: "Array of product IDs",
    example: ["uuid1", "uuid2"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];

  @ApiPropertyOptional({ description: "Client ID", example: "uuid" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ type: GuestClientDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestClientDto)
  guestClient?: GuestClientDto;

  @ApiPropertyOptional({ description: "Co-Client ID", example: "uuid" })
  @IsOptional()
  @IsString()
  coClientId?: string;

  @ApiPropertyOptional({
    description: "Command status",
    enum: CommandStatus,
    default: CommandStatus.NOT_DELIVERED,
  })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional({
    description: "Delivery date",
    example: "2026-01-20T10:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiProperty({
    description: "Delivery address",
    example: "123 Main St, City",
  })
  @IsString()
  adresseLivraison: string;

}
