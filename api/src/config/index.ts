import "dotenv/config";
import path from "node:path";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  host: process.env.HOST || "0.0.0.0",

  // SQLite file — mounted to a Docker volume in production (see docker-compose.yml)
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), "data", "portfolio.db"),

  // CORS origin for the REST API (the WebSocket is same-origin via the proxy)
  corsOrigin: process.env.CORS_ORIGIN || "*",

  // Optional bearer token to protect the /api/stats admin endpoint
  adminToken: process.env.ADMIN_TOKEN || "",

  // Admin panel user and password
  adminUser: process.env.ADMIN_USER || "",
  adminPass: process.env.ADMIN_PASS || "",

  // IP geolocation (ip-api.com, free tier). Set GEO_ENABLED=false to disable.
  geoEnabled: process.env.GEO_ENABLED !== "false",

  wsPath: process.env.WS_PATH || "/ws",
  chatHistoryLimit: parseInt(process.env.CHAT_HISTORY_LIMIT || "40", 10),
} as const;

export const isProd = config.nodeEnv === "production";
