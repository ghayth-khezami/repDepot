import { Module } from "@nestjs/common";
import { StoreHoursController } from "./store-hours.controller";
import { StoreHoursService } from "./store-hours.service";

@Module({
  controllers: [StoreHoursController],
  providers: [StoreHoursService],
})
export class StoreHoursModule {}
