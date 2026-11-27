import { Logger } from "@nestjs/common";
import { ConnectedSocket, OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { isCorsOriginAllowed } from "../config/security.config";

const room = (userId: string) => `user:${userId}`;

/**
 * Live channel for logged-in website customers ("Mes commandes"). The shop changes an order's status
 * → `order:update` is pushed to the customer's open pages (no polling).
 */
@WebSocketGateway({
  namespace: "/me",
  cors: {
    origin: (origin, callback) => callback(null, isCorsOriginAllowed(origin)),
    credentials: true,
  },
  transports: ["websocket"],
})
export class CustomerGateway implements OnGatewayConnection {
  private readonly logger = new Logger(CustomerGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const raw = String(client.handshake.auth?.token ?? "");
      const payload = this.jwt.verify<{ sub: string }>(raw);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
      if (!user) throw new Error("unknown user");
      await client.join(room(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  /** Tells the customer(s) of this order (matched by email / phone, guest orders included). */
  async orderChanged(commandId: string) {
    if (!this.server) return;
    try {
      const details = await this.prisma.commandDetail.findMany({
        where: { commandId },
        select: { client: { select: { email: true, phoneNumber: true } }, command: { select: { status: true } } },
      });
      const status = details[0]?.command.status;
      const or: Array<Record<string, string>> = [];
      for (const d of details) {
        if (!d.client) continue;
        or.push({ email: d.client.email.toLowerCase() });
        const guestPhone = d.client.email.match(/^guest\.(\d{8})@bebedepot\.local$/)?.[1];
        const phone = /^\d{8}$/.test(d.client.phoneNumber) && d.client.phoneNumber !== "00000000" ? d.client.phoneNumber : guestPhone;
        if (phone) or.push({ phoneNumber: phone });
      }
      if (!or.length) return;
      const users = await this.prisma.user.findMany({ where: { OR: or }, select: { id: true } });
      for (const u of users) this.server.to(room(u.id)).emit("order:update", { id: commandId, status });
    } catch (e) {
      this.logger.warn(`order:update not sent: ${(e as Error).message}`);
    }
  }
}
