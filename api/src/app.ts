import express from "express";
import cors from "cors";
import { config } from "./config";
import routes from "./routes";
import { notFound, errorHandler } from "./middleware/errorHandler";

/** Build the Express application (REST API under /api). */
export function createApp() {
  const app = express();

  app.set("trust proxy", true); // behind Traefik / Nginx
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "64kb" }));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
