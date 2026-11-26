import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { ProductStage, STAGES } from "../lifecycle";

export class ChangeLifecycleDto {
  @ApiProperty({ enum: STAGES, example: "PAYE" })
  @IsIn(STAGES, { message: "Statut inconnu (EN_VENTE, VENDU, PAYE ou RETIRE)." })
  to: ProductStage;
}
