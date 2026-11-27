import { io, type Socket } from 'socket.io-client';
import { getApiOrigin } from './apiBase';

/**
 * ONE websocket for the whole backoffice (notifications, live updates). Every component that needs it
 * calls `acquireAdminSocket()` / `releaseAdminSocket()`; the connection opens on the first user and
 * closes after the last one. WebSocket only — no HTTP long-polling fallback (that fallback is what
 * produced a constant stream of API calls when the proxy did not upgrade the connection).
 */
let socket: Socket | null = null;
let users = 0;

export function acquireAdminSocket(): Socket {
  if (!socket) {
    socket = io(`${getApiOrigin()}/notifications`, {
      // Read at every (re)connection so a new login is picked up.
      auth: (cb) => cb({ token: localStorage.getItem('token') ?? '' }),
      transports: ['websocket'],
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,
    });
  }
  users += 1;
  return socket;
}

export function releaseAdminSocket() {
  users = Math.max(0, users - 1);
  if (users === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
