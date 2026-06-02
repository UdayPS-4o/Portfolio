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

  /** The recipient's own footprint: tabs here, plus their other devices on this network. */
  personalFor(recipient: Connection): PersonalPresence {
    let here = 0;
    let pc = 0;
    let mobile = 0;
    let total = 0;
    for (const c of this.connections) {
      if (!isSamePerson(c, recipient)) continue;
      total += 1;
      if (c.visitorId === recipient.visitorId) here += 1;
      if (c.device === "mobile") mobile += 1;
      else pc += 1;
    }
    return { here, pc, mobile, total, linked: total > here };
  }

  snapshot(): PresenceSnapshot {
    const clusters: Array<Set<Connection>> = [];
    let adminTabs = 0;

    for (const c of this.connections) {
      if (c.visitorId === "admin-udayps") {
        adminTabs += 1;
        continue;
      }

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
    const tabs = this.connections.size - adminTabs;

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
      result.push({ id: c.id, visitorId: c.visitorId, device: c.device, ip: c.ip, fingerprint: c.fingerprint });
    }
    return result;
  }
}

export const presenceService = new PresenceService();
