import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min, IsDateString, IsArray, ArrayMinSize } from 'class-validator';
import { CommandStatus } from '@prisma/client';

export class CreateCommandDto {
  @ApiProperty({ description: 'Number of products', example: 5 })
  @IsNumber()
  @Min(1)
  productsNumber: number;

  @ApiProperty({ description: 'Selling price', example: 999.99 })
  @IsNumber()
  @Min(0)
  PrixVente: number;

  @ApiProperty({ description: 'Purchase price', example: 699.99 })
  @IsNumber()
  @Min(0)
  PrixAchat: number;

  @ApiProperty({ description: 'Array of product IDs', example: ['uuid1', 'uuid2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'Client ID', example: 'uuid' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: 'Co-Client ID', example: 'uuid' })
  @IsOptional()
  @IsString()
  coClientId?: string;

  @ApiPropertyOptional({ description: 'Command status', enum: CommandStatus, default: CommandStatus.NOT_DELIVERED })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional({ description: 'Delivery date', example: '2026-01-20T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiProperty({ description: 'Delivery address', example: '123 Main St, City' })
  @IsString()
  adresseLivraison: string;
}
