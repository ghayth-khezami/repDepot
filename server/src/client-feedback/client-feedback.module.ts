import { Module } from "@nestjs/common";
import { ClientFeedbackController } from "./client-feedback.controller";
import { ClientFeedbackService } from "./client-feedback.service";

@Module({
  controllers: [ClientFeedbackController],
  providers: [ClientFeedbackService],
})
export class ClientFeedbackModule {}
