import { getDb } from "../db";
import type { Device } from "../types";

/**
 * Persists the fingerprint ↔ IP ↔ visitorId graph. One row per unique triple;
 * repeat visits bump `last_seen` and `hits`. Used to recognise returning users
 * and to link a person's devices that share a network.
 */
export const identityRepository = {
  upsert(args: { fingerprint: string; ip: string; visitorId: string; device: Device }): void {
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO identities (fingerprint, ip, visitor_id, device, first_seen, last_seen, hits)
         VALUES (@fingerprint, @ip, @visitorId, @device, @now, @now, 1)
         ON CONFLICT(fingerprint, ip, visitor_id)
         DO UPDATE SET last_seen = @now, hits = hits + 1, device = @device`
      )
      .run({ ...args, now });
  },

  /** Distinct (fingerprint, device) pairs ever seen on this IP — a person's known devices on a network. */
  devicesOnIp(ip: string): Array<{ fingerprint: string; device: string; visitorId: string; lastSeen: number }> {
    return getDb()
      .prepare(
        `SELECT fingerprint, device, visitor_id AS visitorId, last_seen AS lastSeen
         FROM identities WHERE ip = ? ORDER BY last_seen DESC`
      )
      .all(ip) as Array<{ fingerprint: string; device: string; visitorId: string; lastSeen: number }>;
  },

  /** Record the display name a visitor chose, against their identity row. */
  setName(args: { fingerprint: string; ip: string; visitorId: string; name: string }): void {
    getDb()
      .prepare(
        `UPDATE identities SET name = @name
         WHERE fingerprint = @fingerprint AND ip = @ip AND visitor_id = @visitorId`
      )
      .run(args);
  },

  /**
   * Find all visitor_ids that are linked to this fingerprint.
   * A link is defined as: sharing an IP address that this fingerprint has also used.
   */
  getLinkedVisitorIds(fingerprint: string): string[] {
    const rows = getDb()
      .prepare(`
        SELECT DISTINCT visitor_id
        FROM identities
        WHERE ip IN (
          SELECT ip FROM identities WHERE fingerprint = ?
        )
      `)
      .all(fingerprint) as Array<{ visitor_id: string }>;
    return rows.map(r => r.visitor_id);
  },

  /**
   * Find all visitor_ids that have ever connected from this IP address.
   * This links different browsers on the same network as the same person.
   */
  getLinkedVisitorIdsByIp(ip: string): string[] {
    const rows = getDb()
      .prepare(`SELECT DISTINCT visitor_id FROM identities WHERE ip = ?`)
      .all(ip) as Array<{ visitor_id: string }>;
    return rows.map(r => r.visitor_id);
  },

  /**
   * Best known name for a person, matching on (in priority order) the same
   * browser, the same device fingerprint, then the same network/IP. Lets a
   * returning or cross-device visitor reuse a name they typed elsewhere.
   */
  findName(args: { visitorId: string; fingerprint: string; ip: string }): string {
    const row = getDb()
      .prepare(
        `SELECT name FROM identities
         WHERE name IS NOT NULL AND name != ''
           AND (visitor_id = @visitorId OR fingerprint = @fingerprint OR ip = @ip)
         ORDER BY
           CASE WHEN visitor_id = @visitorId THEN 0
                WHEN fingerprint = @fingerprint THEN 1
                ELSE 2 END,
           last_seen DESC
         LIMIT 1`
      )
      .get(args) as { name?: string } | undefined;
    return row?.name || "";
  },
};
