import { getDb } from "../db";
import type { VisitRecord } from "../types";

export const visitRepository = {
  insert(v: VisitRecord): number {
    const stmt = getDb().prepare(`
      INSERT INTO visits (
        visitor_id, ip, city, country, device, os, browser, url, referrer, user_agent,
        language, languages, platform, vendor, gpu, screen_w, screen_h, color_depth,
        orientation, timezone, hardware_concurrency, device_memory, touch_points,
        cookies_enabled, fingerprint, created_at
      ) VALUES (
        @visitor_id, @ip, @city, @country, @device, @os, @browser, @url, @referrer, @user_agent,
        @language, @languages, @platform, @vendor, @gpu, @screen_w, @screen_h, @color_depth,
        @orientation, @timezone, @hardware_concurrency, @device_memory, @touch_points,
        @cookies_enabled, @fingerprint, @created_at
      )
    `);
    const info = stmt.run({
      visitor_id: v.visitorId,
      ip: v.ip,
      city: v.city,
      country: v.country,
      device: v.device,
      os: v.os ?? null,
      browser: v.browser ?? null,
      url: v.url ?? null,
      referrer: v.referrer ?? null,
      user_agent: v.userAgent ?? null,
      language: v.language ?? null,
      languages: v.languages ?? null,
      platform: v.platform ?? null,
      vendor: v.vendor ?? null,
      gpu: v.gpu ?? null,
      screen_w: v.screenWidth ?? null,
      screen_h: v.screenHeight ?? null,
      color_depth: v.colorDepth ?? null,
      orientation: v.orientation ?? null,
      timezone: v.timezone ?? null,
      hardware_concurrency: v.hardwareConcurrency != null ? String(v.hardwareConcurrency) : null,
      device_memory: v.deviceMemory != null ? String(v.deviceMemory) : null,
      touch_points: v.touchPoints ?? null,
      cookies_enabled: v.cookiesEnabled == null ? null : v.cookiesEnabled ? 1 : 0,
      fingerprint: v.fingerprint ?? null,
      created_at: Date.now(),
    });
    return Number(info.lastInsertRowid);
  },

  stats() {
    const db = getDb();
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM visits`).get() as { c: number }).c;
    const unique = (db.prepare(`SELECT COUNT(DISTINCT ip) AS c FROM visits`).get() as { c: number }).c;
    const byCountry = db
      .prepare(`SELECT COALESCE(NULLIF(country,''),'Unknown') AS country, COUNT(*) AS count FROM visits GROUP BY country ORDER BY count DESC LIMIT 20`)
      .all();
    const byDevice = db.prepare(`SELECT COALESCE(device,'unknown') AS device, COUNT(*) AS count FROM visits GROUP BY device`).all();
    const byBrowser = db
      .prepare(`SELECT COALESCE(NULLIF(browser,''),'Unknown') AS browser, COUNT(*) AS count FROM visits GROUP BY browser ORDER BY count DESC LIMIT 10`)
      .all();
    return { total, unique, byCountry, byDevice, byBrowser };
  },

  recent(limit = 50) {
    return getDb()
      .prepare(`SELECT * FROM visits ORDER BY created_at DESC LIMIT ?`)
      .all(limit);
  },
};
