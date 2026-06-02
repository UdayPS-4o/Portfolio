import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { presenceService } from "../services/presenceService";
import { telemetryService } from "../services/telemetryService";
import { chatService } from "../services/chatService";
import { geoService } from "../services/geoService";
import { identityRepository } from "../repositories/identityRepository";
import { getClientIp } from "../utils/ip";
import { createLogger } from "../utils/logger";
import { getDb } from "../db";
import type { Connection, Device } from "../types";

const log = createLogger("ws");

export function handleConnection(ws: WebSocket, req: IncomingMessage) {
  const url = new URL(req.url || "/", "http://localhost");
  const rawVisitorId = url.searchParams.get("vid") || `anon-${randomUUID().slice(0, 8)}`;
  const device: Device = url.searchParams.get("device") === "mobile" ? "mobile" : "pc";
  const fingerprint = url.searchParams.get("fp") || "";
  const serverIp = getClientIp(req);
  const clientIp = url.searchParams.get("cip") || "";
  const ip = clientIp || serverIp;

  const token = url.searchParams.get("token") || "";
  let isValidAdmin = false;
  if (rawVisitorId === "admin-udayps" && token) {
    const db = getDb();
    const session = db
      .prepare("SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?")
      .get(token, Date.now());
    if (session) {
      isValidAdmin = true;
    }
  }

  const visitorId = (rawVisitorId === "admin-udayps" && !isValidAdmin)
    ? `anon-${randomUUID().slice(0, 8)}`
    : rawVisitorId;

  // mutable per-connection state
  const ctx = { city: "" };

  const conn: Connection = {
    id: randomUUID(),
    visitorId,
    device,
    ip,
    fingerprint,
    isOpen: () => ws.readyState === ws.OPEN,
    send: (data) => {
      try {
        ws.send(data);
      } catch {
        /* socket closing */
      }
    },
  };

  presenceService.add(conn);

  // persist the fingerprint ↔ ip ↔ visitor link (the cross-device identity graph)
  if (fingerprint && ip && visitorId !== "admin-udayps") {
    try {
      identityRepository.upsert({ fingerprint, ip, visitorId, device });
    } catch (err) {
      log.warn("identity upsert failed", (err as Error).message);
    }
  }

  // store a name against this connection's identity (used for cross-device auto-fill)
  const rememberName = (raw: string) => {
    if (!fingerprint || !ip || visitorId === "admin-udayps") return;
    const clean = raw.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 24);
    if (!clean) return;
    try {
      identityRepository.setName({ fingerprint, ip, visitorId, name: clean });
    } catch (err) {
      log.warn("identity setName failed", (err as Error).message);
    }
  };

  // if this person (same browser / device / network) named themselves before, hand it back
  if (ip && visitorId !== "admin-udayps") {
    try {
      const known = identityRepository.findName({ visitorId, fingerprint, ip });
      if (known) conn.send(JSON.stringify({ type: "me", name: known }));
    } catch (err) {
      log.warn("identity findName failed", (err as Error).message);
    }
  }

  // history with a per-recipient `self` flag; never expose other visitors' ids
  const history = chatService.history().map((m) => ({
    id: m.id,
    name: m.name,
    text: m.text,
    device: m.device,
    city: m.city,
    ts: m.ts,
    self: m.visitorId === visitorId,
    isAdmin: m.visitorId === "admin-udayps",
  }));
  conn.send(JSON.stringify({ type: "history", messages: history }));

  // resolve city early so chat messages carry a location tag
  geoService.lookup(ip).then((geo) => {
    ctx.city = geo.city;
  });

  ws.on("message", async (raw) => {
    let msg: { type?: string; text?: string; name?: string; payload?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "hello") {
      if (visitorId !== "admin-udayps") {
        const geo = await telemetryService.recordVisit({ visitorId, device, ip, payload: msg.payload || {} });
        ctx.city = geo.city || ctx.city;
      }
      return;
    }

    if (msg.type === "name") {
      rememberName(String(msg.name || ""));
      return;
    }

    if (msg.type === "chat") {
      if (msg.name) rememberName(String(msg.name));
      const m = chatService.add({
        visitorId,
        device,
        city: ctx.city,
        text: String(msg.text || ""),
        name: msg.name ? String(msg.name) : undefined,
      });
      if (m) {
        // `self` carries the sender's id; only their own client will match it
        presenceService.broadcastAll({
          type: "chat",
          message: { id: m.id, name: m.name, text: m.text, device: m.device, city: m.city, ts: m.ts, self: visitorId, isAdmin: visitorId === "admin-udayps" },
        });
      }
    }
  });

  const cleanup = () => presenceService.remove(conn);
  ws.on("close", cleanup);
  ws.on("error", (err) => {
    log.warn("socket error", (err as Error).message);
    cleanup();
  });
}
