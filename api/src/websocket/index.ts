import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "../config";
import { createLogger } from "../utils/logger";
import { handleConnection } from "./connectionHandler";

const log = createLogger("ws");

/** Attach the WebSocket server to the shared HTTP server at config.wsPath. */
export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Heartbeat liveness. readyState alone is NOT enough: when a phone drops wifi the
  // socket stays "OPEN" until the OS TCP timeout (minutes), so it lingers as a phantom
  // live device while the 5G reconnect opens a second one. We ping every round and
  // terminate any socket that didn't answer the previous ping — pruning the dead one
  // within ~one interval so live counts stay honest across network switches.
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on("connection", (ws: WebSocket, req) => {
    alive.set(ws, true);
    ws.on("pong", () => alive.set(ws, true));
    handleConnection(ws, req);
  });

  server.on("upgrade", (req, socket, head) => {
    let pathname = "/";
    try {
      pathname = new URL(req.url || "/", "http://localhost").pathname;
    } catch {
      /* noop */
    }
    if (pathname === config.wsPath) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
      socket.destroy();
    }
  });

  // Ping + reap dead sockets. terminate() fires 'close' → presenceService.remove →
  // a fresh presence broadcast, so phantom devices vanish on their own.
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      try {
        ws.ping();
      } catch {
        /* will be terminated next round */
      }
    }
  }, 12000);
  wss.on("close", () => clearInterval(interval));

  log.info(`WebSocket mounted at ${config.wsPath} (heartbeat 12s)`);
  return wss;
}
