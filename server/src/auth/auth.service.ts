import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { getGoogleClientId } from "../config/security.config";

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client();

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user.isVerified) {
      throw new UnauthorizedException("Compte non vérifié");
    }
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async requestRegisterCode(email: string, password: string, username?: string, phoneNumber?: string) {
    const existing = await this.userService.findByEmail(email);
    if (existing) {
      return { message: "Si cet email est éligible, un code de vérification a été envoyé." };
    }
    if (phoneNumber && (await this.prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } }))) {
      throw new ConflictException("Ce numéro de téléphone est déjà associé à un compte.");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.pendingUser.upsert({
      where: { email },
      update: { codeHash, passwordHash, username: username || null, phoneNumber: phoneNumber || null, expiresAt },
      create: { email, codeHash, passwordHash, username: username || null, phoneNumber: phoneNumber || null, expiresAt },
    });

    // En prod: brancher un SMTP ici. En dev: on log le code.
    // IMPORTANT: ne jamais log en prod.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Code de vérification (${email}): ${code}`);
    }

    return { message: "Si cet email est éligible, un code de vérification a été envoyé." };
  }

  async verifyRegisterCode(email: string, code: string) {
    const pending = await this.prisma.pendingUser.findUnique({ where: { email } });
    if (!pending) throw new BadRequestException("Aucune inscription en attente pour cet email.");
    if (pending.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Code expiré. Veuillez recommencer l'inscription.");
    }

    const ok = await bcrypt.compare(code, pending.codeHash);
    if (!ok) throw new BadRequestException("Code invalide.");

    const created = await this.prisma.user.create({
      data: {
        email: pending.email,
        password: pending.passwordHash,
        username: pending.username,
        phoneNumber: pending.phoneNumber,
        isVerified: true,
      },
    });

    await this.prisma.pendingUser.delete({ where: { email } }).catch(() => {});

    const payload = { email: created.email, sub: created.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: created.id,
        email: created.email,
        username: created.username,
        role: created.role,
        phoneNumber: created.phoneNumber,
      },
    };
  }

  async googleSignIn(idToken: string, intent: "CLIENT" | "DEPOSER" = "CLIENT") {
    const audience = getGoogleClientId();
    if (!audience) {
      throw new UnauthorizedException("Google sign-in is not configured.");
    }
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    const rawEmail = payload?.email;
    if (!rawEmail || payload?.email_verified !== true) {
      throw new UnauthorizedException("Google account email is invalid or not verified.");
    }
    const safeEmail = rawEmail.trim().toLowerCase();
    const username = payload?.name || safeEmail.split("@")[0];
    const existing = await this.userService.findByEmail(safeEmail);

    if (existing) {
      const jwtPayload = { email: existing.email, sub: existing.id };
      return {
        access_token: this.jwtService.sign(jwtPayload),
        user: {
          id: existing.id,
          email: existing.email,
          username: existing.username,
          role: existing.role,
          phoneNumber: existing.phoneNumber,
        },
      };
    }

    const randomPassword = `google-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const signupRole = intent === "DEPOSER" ? UserRole.DEPOSER : UserRole.CLIENT;
    const created = await this.prisma.user.create({
      data: {
        email: safeEmail,
        username,
        password: passwordHash,
        isVerified: true,
        role: signupRole,
      },
    });
    const jwtPayload = { email: created.email, sub: created.id };
    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: {
        id: created.id,
        email: created.email,
        username: created.username,
        role: created.role,
        phoneNumber: created.phoneNumber,
      },
    };
  }

  /** Google accounts have no phone: the customer adds it to see the orders placed with it. */
  async setPhone(userId: string, phoneNumber: string) {
    const other = await this.prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } });
    if (other && other.id !== userId) throw new ConflictException("Ce numéro de téléphone est déjà associé à un autre compte.");
    const u = await this.prisma.user.update({ where: { id: userId }, data: { phoneNumber } });
    return { id: u.id, email: u.email, username: u.username, role: u.role, phoneNumber: u.phoneNumber };
  }

  /**
   * "Mes commandes": every order whose client has this account's phone or email — including orders
   * placed as a guest before the account existed (guest clients are stored with that phone).
   */
  async myCommands(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, phoneNumber: true } });
    if (!user) throw new UnauthorizedException();
    const or: Array<Record<string, unknown>> = [{ email: user.email.toLowerCase() }];
    if (user.phoneNumber) or.push({ phoneNumber: user.phoneNumber }, { email: `guest.${user.phoneNumber}@bebedepot.local` });
    const commands = await this.prisma.command.findMany({
      where: { commandDetails: { some: { client: { OR: or } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        PrixVente: true,
        adresseLivraison: true,
        dateLivraison: true,
        createdAt: true,
        acceptedAt: true,
        deliveredAt: true,
        commandDetails: {
          select: {
            product: { select: { id: true, productName: true, ref: true, PrixVente: true, photos: { take: 1, orderBy: { createdAt: "asc" }, select: { photoDoc: true } } } },
          },
        },
      },
    });
    return commands.map(({ commandDetails, status, ...c }) => ({
      ...c,
      status: status === "GOT_PROFIT" ? "DELIVERED" : status,
      products: commandDetails.map((d) => ({
        id: d.product.id,
        name: d.product.productName,
        ref: d.product.ref,
        price: d.product.PrixVente,
        photo: d.product.photos[0]?.photoDoc ?? null,
      })),
    }));
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
