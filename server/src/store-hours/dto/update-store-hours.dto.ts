import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";
import { Weekday } from "@prisma/client";

export class StoreHourItemDto {
  @IsEnum(Weekday)
  weekday: Weekday;

  @IsBoolean()
  isClosed: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "openTime must be HH:mm",
  })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "closeTime must be HH:mm",
  })
  closeTime?: string;
}

export class UpdateStoreHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreHourItemDto)
  hours: StoreHourItemDto[];
}
