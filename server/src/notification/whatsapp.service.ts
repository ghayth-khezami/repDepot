import { Injectable, Logger } from "@nestjs/common";

/**
 * WhatsApp message to the shop owner's own number through CallMeBot (free; one-time activation:
 * send "I allow callmebot to send me messages" to +34 644 66 32 62 on WhatsApp, you receive an API key).
 *   CALLMEBOT_APIKEY=123456
 *   ADMIN_WHATSAPP=21655863578        (default: 216 + KHEZAMI_PHONE)
 * Not configured → skipped with a log line (nothing breaks).
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private target() {
    const explicit = process.env.ADMIN_WHATSAPP?.replace(/\D/g, "");
    if (explicit) return explicit;
    const local = process.env.KHEZAMI_PHONE?.replace(/\D/g, "");
    return local && local.length === 8 ? `216${local}` : null;
  }

  isConfigured() {
    return !!(process.env.CALLMEBOT_APIKEY?.trim() && this.target());
  }

  async sendToAdmin(text: string): Promise<boolean> {
    const key = process.env.CALLMEBOT_APIKEY?.trim();
    const phone = this.target();
    if (!key || !phone) {
      this.logger.warn("WhatsApp admin non configuré (CALLMEBOT_APIKEY / ADMIN_WHATSAPP) — message ignoré.");
      return false;
    }
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      this.logger.warn(`WhatsApp admin échoué : ${(e as Error).message}`);
      return false;
    }
  }
}
