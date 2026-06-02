import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";
import { createLogger } from "../utils/logger";
import { migrate } from "./schema";

const log = createLogger("db");
let db: Database.Database | null = null;

/** Open (once) the SQLite database, ensuring its directory exists, and migrate. */
export function initDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  log.info(`SQLite ready at ${config.dbPath}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) return initDb();
  return db;
}
