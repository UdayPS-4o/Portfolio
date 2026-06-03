import { Router } from "express";
import { randomUUID, createHash } from "node:crypto";
import { getDb } from "../db";
import { config } from "../config";
import { presenceService } from "../services/presenceService";
import { chatService } from "../services/chatService";
import { identityRepository } from "../repositories/identityRepository";

const router = Router();

// Helper to hash password using SHA-256
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Middleware to check if request is authenticated as admin
export function sessionAdminAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || (req.query.token as string) || "";

  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const db = getDb();
  const session = db
    .prepare("SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?")
    .get(token, Date.now()) as { token: string; username: string; expires_at: number } | undefined;

  if (!session) {
    return res.status(401).json({ error: "unauthorized" });
  }

  req.adminUsername = session.username;
  next();
}

// Get auth setup & login status
router.get("/admin/auth-status", (req, res) => {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || (req.query.token as string) || "";

  let authenticated = false;
  if (token) {
    const db = getDb();
    const session = db
      .prepare("SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?")
      .get(token, Date.now());
    if (session) {
      authenticated = true;
    }
  }

  let setupRequired = false;
  // If env variables are set, setup is not required
  if (config.adminUser && config.adminPass) {
    setupRequired = false;
  } else {
    const db = getDb();
    const adminCount = (
      db.prepare("SELECT COUNT(*) AS count FROM admin_users").get() as {
        count: number;
      }
    ).count;
    setupRequired = adminCount === 0;
  }

  res.json({ setupRequired, authenticated });
});

// Admin login (or first-time setup registration)
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const db = getDb();

  // Check if first-time setup is required
  let isSetup = false;
  if (config.adminUser && config.adminPass) {
    isSetup = false;
  } else {
    const adminCount = (
      db.prepare("SELECT COUNT(*) AS count FROM admin_users").get() as {
        count: number;
      }
    ).count;
    isSetup = adminCount === 0;
  }

  if (isSetup) {
    // Register the first login details in SQLite
    const passHash = hashPassword(password);
    try {
      db.prepare("INSERT INTO admin_users (username, password) VALUES (?, ?)")
        .run(username, passHash);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to create admin: " + err.message });
    }
  } else {
    // Verify credentials
    let isValid = false;
    if (config.adminUser && config.adminPass) {
      isValid = username === config.adminUser && password === config.adminPass;
    } else {
      const adminUser = db
        .prepare("SELECT * FROM admin_users WHERE username = ?")
        .get(username) as { username: string; password: string } | undefined;
      
      if (adminUser) {
        isValid = adminUser.password === hashPassword(password);
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
  }

  // Generate session token (expires in 24 hours)
  const token = randomUUID();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  db.prepare("INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)")
    .run(token, username, expiresAt);

  res.json({ token, username });
});

// Admin logout
router.post("/admin/logout", (req, res) => {
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || (req.query.token as string) || "";

  if (token) {
    const db = getDb();
    db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
  }

  res.json({ success: true });
});

// Admin dashboard (data)
router.get("/admin/dashboard", sessionAdminAuth, (_req, res) => {
  const db = getDb();

  const visits = db
    .prepare(`
      SELECT 
        id, 
        visitor_id AS visitorId, 
        ip, 
        city, 
        country, 
        device, 
        os, 
        browser, 
        url, 
        referrer, 
        user_agent AS userAgent, 
        language, 
        languages, 
        platform, 
        vendor, 
        gpu, 
        screen_w AS screenW, 
        screen_h AS screenH, 
        color_depth AS colorDepth, 
        orientation, 
        timezone, 
        hardware_concurrency AS hardwareConcurrency, 
        device_memory AS deviceMemory, 
        touch_points AS touchPoints, 
        cookies_enabled AS cookiesEnabled, 
        fingerprint, 
        created_at AS createdAt 
      FROM visits 
      ORDER BY created_at DESC 
      LIMIT 100
    `)
    .all();

  const identities = db
    .prepare(`
      SELECT 
        id, 
        fingerprint, 
        ip, 
        visitor_id AS visitorId, 
        device, 
        name, 
        first_seen AS firstSeen, 
        last_seen AS lastSeen, 
        hits 
      FROM identities 
      ORDER BY last_seen DESC
    `)
    .all();

  const chatMessages = db
    .prepare(`
      SELECT 
        id, 
        visitor_id AS visitorId, 
        name, 
        text, 
        device, 
        city, 
        created_at AS ts,
        (visitor_id = 'admin-udayps') AS isAdmin
      FROM chat_messages 
      ORDER BY created_at DESC 
      LIMIT 200
    `)
    .all();

  const liveConnections = presenceService.getConnections();

  const stats = {
    totalVisits: (
      db.prepare("SELECT COUNT(*) AS count FROM visits").get() as {
        count: number;
      }
    ).count,
    // distinct PEOPLE (identity graph: merged across fingerprint + IP), not raw IPs —
    // so a phone hopping wifi↔5G counts once, not once per network.
    uniqueVisitors: identityRepository.uniquePersonCount(),
    liveConnections: liveConnections.length,
    totalMessages: (
      db.prepare("SELECT COUNT(*) AS count FROM chat_messages").get() as {
        count: number;
      }
    ).count,
    totalIdentities: (
      db.prepare("SELECT COUNT(*) AS count FROM identities").get() as {
        count: number;
      }
    ).count,
  };

  res.json({ visits, identities, chatMessages, liveConnections, stats });
});

// Clear in-memory chat cache (keeping it saved in db)
router.post("/admin/clear-chat", sessionAdminAuth, (_req, res) => {
  chatService.clearCache();
  // Broadcast empty messages history to all connected sockets to clear their UI
  presenceService.broadcastAll({ type: "history", messages: [] });
  res.json({ success: true });
});

export default router;
