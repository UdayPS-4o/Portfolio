"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, usePresence, subscribeIncomingChat, isMobileDevice } from "@/lib/mythic/presence";

type Toast = { id: string; name: string; text: string; self: boolean; isAdmin?: boolean };

export default function LivePresence() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [closing, setClosing] = useState(false);
  const openRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const presence = usePresence();
  const { messages, send: sendMessage, name, setName } = useChat();
  const connected = presence.connected;

  useEffect(() => {
    setMounted(true);
    const actualMobile = isMobileDevice();
    setIsMobile(actualMobile);

    // surface incoming chat as a short-lived floating bar (esp. when the panel is closed / on mobile)
    const pendingDismiss = new Set<string>();
    const dismissToast = (id: string) => {
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
      return document.hasFocus() && Date.now() - lastActive < 15000;
    };

    const scheduleDismiss = (id: string) => {
      if (!isUserActive()) {
        // Window not active or user idle — hold the toast
        pendingDismiss.add(id);
      } else {
        window.setTimeout(() => dismissToast(id), 4000);
      }
    };

    const unsubscribe = subscribeIncomingChat((msg) => {
      if (openRef.current && !actualMobile) return; // panel open on desktop: you already see it
      setToasts((prev) => [
        ...prev.slice(-4),
        {
          id: msg.id,
          name: msg.admin ? "udayps" : msg.self ? "you" : msg.name,
          text: msg.text,
          self: msg.self,
          isAdmin: msg.admin,
        },
      ]);
      scheduleDismiss(msg.id);
    });

    return () => {
      unsubscribe();
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("mousedown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("focus", updateActivity);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // presentational only: clear the panel close tween timer on unmount
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openPanel = () => {
    if (isMobile) return;
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };
  const closePanel = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 300);
  };
  const togglePanel = () => {
    if (isMobile) return;
    if (open && !closing) closePanel();
    else openPanel();
  };

  const saveName = () => {
    const n = nameDraft.trim().slice(0, 24);
    if (!n) return;
    // lib persists it and shares it so the server can auto-fill it on your other devices
    setName(n);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !name || !connected) return;
    sendMessage(text);
    setDraft("");
  };

  if (!mounted || !connected || presence.nodes < 1) return null;

  const users = presence.nodes;
  const mobile = presence.mobiles;
  const pc = presence.pcs;
  const you = presence.you;
  const others = Math.max(0, users - 1);
  const linkLabel = `LINK: ${users} NODE${users === 1 ? "" : "S"}`;
  const breakdown = [pc > 0 ? `${pc} PC` : "", mobile > 0 ? `${mobile} MOB` : ""].filter(Boolean).join(" / ");

  // the visitor's own footprint, including a phone we linked by network
  let yourText = "";
  if (you?.linked && you.pc > 0 && you.mobile > 0) {
    yourText = `YOU: ${you.pc}PC+${you.mobile}MOB`;
  } else if (you && you.total > 1) {
    yourText = `YOU ×${you.total} TABS`;
  }

  return (
    <div
      className="fixed bottom-5 right-4 md:bottom-12 md:right-6 z-[400] flex flex-col items-end font-mono max-w-[calc(100vw-1.5rem)]"
      style={{ pointerEvents: "auto" }}
    >
      {/* floating new-message bars */}
      {toasts.length > 0 && (
        <div className="mb-2 flex w-[clamp(220px,72vw,300px)] flex-col items-stretch gap-1.5">
          {toasts.map((t) => (
            <button
              key={t.id}
              onClick={openPanel}
              className={`chat-toast truncate rounded border px-3 py-2 text-left font-mono text-[.68rem] leading-snug shadow-lg backdrop-blur ${
                t.isAdmin
                  ? "border-accent/40 bg-accent/10"
                  : t.self
                  ? "border-accent/40 bg-[#0b0b0e]/95"
                  : "border-line bg-[#0b0b0e]/95"
              }`}
            >
              <span className={`${t.isAdmin ? "font-bold text-accent" : "text-accent"}`}>{t.name}</span>
              <span className="text-faint">{" > "}</span>
              <span className={t.isAdmin || t.self ? "text-accent" : "text-text"}>{t.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* chat panel (desktop only) — opens upward from the chip */}
      {open && !isMobile && (
        <div
          className={`live-chat lpx-panel ${closing ? "lpx-closing" : ""} mb-3 flex h-[340px] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-[#0b0b0e]/95 shadow-2xl backdrop-blur`}
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="font-mono text-[.62rem] uppercase tracking-[.15em] text-muted">
              <span className="text-accent">/ws</span> — live channel
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[.58rem] uppercase tracking-[.12em] text-faint">
                {others === 0 ? "0 peers" : `${others} peer${others > 1 ? "s" : ""}`}
              </span>
              <button
                onClick={togglePanel}
                aria-label="Close chat"
                className="font-mono text-[.72rem] leading-none text-muted transition-colors hover:text-accent"
              >
                ✕
              </button>
            </div>
          </div>
          {!name ? (
            /* ask for a display name before letting them into the room */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
              <p className="font-mono text-[.72rem] uppercase tracking-[.15em] text-text">register a handle</p>
              <p className="-mt-1 font-mono text-[.62rem] leading-relaxed text-muted">
                other nodes see this name on your transmissions.
              </p>
              <div className="flex w-full items-center gap-2 rounded border border-line px-2.5 transition-colors focus-within:border-accent">
                <span aria-hidden="true" className="font-mono text-[.72rem] text-accent">&gt;</span>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  maxLength={24}
                  autoFocus
                  placeholder="handle"
                  aria-label="Your display name"
                  className="w-full min-w-0 bg-transparent py-2 font-mono text-[.72rem] text-text outline-none placeholder:text-faint"
                />
              </div>
              <button
                onClick={saveName}
                disabled={!nameDraft.trim()}
                className="w-full rounded bg-accent px-3 py-2 font-mono text-[.62rem] font-semibold uppercase tracking-[.15em] text-black transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                join channel
              </button>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3.5 py-3"
                data-lenis-prevent="true"
              >
                {messages.length === 0 && (
                  <p className="mt-6 text-center font-mono text-[.62rem] leading-relaxed text-faint">
                    channel open — transmissions
                    <br />
                    appear in real time. say hi.
                  </p>
                )}
                {messages.map((m) => {
                  const self = m.self;
                  const isAdmin = m.admin;
                  return (
                    <div key={m.id} className="break-words font-mono text-[.72rem] leading-relaxed">
                      <span className={isAdmin ? "font-bold text-accent" : self ? "text-accent" : "text-muted"}>
                        {isAdmin ? "udayps" : self ? "you" : m.name}
                      </span>
                      {!isAdmin && m.device === "mobile" && (
                        <span className="text-[.58rem] uppercase text-faint"> [mob]</span>
                      )}
                      <span className="text-faint">{" > "}</span>
                      <span className={isAdmin || self ? "text-accent" : "text-text"}>{m.text}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
                <span aria-hidden="true" className="font-mono text-[.72rem] text-accent">&gt;</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  maxLength={400}
                  placeholder={`transmit as ${name}`}
                  aria-label="Chat message"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[.72rem] text-text outline-none placeholder:text-faint"
                />
                <button
                  onClick={send}
                  aria-label="Send message"
                  className="font-mono text-[.62rem] uppercase tracking-[.15em] text-muted transition-colors hover:text-accent"
                >
                  send
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* presence chip */}
      <button
        data-cursor="hover"
        onClick={togglePanel}
        aria-label={isMobile ? "Live presence" : open ? "Close live chat" : "Open live chat"}
        className={`group flex max-w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded border border-line bg-bg-soft/85 px-3 py-2 backdrop-blur transition-colors hover:border-accent/60 ${
          isMobile ? "cursor-default" : ""
        }`}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse2" />
        <span className="font-mono text-[.62rem] uppercase tracking-[.15em] text-muted">{linkLabel}</span>
        {breakdown && (
          <span className="font-mono text-[.62rem] uppercase tracking-[.15em] text-faint">· {breakdown}</span>
        )}
        {yourText && (
          <span className="font-mono text-[.62rem] uppercase tracking-[.15em] text-accent/80">· {yourText}</span>
        )}
        {!isMobile && (
          <span className="ml-1 font-mono text-[.62rem] uppercase tracking-[.15em] text-faint transition-colors group-hover:text-accent">
            {open ? "close" : "chat"}
          </span>
        )}
      </button>

      <style>{`
        .lpx-panel {
          transform-origin: bottom right;
          animation: lpx-in .35s cubic-bezier(.22,1,.36,1) both;
        }
        .lpx-panel.lpx-closing {
          animation: lpx-out .3s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes lpx-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpx-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lpx-panel, .lpx-panel.lpx-closing { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
