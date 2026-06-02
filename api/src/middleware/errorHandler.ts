import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";

const log = createLogger("http");

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  log.error("unhandled error", err.message);
  res.status(500).json({ error: "internal server error" });
}
