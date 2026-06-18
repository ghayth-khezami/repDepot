import { DepositRequestStatus } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class UpdateDepositRequestStatusDto {
  @ApiProperty({ enum: DepositRequestStatus })
  @IsEnum(DepositRequestStatus)
  status: DepositRequestStatus;
}
