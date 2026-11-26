import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SETTINGS_ID = "default";

/** Fallbacks match the storefront (web/src/lib/social.ts) until the admin fills them in. */
export const DEFAULT_SHOP_CONTACT = {
  phone: "55863578",
  whatsapp: "55863578",
  address: "Route Campus universitaire, Manouba",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=B%C3%A9b%C3%A9+D%C3%A9p%C3%B4t+Manouba",
};

export type SiteSettingsPatch = Partial<{
  youtubeUrl: string | null;
  shopPhone: string | null;
  shopWhatsapp: string | null;
  shopAddress: string | null;
  shopMapsUrl: string | null;
  contractTerms: string | null;
}>;

function formatPhone(digits: string): string {
  return digits.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3");
}

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

  /** Shop contact for contracts and the public suivi page (never déposant data). */
  async getShopContact() {
    const row = await this.ensureRow();
    const phone = (row.shopPhone || DEFAULT_SHOP_CONTACT.phone).replace(/\D/g, "").slice(-8);
    const whatsapp = (row.shopWhatsapp || row.shopPhone || DEFAULT_SHOP_CONTACT.whatsapp).replace(/\D/g, "").slice(-8);
    const address = row.shopAddress || DEFAULT_SHOP_CONTACT.address;
    return {
      phone,
      phoneDisplay: formatPhone(phone),
      phoneTel: `+216${phone}`,
      whatsapp: `216${whatsapp}`,
      address,
      mapsUrl: row.shopMapsUrl || DEFAULT_SHOP_CONTACT.mapsUrl,
    };
  }

  async updateYoutubeUrl(youtubeUrl: string | null) {
    return this.update({ youtubeUrl });
  }

  async update(patch: SiteSettingsPatch) {
    await this.ensureRow();
    return this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data: patch,
    });
  }
}
