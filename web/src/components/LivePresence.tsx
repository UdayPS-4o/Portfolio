"use client";

import { useEffect, useRef, useState } from "react";

type You = { here: number; pc: number; mobile: number; total: number; linked: boolean };
type Presence = { users: number; tabs: number; mobile: number; pc: number; youTabs: number; you?: You };
type ChatMsg = { id: number; name: string; text: string; device: string; ts: number; self: string | boolean; isAdmin?: boolean };
type Toast = { id: number; name: string; text: string; self: boolean; isAdmin?: boolean };

/* ---------- small client helpers ---------- */
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

export default function LivePresence() {
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isSpoofing, setIsSpoofing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const vidRef = useRef<string>("");
  const fpRef = useRef<string>("");
  const openRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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
      
      const isDevToolsMobile = isActualMobile && (isPcGpu || (window.outerWidth > 0 && window.outerWidth > window.innerWidth + 150));
      if (isDevToolsMobile) gpuSpoofMobile = true;
      if (!isActualMobile && isMobileGpu) gpuSpoofPc = true;
      
      if (gpuSpoofPc || gpuSpoofMobile) {
        setIsSpoofing(true);
      }
    } catch {}

    if (gpuSpoofMobile) isActualMobile = false;
    if (gpuSpoofPc) isActualMobile = true;
    
    setIsMobile(isActualMobile);

    // stable visitor id
    let vid = "";
    try {
      vid = localStorage.getItem("visitorId") || "";
      if (!vid) {
        vid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 16);
        localStorage.setItem("visitorId", vid);
      }
    } catch {
      vid = Math.random().toString(36).slice(2, 18);
    }
    vidRef.current = vid;

    // remembered display name (asked before first message)
    try {
      setName(localStorage.getItem("visitorName") || "");
    } catch {}

    // stable per-device fingerprint, persisted client-side and mirrored server-side
    let fp = "";
    try {
      fp = localStorage.getItem("fp") || "";
    } catch {}
    if (!fp) {
      fp = computeFingerprint();
      try {
        localStorage.setItem("fp", fp);
      } catch {}
    }
    fpRef.current = fp;

    let retry: number | undefined;
    let closed = false;
    let clientIp = "";

    // Fetch the public IP from ipinfo.io so the server can link different browsers on the same network
    const fetchPublicIp = async () => {
      try {
        const res = await fetch("https://ipinfo.io/json", { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        clientIp = data.ip || "";
      } catch {
        clientIp = "";
      }
    };

    const buildTelemetry = () => {
      const nav = navigator as Navigator & { deviceMemory?: number; userLanguage?: string };
      const ua = navigator.userAgent;
      const { os, browser } = detect(ua);
      const gpu = getGPU();
      const payload = {
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
      return payload;
    };

    // surface incoming chat as a short-lived floating bar (esp. when the panel is closed / on mobile)
    const pendingDismiss = new Set<number>();
    const dismissToast = (id: number) => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      pendingDismiss.delete(id);
    };

    let lastActive = Date.now();
    const updateActivity = () => {
      lastActive = Date.now();
      // Dismiss any pending toasts after user becomes active again
      for (const id of Array.from(pendingDismiss)) {
        window.setTimeout(() => dismissToast(id), 4000);
      }
    };
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("mousedown", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("focus", updateActivity);

    const isUserActive = () => {
      return document.hasFocus() && (Date.now() - lastActive < 15000);
    };

    const scheduleDismiss = (id: number) => {
      if (!isUserActive()) {
        // Window not active or user idle — hold the toast
        pendingDismiss.add(id);
      } else {
        window.setTimeout(() => dismissToast(id), 4000);
      }
    };

    const pushToast = (msg: ChatMsg) => {
      const self = (msg.self as unknown) === true || msg.self === vid;
      if (openRef.current && !isActualMobile) return; // panel open on desktop: you already see it
      setToasts((prev) => [...prev.slice(-4), { id: msg.id, name: msg.isAdmin ? "udayps" : (self ? "you" : msg.name), text: msg.text, self, isAdmin: msg.isAdmin }]);
      scheduleDismiss(msg.id);
    };

    const connect = () => {
      if (closed) return;
      // Prod: same-origin /ws (Traefik routes it to the API container).
      // Dev: auto-target the local API on :4000. Override with NEXT_PUBLIC_WS_URL.
      const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      const base =
        process.env.NEXT_PUBLIC_WS_URL ||
        (isLocal
          ? `ws://${location.hostname}:4000/ws`
          : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      const ws = new WebSocket(
        `${base}?vid=${encodeURIComponent(vid)}&device=${isActualMobile ? "mobile" : "pc"}&fp=${encodeURIComponent(fp)}&cip=${encodeURIComponent(clientIp)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "hello", payload: buildTelemetry() }));
        // tell the server our saved name so other devices on this network can reuse it
        let saved = "";
        try {
          saved = localStorage.getItem("visitorName") || "";
        } catch {}
        if (saved) ws.send(JSON.stringify({ type: "name", name: saved }));
      };
      ws.onmessage = (e) => {
        let m;
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.type === "presence") setPresence(m);
        else if (m.type === "history") setMessages(m.messages || []);
        else if (m.type === "chat") {
          setMessages((prev) => [...prev.slice(-60), m.message]);
          pushToast(m.message);
        } else if (m.type === "me" && m.name) {
          // a device/network we recognise already has a name — adopt it if we have none
          setName((cur) => {
            if (cur) return cur;
            try {
              localStorage.setItem("visitorName", m.name);
            } catch {}
            return m.name as string;
          });
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = window.setTimeout(connect, 2500);
      };
      ws.onerror = () => ws.close();
    };
    // Fetch public IP first, then connect
    fetchPublicIp().finally(() => { if (!closed) connect(); });

    return () => {
      closed = true;
      clearTimeout(retry);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("mousedown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("focus", updateActivity);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const saveName = () => {
    const n = nameDraft.trim().slice(0, 24);
    if (!n) return;
    setName(n);
    try {
      localStorage.setItem("visitorName", n);
    } catch {}
    // share it so the server can auto-fill it on your other devices
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "name", name: n }));
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !name || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat", text, name }));
    setDraft("");
  };

  if (!mounted || !connected || !presence) return null;

  const { users, mobile, pc, you } = presence;
  const others = Math.max(0, users - 1);
  const headline =
    users <= 1 ? "You’re the only one here" : `${users} people exploring live`;
  const breakdown = [pc > 0 ? `${pc} on desktop` : "", mobile > 0 ? `${mobile} on mobile` : ""].filter(Boolean).join(" · ");

  // the visitor's own footprint, including a phone we linked by network
  let yourText = "";
  if (you?.linked && you.pc > 0 && you.mobile > 0) {
    yourText = `you (${you.pc} pc, ${you.mobile} mob)`;
  } else if (you && you.total > 1) {
    yourText = `you (${you.total} tabs)`;
  }

  return (
    <div className="fixed bottom-6 sm:bottom-5 right-3 sm:right-5 z-[400] flex flex-col items-end font-display max-w-[calc(100vw-1.5rem)]" style={{ pointerEvents: "auto" }}>

      {/* floating new-message bars */}
      {toasts.length > 0 && (
        <div className="mb-2 flex w-[clamp(220px,72vw,300px)] flex-col items-stretch gap-1.5">
          {toasts.map((t) => (
            <button
              key={t.id}
              onClick={() => !isMobile && setOpen(true)}
              className={`chat-toast truncate rounded-2xl border px-3.5 py-2 text-left text-[.74rem] leading-snug shadow-lg backdrop-blur transition-all ${
                t.isAdmin
                  ? "border-accent/40 bg-accent/10 text-accent font-bold"
                  : t.self
                  ? "border-accent/50 bg-accent text-black font-semibold"
                  : "border-line bg-[#0b0b0f]/95 text-text"
              }`}
            >
              <span className={`font-semibold ${t.isAdmin ? "text-accent" : t.self ? "text-black" : "text-accent"}`}>{t.name}:</span>{" "}
              <span className={`font-body ${t.self && !t.isAdmin ? "text-black" : "text-text"}`}>{t.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* chat panel (desktop only) */}
      {open && !isMobile && (
        <div className="live-chat mb-3 flex h-[360px] w-[320px] flex-col overflow-hidden rounded-xl border border-line bg-[#0b0b0f]/95 backdrop-blur">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[.8rem] tracking-[.04em] text-text">Live chat</span>
            <span className="text-[.68rem] text-muted">{others === 0 ? "just you" : `${others} other${others > 1 ? "s" : ""} online`}</span>
          </div>
          {!name ? (
            /* ask for a display name before letting them into the room */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[.9rem] text-text">What should we call you?</p>
              <p className="-mt-1 text-[.72rem] leading-relaxed text-muted">
                Pick a name so others know who&rsquo;s talking.
              </p>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                maxLength={24}
                autoFocus
                placeholder="Your name"
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-center font-body text-[.9rem] text-text outline-none placeholder:text-faint focus:border-accent"
              />
              <button
                onClick={saveName}
                disabled={!nameDraft.trim()}
                className="w-full rounded-md bg-accent px-3 py-2 text-[.8rem] font-semibold text-black transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Join the room
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3" data-lenis-prevent="true">
                {messages.length === 0 && (
                  <p className="mt-6 text-center text-[.78rem] leading-relaxed text-faint">
                    Say hi — this is a live room.
                    <br />
                    Other visitors will see it in real time.
                  </p>
                )}
                {messages.map((m) => {
                  const self = (m.self as unknown) === true || m.self === vidRef.current;
                  const isAdmin = m.isAdmin;
                  return (
                    <div key={m.id} className={isAdmin ? "text-left" : self ? "text-right" : "text-left"}>
                      <span className="block text-[.6rem] uppercase tracking-[.12em] text-faint">
                        {isAdmin ? (
                          <span className="text-accent font-bold">udayps</span>
                        ) : (
                          <>{self ? "you" : m.name} {m.device === "mobile" ? "· mobile" : ""}</>
                        )}
                      </span>
                      <span
                        className={`mt-0.5 inline-block max-w-[85%] rounded-lg px-2.5 py-1.5 text-left text-[.82rem] font-body ${
                          isAdmin
                            ? "bg-accent/10 text-accent border border-accent/30 shadow-[0_0_8px_rgba(204,255,61,0.06)]"
                            : self
                            ? "bg-accent text-black"
                            : "bg-surface text-text"
                        }`}
                      >
                        {m.text}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t border-line p-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  maxLength={400}
                  placeholder={`Message as ${name}…`}
                  className="flex-1 bg-transparent px-2 py-1 font-body text-[.85rem] text-text outline-none placeholder:text-faint"
                />
                <button
                  onClick={send}
                  className="rounded-md bg-accent px-3 py-1 text-[.78rem] font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* presence pill */}
      <button
        data-cursor="hover"
        onClick={() => !isMobile && setOpen((o) => !o)}
        className={`group flex items-center gap-3 rounded-full border border-line bg-[#0b0b0f]/90 px-4 py-2.5 backdrop-blur transition-colors hover:border-accent ${
          isMobile ? "cursor-default" : ""
        }`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="flex flex-col items-start leading-tight text-left">
          <span className="text-[.82rem] tracking-[.02em] text-text">{headline}</span>
          <span className="text-[.62rem] tracking-[.04em] text-muted text-balance max-w-[220px] sm:max-w-none">
            {breakdown}
            {yourText && <span className="text-accent"> · {yourText}</span>}
          </span>
        </span>
        {!isMobile && (
          <span className="ml-1 text-[.7rem] text-muted transition-colors group-hover:text-accent">
            {open ? "Close" : "Chat"}
          </span>
        )}
      </button>
    </div>
  );
}
