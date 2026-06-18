import { Module } from "@nestjs/common";
import { DepositRequestController } from "./deposit-request.controller";
import { DepositRequestService } from "./deposit-request.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DepositRequestController],
  providers: [DepositRequestService],
})
export class DepositRequestModule {}
