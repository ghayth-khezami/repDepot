import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsDateString,
  IsArray,
  ArrayMinSize,
} from "class-validator";
import { CommandStatus } from "@prisma/client";

export class UpdateCommandDto {
  @ApiPropertyOptional({ description: "Number of products" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  productsNumber?: number;

  @ApiPropertyOptional({ description: "Selling price" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixVente?: number;

  @ApiPropertyOptional({ description: "Purchase price" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixAchat?: number;

  @ApiPropertyOptional({ description: "Command status", enum: CommandStatus })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional({ description: "Delivery date" })
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiPropertyOptional({ description: "Delivery address" })
  @IsOptional()
  @IsString()
  adresseLivraison?: string;

  @ApiPropertyOptional({ description: "Client ID for command details" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: "Co-client / déposant ID for command details" })
  @IsOptional()
  @IsString()
  coClientId?: string;

  @ApiPropertyOptional({ description: "Product IDs — replaces line items (backoffice)" })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds?: string[];
}
