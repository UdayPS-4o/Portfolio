import type Database from "better-sqlite3";

/** Idempotent schema creation. Runs on every boot. */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id          TEXT    NOT NULL,
      ip                  TEXT,
      city                TEXT,
      country             TEXT,
      device              TEXT,
      os                  TEXT,
      browser             TEXT,
      url                 TEXT,
      referrer            TEXT,
      user_agent          TEXT,
      language            TEXT,
      languages           TEXT,
      platform            TEXT,
      vendor              TEXT,
      gpu                 TEXT,
      screen_w            INTEGER,
      screen_h            INTEGER,
      color_depth         INTEGER,
      orientation         TEXT,
      timezone            TEXT,
      hardware_concurrency TEXT,
      device_memory       TEXT,
      touch_points        INTEGER,
      cookies_enabled     INTEGER,
      fingerprint         TEXT,
      created_at          INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id  TEXT NOT NULL,
      name        TEXT NOT NULL,
      text        TEXT NOT NULL,
      device      TEXT,
      city        TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);

    -- identity graph: links a browser fingerprint to an IP and a visitorId.
    -- a returning visitor on the same IP (even from another device) collapses
    -- onto the same network cluster, which powers cross-device "that's you" hints.
    CREATE TABLE IF NOT EXISTS identities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      ip          TEXT NOT NULL,
      visitor_id  TEXT NOT NULL,
      device      TEXT,
      name        TEXT,
      first_seen  INTEGER NOT NULL,
      last_seen   INTEGER NOT NULL,
      hits        INTEGER NOT NULL DEFAULT 1,
      UNIQUE(fingerprint, ip, visitor_id)
    );

    CREATE INDEX IF NOT EXISTS idx_identities_ip ON identities(ip);
    CREATE INDEX IF NOT EXISTS idx_identities_fp ON identities(fingerprint);

    CREATE TABLE IF NOT EXISTS admin_users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // additive migration for DBs created before the `name` column existed
  try {
    db.exec(`ALTER TABLE identities ADD COLUMN name TEXT`);
  } catch {
    /* column already present */
  }
}
