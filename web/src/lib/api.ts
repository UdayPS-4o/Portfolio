/**
 * Single source of truth for reaching the backend API.
 *
 * In production the API lives on its own origin (e.g. https://api.udayps.com),
 * so the frontend must use an ABSOLUTE url — relative "/api" would hit the
 * Next.js server instead and return its 404 HTML page.
 *
 * Set ONE build-time env var and both HTTP + WebSocket are derived from it:
 *     NEXT_PUBLIC_API_URL = https://api.udayps.com
 * (Optionally override the socket explicitly with NEXT_PUBLIC_WS_URL.)
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so they must be passed as
 * Docker build args (see web/Dockerfile + docker-compose.yml).
 */
const isDev = process.env.NODE_ENV !== "production";

const explicitApi = process.env.NEXT_PUBLIC_API_URL || "";
const explicitWs = process.env.NEXT_PUBLIC_WS_URL || "";

/** Absolute API origin, e.g. "https://api.udayps.com". "" means same-origin. */
export const API_BASE = explicitApi || (isDev ? "http://localhost:4000" : "");

/** WebSocket URL, derived from the API origin unless overridden. */
export const WS_URL =
  explicitWs ||
  (API_BASE
    ? API_BASE.replace(/^http/, "ws") + "/ws" // http→ws, https→wss
    : isDev
    ? "ws://localhost:4000/ws"
    : "");

/** Resolve the WS url, falling back to same-origin at runtime if nothing is set. */
export function resolveWsUrl(): string {
  if (WS_URL) return WS_URL;
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}
