import { PartialType } from "@nestjs/swagger";
import { CreateClientFeedbackDto } from "./create-client-feedback.dto";

export class UpdateClientFeedbackDto extends PartialType(CreateClientFeedbackDto) {}
