import http from "node:http";
import { config } from "./config";
import { createApp } from "./app";
import { initDb } from "./db";
import { chatService } from "./services/chatService";
import { attachWebSocket } from "./websocket";
import { logger } from "./utils/logger";

function bootstrap() {
  initDb();
  chatService.init();

  const app = createApp();
  const server = http.createServer(app);
  attachWebSocket(server);

  server.listen(config.port, config.host, () => {
    logger.info(`API listening on http://${config.host}:${config.port} (env=${config.nodeEnv})`);
    logger.info(`REST at /api/health, /api/stats  ·  WebSocket at ${config.wsPath}`);
  });

  const shutdown = (sig: string) => {
    logger.info(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap();
