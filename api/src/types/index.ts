export type Device = "pc" | "mobile";

/** Raw telemetry payload sent by the browser on connect. */
export interface TelemetryPayload {
  url?: string;
  referrer?: string;
  userAgent?: string;
  language?: string;
  languages?: string;
  platform?: string;
  vendor?: string;
  cookiesEnabled?: boolean;
  hardwareConcurrency?: number | string;
  deviceMemory?: number | string;
  screenWidth?: number;
  screenHeight?: number;
  colorDepth?: number;
  orientation?: string;
  touchPoints?: number;
  gpu?: string;
  timezone?: string;
  os?: string;
  browser?: string;
  fingerprint?: string;
}

/** A persisted visit row. */
export interface VisitRecord extends TelemetryPayload {
  visitorId: string;
  device: Device;
  ip: string;
  city: string;
  country: string;
}

export interface GeoResult {
  city: string;
  country: string;
}

export interface ChatMessage {
  id: number;
  visitorId: string;
  name: string;
  text: string;
  device: Device;
  city: string;
  ts: number;
}

export interface PresenceSnapshot {
  users: number;
  tabs: number;
  mobile: number;
  pc: number;
}

/**
 * The recipient's own live footprint, computed per-connection.
 * `here` = tabs in this exact browser; `pc`/`mobile` = your tabs across this
 * network split by device; `linked` = we recognised you on another device.
 */
export interface PersonalPresence {
  here: number;
  pc: number;
  mobile: number;
  total: number;
  linked: boolean;
}

/** Transport-agnostic connection handle (decouples services from `ws`). */
export interface Connection {
  id: string;
  visitorId: string;
  device: Device;
  ip: string;
  fingerprint: string;
  linkedVisitorIds?: Set<string>;
  isOpen: () => boolean;
  send: (data: string) => void;
}
