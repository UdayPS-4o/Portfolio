import { config } from "../config";
import { isPrivateIp } from "../utils/ip";
import { createLogger } from "../utils/logger";
import type { GeoResult } from "../types";

const log = createLogger("geo");
const cache = new Map<string, GeoResult>();

/** Resolve an IP to { city, country } via ip-api.com (cached, best-effort). */
export async function lookup(ip: string): Promise<GeoResult> {
  if (!config.geoEnabled) return { city: "", country: "" };
  if (isPrivateIp(ip)) return { city: "Local", country: "" };
  const cached = cache.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`);
    const json = (await res.json()) as { status: string; city?: string; regionName?: string; country?: string };
    const geo: GeoResult =
      json.status === "success"
        ? { city: json.city || json.regionName || "", country: json.country || "" }
        : { city: "", country: "" };
    cache.set(ip, geo);
    return geo;
  } catch (err) {
    log.warn(`lookup failed for ${ip}`, (err as Error).message);
    return { city: "", country: "" };
  }
}

export const geoService = { lookup };
