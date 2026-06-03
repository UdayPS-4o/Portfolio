import type { Connection, PersonalPresence, PresenceSnapshot } from "../types";
import { identityRepository } from "../repositories/identityRepository";

/**
 * Is connection `c` part of the same person as the recipient `r`?
 *  - same browser (visitorId) → definitely the same person (just more tabs)
 *  - linked in the identity graph (they share a historical IP or fingerprint)
 *  - same network (ip) → on a personal portfolio, same public IP = same person
 */
function isSamePerson(c: Connection, r: Connection): boolean {
  if (c.visitorId === "admin-udayps" || r.visitorId === "admin-udayps") return false;
  if (c.visitorId === r.visitorId) return true;
  if (c.linkedVisitorIds?.has(r.visitorId) || r.linkedVisitorIds?.has(c.visitorId)) return true;
  if (r.ip && c.ip && c.ip === r.ip) return true;
  return false;
}

/**
 * In-memory live-presence tracker. Holds active connections, groups them by
 * visitorId (so multiple tabs = one user), and broadcasts tailored presence.
 */
class PresenceService {
  private connections = new Set<Connection>();

  add(conn: Connection) {
    const linkedSet = new Set<string>();
    // Link by fingerprint (same device across IPs)
    if (conn.fingerprint) {
      try {
        for (const id of identityRepository.getLinkedVisitorIds(conn.fingerprint)) linkedSet.add(id);
      } catch {}
    }
    // Link by IP (different browsers on the same network)
    if (conn.ip) {
      try {
        for (const id of identityRepository.getLinkedVisitorIdsByIp(conn.ip)) linkedSet.add(id);
      } catch {}
    }
    conn.linkedVisitorIds = linkedSet;
    this.connections.add(conn);
    this.broadcast();
  }

  remove(conn: Connection) {
    this.connections.delete(conn);
    this.broadcast();
  }

  /** Number of live tabs for a given visitor. */
  tabsFor(visitorId: string): number {
    let n = 0;
    for (const c of this.connections) if (c.visitorId === visitorId) n += 1;
    return n;
  }

  /**
   * The recipient's own footprint. Counts DISTINCT devices (by visitorId), not raw
   * connections — so multiple tabs, or a stale socket plus its reconnect after a
   * network switch (same visitorId), collapse to a single device instead of showing
   * phantom "2 mob / 3 mob". `here` stays a tab count for the recipient's own browser.
   */
  personalFor(recipient: Connection): PersonalPresence {
    let here = 0;
    const pcIds = new Set<string>();
    const mobileIds = new Set<string>();
    for (const c of this.connections) {
      if (!c.isOpen()) continue;
      if (!isSamePerson(c, recipient)) continue;
      if (c.visitorId === recipient.visitorId) here += 1;
      if (c.device === "mobile") mobileIds.add(c.visitorId);
      else pcIds.add(c.visitorId);
    }
    const pc = pcIds.size;
    const mobile = mobileIds.size;
    const total = pc + mobile; // distinct devices
    return { here, pc, mobile, total, linked: total > 1 };
  }

  snapshot(): PresenceSnapshot {
    const clusters: Array<Set<Connection>> = [];
    let nonAdminTabs = 0;

    for (const c of this.connections) {
      if (!c.isOpen()) continue; // skip sockets already closing/dead
      if (c.visitorId === "admin-udayps") {
        continue;
      }
      nonAdminTabs += 1;

      // Find an existing cluster where c is the same person as at least one connection
      let foundCluster: Set<Connection> | null = null;
      for (const cluster of clusters) {
        let matches = false;
        for (const existing of cluster) {
          if (isSamePerson(c, existing)) {
            matches = true;
            break;
          }
        }
        if (matches) {
          foundCluster = cluster;
          break;
        }
      }

      if (foundCluster) {
        foundCluster.add(c);
      } else {
        const newCluster = new Set<Connection>();
        newCluster.add(c);
        clusters.push(newCluster);
      }
    }

    let mobile = 0;
    for (const cluster of clusters) {
      let isClusterMobile = false;
      for (const c of cluster) {
        if (c.device === "mobile") {
          isClusterMobile = true;
          break;
        }
      }
      if (isClusterMobile) mobile += 1;
    }

    const users = clusters.length;
    const tabs = nonAdminTabs;

    return {
      users,
      tabs,
      mobile,
      pc: users - mobile,
    };
  }

  /** Send every client a presence frame carrying their own cross-device footprint. */
  broadcast() {
    const snap = this.snapshot();
    for (const c of this.connections) {
      if (!c.isOpen()) continue;
      const you = this.personalFor(c);
      c.send(JSON.stringify({ type: "presence", ...snap, youTabs: you.here, you }));
    }
  }

  /** Send an arbitrary message to all live connections. */
  broadcastAll(obj: unknown) {
    const data = JSON.stringify(obj);
    for (const c of this.connections) if (c.isOpen()) c.send(data);
  }

  /** Return serializable data for every live connection (used by admin dashboard). */
  getConnections(): Array<{id: string; visitorId: string; device: string; ip: string; fingerprint: string}> {
    const result: Array<{id: string; visitorId: string; device: string; ip: string; fingerprint: string}> = [];
    for (const c of this.connections) {
      if (!c.isOpen()) continue; // don't report dead sockets to the admin live view
      result.push({ id: c.id, visitorId: c.visitorId, device: c.device, ip: c.ip, fingerprint: c.fingerprint });
    }
    return result;
  }
}

export const presenceService = new PresenceService();
