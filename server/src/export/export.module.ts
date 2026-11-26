import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StatsModule } from "../stats/stats.module";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";

@Module({
  imports: [PrismaModule, StatsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
