import { Type } from "class-transformer";
import { IsString, IsUrl, MaxLength, ValidateNested } from "class-validator";

class PushKeysDto {
  @IsString()
  @MaxLength(200)
  p256dh: string;

  @IsString()
  @MaxLength(100)
  auth: string;
}

export class DeposantPushDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class DeposantUnsubscribeDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(1000)
  endpoint: string;
}
