import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

/**
 * Guards admin endpoints. If ADMIN_TOKEN is set, requires a matching
 * `Authorization: Bearer <token>` header (or ?token= query). If unset,
 * access is allowed (convenient for local dev).
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (!config.adminToken) return next();
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || (req.query.token as string) || "";
  if (token && token === config.adminToken) return next();
  return res.status(401).json({ error: "unauthorized" });
}
