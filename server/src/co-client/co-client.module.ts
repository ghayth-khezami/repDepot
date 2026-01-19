import { Module } from "@nestjs/common";
import { CoClientService } from "./co-client.service";
import { CoClientController } from "./co-client.controller";

@Module({
  controllers: [CoClientController],
  providers: [CoClientService],
  exports: [CoClientService],
})
export class CoClientModule {}
