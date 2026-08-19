import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SETTINGS_ID = "default";

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  private async ensureRow() {
    return this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  async getPublic() {
    const row = await this.ensureRow();
    return { youtubeUrl: row.youtubeUrl };
  }

  async getAdmin() {
    return this.ensureRow();
  }

  async updateYoutubeUrl(youtubeUrl: string | null) {
    await this.ensureRow();
    return this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data: { youtubeUrl },
    });
  }
}
