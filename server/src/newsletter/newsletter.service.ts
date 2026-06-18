import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NewsletterContactsQueryDto } from "./dto/newsletter-contacts-query.dto";

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async subscribe(email: string) {
    const normalized = email.trim().toLowerCase();
    try {
      await this.prisma.newsletterSubscriber.create({
        data: { email: normalized },
      });
    } catch {
      // Do not reveal whether the email already exists.
    }
    return { message: "Merci ! Votre inscription à la newsletter a bien été prise en compte." };
  }

  async findContacts(query: NewsletterContactsQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const q = search?.trim().toLowerCase();

    const [subscribers, clientUsers] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        select: { email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const map = new Map<
      string,
      { id: string; email: string; source: "newsletter" | "compte"; createdAt: Date }
    >();

    for (const s of subscribers) {
      map.set(s.email.toLowerCase(), {
        id: s.id,
        email: s.email,
        source: "newsletter",
        createdAt: s.createdAt,
      });
    }

    for (const u of clientUsers) {
      const key = u.email.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `user-${key}`,
          email: u.email,
          source: "compte",
          createdAt: u.createdAt,
        });
      }
    }

    let all = Array.from(map.values());
    if (q) {
      all = all.filter((row) => row.email.toLowerCase().includes(q));
    }
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = all.length;
    const skip = (page - 1) * actualLimit;
    const data = all.slice(skip, skip + actualLimit);

    return {
      data,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / actualLimit)),
      },
    };
  }
}
