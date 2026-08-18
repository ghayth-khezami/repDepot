import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { NewsletterContactsQueryDto } from "./dto/newsletter-contacts-query.dto";
import { SubscribeNewsletterDto } from "./dto/subscribe-newsletter.dto";
import { NewsletterService } from "./newsletter.service";

@ApiTags("newsletter")
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post("subscribe")
  @Throttle({ newsletter: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Subscribe to newsletter (public)" })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Get("contacts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Newsletter + client account emails (admin)" })
  findContacts(@Query() query: NewsletterContactsQueryDto) {
    return this.newsletterService.findContacts(query);
  }
}
