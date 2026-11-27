import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { onProductStatusChanged, ProductStatusChanged } from "../common/domain-events";

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;
const room = (contractId: string) => `contract:${contractId}`;

/**
 * Live updates for the public déposant page (/suivi/<token>).
 * The page connects with its tracking token; when one of the contract's articles changes stage the
 * server emits `suivi:update` so the page refetches and plays the "vendu / payé" animation at once
 * (no need to close and reopen the app). Only refs + stage are sent, nothing personal.
 */
@WebSocketGateway({
  namespace: "/suivi",
  cors: { origin: true, credentials: false },
  transports: ["websocket", "polling"],
})
export class SuiviGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SuiviGateway.name);
  private unsubscribe?: () => void;

  @WebSocketServer()
  server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.unsubscribe = onProductStatusChanged((e) => this.broadcast(e));
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = String(client.handshake.auth?.token ?? client.handshake.query?.token ?? "");
    if (!TOKEN_RE.test(token)) {
      client.disconnect(true);
      return;
    }
    try {
      const contract = await this.prisma.depositRequest.findUnique({ where: { trackingToken: token }, select: { id: true } });
      if (!contract) {
        client.disconnect(true);
        return;
      }
      await client.join(room(contract.id));
    } catch (e) {
      this.logger.warn(`Suivi socket refused: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  private async broadcast(e: ProductStatusChanged): Promise<void> {
    if (!this.server || !e.productIds.length) return;
    const products = await this.prisma.product.findMany({
      where: { id: { in: e.productIds }, depositRequestId: { not: null } },
      select: { ref: true, depositRequestId: true },
    });
    const byContract = new Map<string, string[]>();
    for (const p of products) {
      const list = byContract.get(p.depositRequestId!) ?? [];
      list.push(p.ref);
      byContract.set(p.depositRequestId!, list);
    }
    for (const [contractId, refs] of byContract) {
      this.server.to(room(contractId)).emit("suivi:update", { refs, stage: e.to, at: new Date().toISOString() });
    }
  }
}
