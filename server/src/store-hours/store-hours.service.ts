import { Injectable } from "@nestjs/common";
import { Weekday } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StoreHourItemDto } from "./dto/update-store-hours.dto";

const WEEKDAY_ORDER: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

@Injectable()
export class StoreHoursService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.storeHour.findMany();
    const byDay = new Map(rows.map((r) => [r.weekday, r]));
    return WEEKDAY_ORDER.map((weekday) => {
      const row = byDay.get(weekday);
      return (
        row ?? {
          id: "",
          weekday,
          isClosed: weekday === Weekday.SUNDAY,
          openTime: weekday === Weekday.SUNDAY ? null : "09:00",
          closeTime: weekday === Weekday.SUNDAY ? null : "19:00",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    });
  }

  async upsertAll(hours: StoreHourItemDto[]) {
    await this.prisma.$transaction(
      hours.map((h) =>
        this.prisma.storeHour.upsert({
          where: { weekday: h.weekday },
          create: {
            weekday: h.weekday,
            isClosed: h.isClosed,
            openTime: h.isClosed ? null : h.openTime ?? null,
            closeTime: h.isClosed ? null : h.closeTime ?? null,
          },
          update: {
            isClosed: h.isClosed,
            openTime: h.isClosed ? null : h.openTime ?? null,
            closeTime: h.isClosed ? null : h.closeTime ?? null,
          },
        }),
      ),
    );
    return this.findAll();
  }
}
