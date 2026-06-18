import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateClientFeedbackDto {
  @ApiProperty({ example: "Ahmed B." })
  @IsString()
  clientName: string;

  @ApiProperty({ example: "Très belle sélection, accueil chaleureux." })
  @IsString()
  description: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
