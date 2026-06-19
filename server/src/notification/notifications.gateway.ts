import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { UserRole } from "@prisma/client";
import { UserService } from "../user/user.service";
import { isCorsOriginAllowed } from "../config/security.config";

const ADMIN_ROOM = "admins";

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const raw =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");

      if (!raw) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(raw);
      const user = await this.userService.findOne(payload.sub);

      if (!user || user.role !== UserRole.ADMIN) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      await client.join(ADMIN_ROOM);
      this.logger.log(`Admin connected: ${user.email}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  emitNotification(payload: Record<string, unknown>) {
    this.server.to(ADMIN_ROOM).emit("notification", payload);
  }

  getConnectedAdminCount(): number {
    return this.server.sockets.adapter.rooms.get(ADMIN_ROOM)?.size ?? 0;
  }
}
