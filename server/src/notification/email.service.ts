import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendOrderNotification(input: {
    clientName: string;
    productName: string;
    price: number;
    address: string;
    orderId: string;
    productImage?: string | null;
    reminder?: boolean;
    createdAt: Date;
  }) {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "admin.bebedepot@gmail.com";
    if (!host || !user || !pass) {
      this.logger.warn("SMTP settings missing — order email skipped.");
      return;
    }
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    const title = input.reminder
      ? `Eya ! Commande non vue depuis 3 heures (${input.createdAt.toLocaleString("fr-FR")})`
      : `Nouvelle commande de ${input.clientName}`;
    const image = input.productImage ? `<img src="${input.productImage}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px" />` : "";
    await transport.sendMail({
      from: process.env.SMTP_FROM?.trim() || user,
      to: recipient,
      subject: title,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#2d2346"><div style="background:#fff0f4;padding:24px;border-radius:20px"><h2>${title}</h2><p>Le client <strong>${input.clientName}</strong> a passé une commande.</p><div style="display:flex;gap:16px;align-items:center">${image}<div><p><strong>${input.productName}</strong></p><p>Valeur : <strong>${input.price.toFixed(3)} TND</strong></p><p>Adresse : ${input.address}</p></div></div><p style="margin-top:24px"><a href="${process.env.ADMIN_APP_URL || "https://bebedepot.tn"}/commands/${input.orderId}" style="background:#e04672;color:white;padding:12px 18px;border-radius:999px;text-decoration:none">Voir la commande</a></p></div></div>`,
    });
  }
}