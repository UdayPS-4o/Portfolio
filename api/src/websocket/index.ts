import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "../config";
import { createLogger } from "../utils/logger";
import { handleConnection } from "./connectionHandler";

const log = createLogger("ws");

/** Attach the WebSocket server to the shared HTTP server at config.wsPath. */
export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleConnection);

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

  // keep-alive ping so proxies don't drop idle sockets
  const interval = setInterval(() => {
    for (const client of wss.clients) if (client.readyState === client.OPEN) client.ping();
  }, 30000);
  wss.on("close", () => clearInterval(interval));

  log.info(`WebSocket mounted at ${config.wsPath}`);
  return wss;
}
