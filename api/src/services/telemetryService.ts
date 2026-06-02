import { visitRepository } from "../repositories/visitRepository";
import { geoService } from "./geoService";
import { createLogger } from "../utils/logger";
import type { Device, TelemetryPayload, VisitRecord } from "../types";

const log = createLogger("telemetry");

/**
 * Persist a visit: resolve geo from IP, write the full telemetry row to SQLite,
 * and log a one-line summary for the site owner. Returns the resolved geo so the
 * caller (chat etc.) can reuse the city tag.
 */
export async function recordVisit(args: {
  visitorId: string;
  device: Device;
  ip: string;
  payload: TelemetryPayload;
}) {
  const { visitorId, device, ip, payload } = args;
  const geo = await geoService.lookup(ip);

  const record: VisitRecord = { ...payload, visitorId, device, ip, city: geo.city, country: geo.country };
  try {
    visitRepository.insert(record);
  } catch (err) {
    log.error("failed to persist visit", (err as Error).message);
  }

  log.info(
    `visit ip=${ip} geo=${geo.city || "?"}, ${geo.country || "?"} device=${device} ` +
      `os=${payload.os || "?"} browser=${payload.browser || "?"} vid=${visitorId}`,
    { url: payload.url, referrer: payload.referrer, fp: payload.fingerprint }
  );

  return geo;
}

export const telemetryService = { recordVisit };
