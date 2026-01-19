import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min, IsDateString } from 'class-validator';
import { CommandStatus } from '@prisma/client';

export class UpdateCommandDto {
  @ApiPropertyOptional({ description: 'Number of products' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  productsNumber?: number;

  @ApiPropertyOptional({ description: 'Selling price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixVente?: number;

  @ApiPropertyOptional({ description: 'Purchase price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  PrixAchat?: number;

  @ApiPropertyOptional({ description: 'Command status', enum: CommandStatus })
  @IsOptional()
  @IsEnum(CommandStatus)
  status?: CommandStatus;

  @ApiPropertyOptional({ description: 'Delivery date' })
  @IsOptional()
  @IsDateString()
  dateLivraison?: string;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  adresseLivraison?: string;
}
