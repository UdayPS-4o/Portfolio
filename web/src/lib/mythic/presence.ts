/**
 * mythic/presence — singleton live-presence + chat client over the portfolio WS.
 *
 * One WebSocket per page no matter how many subscribers. The socket connects
 * lazily on the first subscriber (presence OR chat), is ref-counted, and closes
 * ~2s after the last unsubscribe. Reconnects with the same fixed 2.5s retry the
 * original LivePresence component used. All state is exposed through
 * referentially-stable snapshots safe for useSyncExternalStore (objects are
 * only replaced when a value actually changes). Every function is SSR-safe.
 *
 * FROZEN CONTRACT (other agents import against these exact signatures):
 *   getPresenceSnapshot(): PresenceSnapshot
 *   subscribePresence(cb): () => void
 *   usePresence(): PresenceSnapshot
 *   useChat(): { messages; send; name; setName }
 *
 * Consumers must degrade gracefully when connected === false.
 */

import { useSyncExternalStore } from "react";
import { resolveWsUrl } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PresenceLastEvent = {
  kind: "join" | "leave" | "message";
  name?: string;
  text?: string;
  at: number;
};

/** NON-CONTRACT extra: the visitor's own footprint, straight off the wire. */
export type SelfFootprint = {
  here: number;
  pc: number;
  mobile: number;
  total: number;
  linked: boolean;
};

export type PresenceSnapshot = {
  connected: boolean; // WS open
  nodes: number; // total live nodes (tabs) including you; >= 1 once connected
  pcs: number; // desktop nodes
  mobiles: number; // mobile nodes
  lastEvent: PresenceLastEvent | null;
  /** NON-CONTRACT optional extra (LivePresence chip): null until the server sends it. */
  you?: SelfFootprint | null;
};

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  self: boolean;
  admin?: boolean;
  at: number;
  /** NON-CONTRACT optional extra: originating device ("pc" | "mobile") when known. */
  device?: string;
};

/* server wire formats (unchanged protocol) */
type ServerYou = { here: number; pc: number; mobile: number; total: number; linked: boolean };
type ServerPresence = {
  type: "presence";
  users: number;
  tabs: number;
  mobile: number;
  pc: number;
  youTabs: number;
  you?: ServerYou;
};
type ServerChatMsg = {
  id: number;
  name: string;
  text: string;
  device: string;
  ts: number;
  self: string | boolean;
  isAdmin?: boolean;
};
type ServerMessage =
  | ServerPresence
  | { type: "history"; messages?: ServerChatMsg[] }
  | { type: "chat"; message: ServerChatMsg }
  | { type: "me"; name?: string };

type ChatState = { messages: ChatMessage[]; name: string | null };

/* ------------------------------------------------------------------ */
/* Device / identity helpers (moved verbatim from LivePresence)         */
/* ------------------------------------------------------------------ */

function getGPU(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "Unknown";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "Unknown";
  } catch {
    return "Unknown";
  }
}

function detect(ua: string) {
  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  return { os, browser };
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Uday Pratap Singh 😃", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Uday Pratap Singh 😃", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

/** Stable per-device fingerprint from durable signals (no per-session randomness). */
function computeFingerprint(): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return hash(
    [
      navigator.userAgent,
      navigator.platform,
      navigator.languages?.join(","),
      screen.width,
      screen.height,
      screen.colorDepth,
      getGPU(),
      navigator.hardwareConcurrency,
      nav.deviceMemory,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      getCanvasFingerprint(),
    ].join("|")
  );
}

/** Effective device kind with the original DevTools/GPU spoof corrections. */
function detectMobile(): boolean {
  let isActualMobile =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches || /Mobi|Android/i.test(navigator.userAgent);

  let gpuSpoofPc = false;
  let gpuSpoofMobile = false;
  try {
    const initial = localStorage.getItem("initialDevice");
    const currentType = isActualMobile ? "mobile" : "pc";
    if (!initial) {
      localStorage.setItem("initialDevice", currentType);
    } else if (initial === "pc" && currentType === "mobile") {
      gpuSpoofMobile = true;
    }

    const gpu = getGPU().toLowerCase();
    const isMobileGpu = /adreno|mali|powervr|apple a|tegra/.test(gpu);
    const isPcGpu = /nvidia|geforce|radeon|amd|intel|apple m|swiftshader|llvmpipe|mesa|microsoft/.test(gpu);

    const isDevToolsMobile =
      isActualMobile && (isPcGpu || (window.outerWidth > 0 && window.outerWidth > window.innerWidth + 150));
    if (isDevToolsMobile) gpuSpoofMobile = true;
    if (!isActualMobile && isMobileGpu) gpuSpoofPc = true;
  } catch {}

  if (gpuSpoofMobile) isActualMobile = false;
  if (gpuSpoofPc) isActualMobile = true;
  return isActualMobile;
}

/* ------------------------------------------------------------------ */
/* Singleton state                                                      */
/* ------------------------------------------------------------------ */

const SERVER_PRESENCE: PresenceSnapshot = Object.freeze({
  connected: false,
  nodes: 0,
  pcs: 0,
  mobiles: 0,
  lastEvent: null,
  you: null,
});
const SERVER_CHAT: ChatState = Object.freeze({ messages: [], name: null });

let snapshot: PresenceSnapshot = SERVER_PRESENCE;
let chatState: ChatState = SERVER_CHAT;

const presenceSubs = new Set<(s: PresenceSnapshot) => void>();
const chatSubs = new Set<() => void>();
const incomingChatSubs = new Set<(m: ChatMessage) => void>();

let refCount = 0;
let active = false; // a connection session is running
let ws: WebSocket | null = null;
let retryTimer: number | null = null;
let graceTimer: number | null = null;

let identityReady = false;
let vid = "";
let fp = "";
let mobileDevice = false;
let clientIp = "";
let ipResolved = false;

/* ------------------------------------------------------------------ */
/* Snapshot plumbing (referentially stable)                             */
/* ------------------------------------------------------------------ */

function sameYou(a: SelfFootprint | null, b: SelfFootprint | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.here === b.here && a.pc === b.pc && a.mobile === b.mobile && a.total === b.total && a.linked === b.linked;
}

/** Replace the snapshot only when a value actually changed, then notify. */
function setPresence(next: PresenceSnapshot): void {
  const cur = snapshot;
  if (
    cur.connected === next.connected &&
    cur.nodes === next.nodes &&
    cur.pcs === next.pcs &&
    cur.mobiles === next.mobiles &&
    cur.lastEvent === next.lastEvent &&
    sameYou(cur.you ?? null, next.you ?? null)
  ) {
    return;
  }
  snapshot = next;
  for (const cb of presenceSubs) cb(snapshot);
}

function setChatState(next: ChatState): void {
  chatState = next;
  for (const cb of chatSubs) cb();
}

/* ------------------------------------------------------------------ */
/* Identity bootstrap                                                   */
/* ------------------------------------------------------------------ */

function ensureIdentity(): void {
  if (identityReady || typeof window === "undefined") return;
  identityReady = true;

  mobileDevice = detectMobile();

  // stable visitor id
  try {
    vid = localStorage.getItem("visitorId") || "";
    if (!vid) {
      vid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16);
      localStorage.setItem("visitorId", vid);
    }
  } catch {
    vid = Math.random().toString(36).slice(2, 18);
  }

  // remembered display name (asked before first message)
  try {
    const saved = localStorage.getItem("visitorName") || "";
    if (saved && !chatState.name) setChatState({ ...chatState, name: saved });
  } catch {}

  // stable per-device fingerprint, persisted client-side and mirrored server-side
  try {
    fp = localStorage.getItem("fp") || "";
  } catch {}
  if (!fp) {
    fp = computeFingerprint();
    try {
      localStorage.setItem("fp", fp);
    } catch {}
  }
}

/** Fetch the public IP from ipinfo.io so the server can link devices on one network. */
async function fetchPublicIp(): Promise<void> {
  try {
    const res = await fetch("https://ipinfo.io/json", { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as { ip?: string };
    clientIp = data.ip || "";
  } catch {
    clientIp = "";
  }
  ipResolved = true;
}

function buildTelemetry() {
  const nav = navigator as Navigator & { deviceMemory?: number; userLanguage?: string };
  const ua = navigator.userAgent;
  const { os, browser } = detect(ua);
  const gpu = getGPU();
  return {
    url: window.location.href,
    referrer: document.referrer || "Direct",
    userAgent: ua,
    language: navigator.language || nav.userLanguage || "",
    languages: navigator.languages ? navigator.languages.join(",") : "",
    platform: navigator.platform,
    vendor: navigator.vendor,
    cookiesEnabled: navigator.cookieEnabled,
    hardwareConcurrency: navigator.hardwareConcurrency || "Unknown",
    deviceMemory: nav.deviceMemory || "Unknown",
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    colorDepth: window.screen.colorDepth,
    orientation: (window.screen.orientation && window.screen.orientation.type) || "Unknown",
    touchPoints: navigator.maxTouchPoints || 0,
    gpu,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    os,
    browser,
    fingerprint: fp,
    clientIp,
  };
}

/* ------------------------------------------------------------------ */
/* Protocol mapping                                                     */
/* ------------------------------------------------------------------ */

function toChatMessage(raw: ServerChatMsg): ChatMessage {
  const self = raw.self === true || raw.self === vid;
  return {
    id: String(raw.id),
    name: raw.name,
    text: raw.text,
    self,
    admin: raw.isAdmin ? true : undefined,
    at: raw.ts,
    device: raw.device,
  };
}

function displayName(m: ChatMessage): string {
  return m.admin ? "udayps" : m.self ? "you" : m.name;
}

function applyPresence(p: ServerPresence): void {
  const prevNodes = snapshot.nodes;
  let lastEvent = snapshot.lastEvent;
  if (prevNodes > 0 && p.users !== prevNodes) {
    lastEvent = { kind: p.users > prevNodes ? "join" : "leave", at: Date.now() };
  }
  setPresence({
    connected: snapshot.connected,
    nodes: p.users,
    pcs: p.pc,
    mobiles: p.mobile,
    lastEvent,
    you: p.you ? { ...p.you } : null,
  });
}

function handleIncomingChat(raw: ServerChatMsg): void {
  const msg = toChatMessage(raw);
  setChatState({ ...chatState, messages: [...chatState.messages.slice(-60), msg] });
  setPresence({
    ...snapshot,
    lastEvent: { kind: "message", name: displayName(msg), text: msg.text, at: msg.at },
  });
  for (const cb of incomingChatSubs) cb(msg);
}

function adoptName(n: string): void {
  // a device/network we recognise already has a name — adopt it if we have none
  if (chatState.name) return;
  try {
    localStorage.setItem("visitorName", n);
  } catch {}
  setChatState({ ...chatState, name: n });
}

/* ------------------------------------------------------------------ */
/* Connection lifecycle (one WS, ref-counted, 2.5s retry, 2s grace)     */
/* ------------------------------------------------------------------ */

function connect(): void {
  if (!active || typeof window === "undefined") return;
  // Resolved from NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL (see src/lib/api.ts).
  const base = resolveWsUrl();
  const sock = new WebSocket(
    `${base}?vid=${encodeURIComponent(vid)}&device=${mobileDevice ? "mobile" : "pc"}&fp=${encodeURIComponent(
      fp
    )}&cip=${encodeURIComponent(clientIp)}`
  );
  ws = sock;

  sock.onopen = () => {
    if (ws !== sock) return;
    setPresence({ ...snapshot, connected: true });
    sock.send(JSON.stringify({ type: "hello", payload: buildTelemetry() }));
    // tell the server our saved name so other devices on this network can reuse it
    let saved = "";
    try {
      saved = localStorage.getItem("visitorName") || "";
    } catch {}
    if (saved) sock.send(JSON.stringify({ type: "name", name: saved }));
  };

  sock.onmessage = (e) => {
    if (ws !== sock) return;
    let m: ServerMessage;
    try {
      m = JSON.parse(String(e.data)) as ServerMessage;
    } catch {
      return;
    }
    if (!m || typeof m !== "object") return;
    if (m.type === "presence") applyPresence(m);
    else if (m.type === "history") setChatState({ ...chatState, messages: (m.messages || []).map(toChatMessage) });
    else if (m.type === "chat") handleIncomingChat(m.message);
    else if (m.type === "me" && m.name) adoptName(m.name);
  };

  sock.onclose = () => {
    if (ws !== sock) return;
    setPresence({ ...snapshot, connected: false });
    if (active) retryTimer = window.setTimeout(connect, 2500);
  };

  sock.onerror = () => sock.close();
}

function start(): void {
  if (active || typeof window === "undefined") return;
  active = true;
  ensureIdentity();
  // Fetch public IP first, then connect (only refetched if it never resolved).
  if (ipResolved) connect();
  else
    void fetchPublicIp().finally(() => {
      if (active) connect();
    });
}

function stop(): void {
  active = false;
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  const sock = ws;
  ws = null;
  if (sock) {
    sock.onopen = null;
    sock.onmessage = null;
    sock.onclose = null;
    sock.onerror = null;
    try {
      sock.close();
    } catch {}
  }
  if (snapshot.connected) setPresence({ ...snapshot, connected: false });
}

function retain(): void {
  refCount++;
  if (graceTimer !== null) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  if (!active) start();
}

function release(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && active && graceTimer === null) {
    graceTimer = window.setTimeout(() => {
      graceTimer = null;
      if (refCount === 0) stop();
    }, 2000);
  }
}

/* ------------------------------------------------------------------ */
/* Public contract                                                      */
/* ------------------------------------------------------------------ */

/** Current presence snapshot. SSR-safe (constant default when no window). */
export function getPresenceSnapshot(): PresenceSnapshot {
  if (typeof window === "undefined") return SERVER_PRESENCE;
  return snapshot;
}

/**
 * Subscribe to presence changes. Ref-counted: the first subscriber (presence
 * OR chat) connects the singleton WS, the last unsubscribe closes it after
 * a ~2s grace period.
 */
export function subscribePresence(cb: (s: PresenceSnapshot) => void): () => void {
  if (typeof window === "undefined") return () => {};
  presenceSubs.add(cb);
  retain();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    presenceSubs.delete(cb);
    release();
  };
}

/** React hook over the presence store. SSR-safe. */
export function usePresence(): PresenceSnapshot {
  return useSyncExternalStore(subscribePresence, getPresenceSnapshot, getPresenceSnapshot);
}

function getChatState(): ChatState {
  if (typeof window === "undefined") return SERVER_CHAT;
  return chatState;
}

function subscribeChatStore(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  chatSubs.add(cb);
  retain();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    chatSubs.delete(cb);
    release();
  };
}

/** Send a chat message. No-op while disconnected, unnamed, or empty. */
function sendMessage(text: string): void {
  const t = text.trim();
  if (!t || !chatState.name || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "chat", text: t, name: chatState.name }));
}

/** Set + persist the visitor handle and share it with the server. */
function setChatName(n: string): void {
  const t = n.trim().slice(0, 24);
  if (!t) return;
  try {
    localStorage.setItem("visitorName", t);
  } catch {}
  if (chatState.name !== t) setChatState({ ...chatState, name: t });
  // share it so the server can auto-fill it on your other devices
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "name", name: t }));
}

/** Session chat: messages (newest last), send, and the visitor identity. */
export function useChat(): {
  messages: ChatMessage[];
  send: (text: string) => void;
  name: string | null;
  setName: (n: string) => void;
} {
  const s = useSyncExternalStore(subscribeChatStore, getChatState, getChatState);
  return { messages: s.messages, send: sendMessage, name: s.name, setName: setChatName };
}

/* ------------------------------------------------------------------ */
/* NON-CONTRACT extras (used by the LivePresence UI)                    */
/* ------------------------------------------------------------------ */

/**
 * Fires once per LIVE incoming chat message (never for history replays) —
 * powers the floating toast bars. Ref-counted like the other subscriptions.
 */
export function subscribeIncomingChat(cb: (m: ChatMessage) => void): () => void {
  if (typeof window === "undefined") return () => {};
  incomingChatSubs.add(cb);
  retain();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    incomingChatSubs.delete(cb);
    release();
  };
}

/** Effective device kind (spoof-corrected, same math the WS handshake uses). SSR: false. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  ensureIdentity();
  return mobileDevice;
}
