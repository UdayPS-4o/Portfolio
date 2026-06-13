"use client";

/**
 * PresenceOrbital — "constellation" presence variant.
 * Bottom-right cluster: one accent core dot (= you) orbited by one small dot
 * per OTHER live node (max 8 shown, +N overflow chip). Dots drift on slow
 * individual orbits (gsap, paused while the tab is hidden). A join pings a
 * 1.5x pulse ring + a brief "+1 NODE" mono label. Hover (or tap on touch)
 * reveals a mono readout card; click opens a compact chat popover.
 * Reduced motion: static dots. Drop-in replacement for LivePresence.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useChat, usePresence, type ChatMessage } from "@/lib/mythic/presence";
import { prefersReduced } from "@/lib/mythic/motion";

const MAX_SATS = 8;
const RADII = [13, 20, 26, 16, 23, 28, 18, 24];
const DURS = [11, 17, 13, 21, 9, 23, 15, 19];

type Toast = { id: string; name: string; text: string; self: boolean; admin?: boolean };

function senderLabel(m: ChatMessage): string {
  return m.admin ? "udayps" : m.self ? "you" : m.name;
}

export default function PresenceOrbital() {
  const { connected, nodes, pcs, mobiles } = usePresence();
  const { messages, send, name, setName } = useChat();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [card, setCard] = useState(false); // touch-toggled readout
  const [hovered, setHovered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pingTweens = useRef<gsap.core.Animation[]>([]);
  const closeTimer = useRef<number | undefined>(undefined);
  const toastTimers = useRef<Set<number>>(new Set());
  const prevNodes = useRef<number | null>(null);
  const openRef = useRef(false);

  const others = connected ? Math.max(0, nodes - 1) : 0;
  const sats = Math.min(others, MAX_SATS);
  const overflow = others - sats;

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* hide the ping ring + join label until they fire (JS-set, not CSS) */
  useLayoutEffect(() => {
    if (ringRef.current) gsap.set(ringRef.current, { opacity: 0, scale: 0.6 });
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 });
  }, []);

  /* satellite orbits — one slow individual rotation per dot, paused when hidden */
  useEffect(() => {
    if (sats === 0 || prefersReduced()) return;
    const root = rootRef.current;
    if (!root) return;
    const tweens: gsap.core.Tween[] = [];
    root.querySelectorAll<HTMLElement>(".porb-rot").forEach((el, i) => {
      tweens.push(
        gsap.to(el, {
          rotation: "+=360",
          duration: DURS[i % DURS.length],
          ease: "none",
          repeat: -1,
        })
      );
    });
    const onVis = () => {
      if (document.hidden) tweens.forEach((t) => t.pause());
      else tweens.forEach((t) => t.resume());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      tweens.forEach((t) => t.kill());
    };
  }, [sats]);

  /* join/leave ping: pulse ring + "+1 NODE" label on node-count change */
  useEffect(() => {
    const prev = prevNodes.current;
    prevNodes.current = connected ? nodes : null;
    if (!connected || prev === null || nodes === prev) return;
    const delta = nodes - prev;

    const lab = labelRef.current;
    if (lab) {
      lab.textContent = `${delta > 0 ? "+" : ""}${delta} NODE${Math.abs(delta) > 1 ? "S" : ""}`;
      lab.style.color = delta > 0 ? "var(--accent)" : "#54545c";
      pingTweens.current.forEach((t) => t.kill());
      pingTweens.current = [];
      if (prefersReduced()) {
        gsap.set(lab, { opacity: 1, y: 0 });
        pingTweens.current.push(gsap.to(lab, { opacity: 0, delay: 1.4, duration: 0.2 }));
      } else {
        pingTweens.current.push(
          gsap
            .timeline()
            .fromTo(lab, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: "power4.out" })
            .to(lab, { opacity: 0, duration: 0.4, ease: "power2.in" }, "+=1.1")
        );
      }
    }
    if (delta > 0 && ringRef.current && !prefersReduced()) {
      pingTweens.current.push(
        gsap.fromTo(
          ringRef.current,
          { scale: 0.6, opacity: 0.9 },
          { scale: 1.5, opacity: 0, duration: 1, ease: "power2.out", overwrite: true }
        )
      );
    }
  }, [nodes, connected]);

  /* incoming transmissions surface as short-lived toasts while the popover is closed */
  const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (!lastId) return;
    const m = messages[messages.length - 1];
    if (m.at < Date.now() - 3000) return; // history backfill, not live traffic
    if (openRef.current) return;
    setToasts((prev) => [
      ...prev.slice(-3),
      { id: m.id, name: senderLabel(m), text: m.text, self: m.self, admin: m.admin },
    ]);
    const t = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== m.id));
      toastTimers.current.delete(t);
    }, 4100);
    toastTimers.current.add(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  /* keep transcript pinned to newest */
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: prefersReduced() ? "auto" : "smooth" });
  }, [messages, open]);

  const openChat = () => {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
    setCard(false);
    setHovered(false);
  };
  const closeChat = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 300);
  };
  const toggleChat = () => {
    if (open && !closing) closeChat();
    else openChat();
  };

  /* ESC inside the popover closes it (native listener) */
  const closeRef = useRef(closeChat);
  closeRef.current = closeChat;
  useEffect(() => {
    if (!open) return;
    const el = popRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open]);

  /* full cleanup */
  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      window.clearTimeout(closeTimer.current);
      timers.forEach((t) => window.clearTimeout(t));
      pingTweens.current.forEach((t) => t.kill());
    };
  }, []);

  const onClusterClick = () => {
    if (isTouch) {
      if (open && !closing) closeChat();
      else setCard((c) => !c);
    } else {
      toggleChat();
    }
  };

  const saveName = () => {
    const n = nameDraft.trim().slice(0, 24);
    if (n) setName(n);
  };
  const doSend = () => {
    const t = draft.trim();
    if (!t || !name || !connected) return;
    send(t);
    setDraft("");
  };

  const peers = Math.max(0, nodes - 1);
  const readout = connected
    ? `LINK: ${nodes} NODE${nodes === 1 ? "" : "S"} · ${pcs} PC / ${mobiles} MOB`
    : "LINK: OFFLINE";
  const showCard = !open && (card || (hovered && !isTouch));

  return (
    <div
      ref={rootRef}
      className="porb-root fixed bottom-5 right-4 z-[400] flex max-w-[calc(100vw-1.5rem)] flex-col items-end font-mono md:bottom-12 md:right-6"
    >
      {/* floating new-message bars */}
      {toasts.length > 0 && (
        <div className="mb-2 flex w-[clamp(220px,72vw,300px)] flex-col items-stretch gap-1.5">
          {toasts.map((t) => (
            <button
              key={t.id}
              onClick={openChat}
              className={`chat-toast truncate rounded border px-3 py-2 text-left text-[.68rem] leading-snug shadow-lg backdrop-blur ${
                t.admin
                  ? "border-accent/40 bg-accent/10"
                  : t.self
                  ? "border-accent/40 bg-[#0b0b0e]/95"
                  : "border-line bg-[#0b0b0e]/95"
              }`}
            >
              <span className={t.admin ? "font-bold text-accent" : "text-accent"}>{t.name}</span>
              <span className="text-faint">{" > "}</span>
              <span className={t.admin || t.self ? "text-accent" : "text-text"}>{t.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* compact chat popover */}
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Live chat"
          className={`live-chat porb-pop ${closing ? "porb-closing" : ""} mb-2 flex h-[340px] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-[#0b0b0e]/95 shadow-2xl backdrop-blur`}
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="text-[.62rem] uppercase tracking-[.15em] text-muted">
              <span className="text-accent">/ws</span> — live channel
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[.58rem] uppercase tracking-[.12em] text-faint">
                {connected ? `${peers} peer${peers === 1 ? "" : "s"}` : "offline"}
              </span>
              <button
                onClick={closeChat}
                aria-label="Close chat"
                className="text-[.72rem] leading-none text-muted transition-colors hover:text-accent"
              >
                ✕
              </button>
            </div>
          </div>

          {!name ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 text-center"
            >
              <p className="text-[.72rem] uppercase tracking-[.15em] text-text">register a handle</p>
              <p className="-mt-1 text-[.62rem] leading-relaxed text-muted">
                other nodes see this name on your transmissions.
              </p>
              <div className="flex w-full items-center gap-2 rounded border border-line px-2.5 transition-colors focus-within:border-accent">
                <span aria-hidden="true" className="text-[.72rem] text-accent">&gt;</span>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={24}
                  autoFocus
                  placeholder="handle"
                  aria-label="Your display name"
                  className="w-full min-w-0 bg-transparent py-2 text-[.72rem] text-text outline-none placeholder:text-faint"
                />
              </div>
              <button
                type="submit"
                disabled={!nameDraft.trim()}
                className="w-full rounded bg-accent px-3 py-2 text-[.62rem] font-semibold uppercase tracking-[.15em] text-black transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                join channel
              </button>
            </form>
          ) : (
            <>
              <div
                ref={scrollRef}
                data-lenis-prevent="true"
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3.5 py-3"
              >
                {messages.length === 0 && (
                  <p className="mt-6 text-center text-[.62rem] leading-relaxed text-faint">
                    channel open — transmissions
                    <br />
                    appear in real time. say hi.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="break-words text-[.72rem] leading-relaxed">
                    <span className={m.admin ? "font-bold text-accent" : m.self ? "text-accent" : "text-muted"}>
                      {senderLabel(m)}
                    </span>
                    <span className="text-faint">{" > "}</span>
                    <span className={m.admin || m.self ? "text-accent" : "text-text"}>{m.text}</span>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  doSend();
                }}
                className="flex items-center gap-2 border-t border-line px-3 py-2.5"
              >
                <span aria-hidden="true" className="text-[.72rem] text-accent">&gt;</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={400}
                  disabled={!connected}
                  placeholder={connected ? `transmit as ${name}` : "link offline — reconnecting"}
                  aria-label="Chat message"
                  className="min-w-0 flex-1 bg-transparent text-[.72rem] text-text outline-none placeholder:text-faint disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!connected}
                  aria-label="Send message"
                  className="text-[.62rem] uppercase tracking-[.15em] text-muted transition-colors hover:text-accent disabled:opacity-40"
                >
                  send
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* hover / tap readout card */}
      {showCard && (
        <div
          className={`porb-card mb-2 rounded border border-line bg-bg-soft/85 px-3 py-2 backdrop-blur ${
            isTouch ? "" : "pointer-events-none"
          }`}
        >
          <p className={`text-[.6rem] uppercase tracking-[.18em] ${connected ? "text-muted" : "text-faint"}`}>
            {readout}
          </p>
          {isTouch && (
            <button
              onClick={openChat}
              className="mt-1.5 text-[.6rem] uppercase tracking-[.18em] text-accent transition-opacity hover:opacity-80"
            >
              open channel ↗
            </button>
          )}
        </div>
      )}

      {/* the constellation cluster */}
      <button
        data-cursor="hover"
        onClick={onClusterClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={open}
        aria-label={
          connected
            ? `Live presence: ${nodes} node${nodes === 1 ? "" : "s"} linked, ${pcs} desktop, ${mobiles} mobile. ${
                open ? "Close" : "Open"
              } live chat`
            : "Live presence offline. Open live chat"
        }
        className="porb-cluster relative h-16 w-16 rounded-full"
      >
        {/* join ping ring (opacity set from JS) */}
        <span ref={ringRef} aria-hidden="true" className="absolute inset-0 rounded-full border border-accent/70" />
        {/* faint orbit guide */}
        <span aria-hidden="true" className="absolute inset-1.5 rounded-full border border-line" />
        {/* core = you */}
        <span
          aria-hidden="true"
          className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            connected ? "porb-core bg-accent" : "bg-faint"
          }`}
        />
        {/* satellites = other nodes */}
        {Array.from({ length: sats }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="porb-rot absolute inset-0"
            style={{ transform: `rotate(${(i * 137.5) % 360}deg)` }}
          >
            <span
              className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-text/70"
              style={{ transform: `translate(-50%, -50%) translateY(-${RADII[i % RADII.length]}px)` }}
            />
          </span>
        ))}
        {/* overflow chip */}
        {overflow > 0 && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 rounded border border-line bg-bg-soft/85 px-1 py-px text-[.55rem] tracking-[.08em] text-faint backdrop-blur"
          >
            +{overflow}
          </span>
        )}
        {/* join/leave label (text + opacity set from JS) */}
        <span aria-hidden="true" className="absolute bottom-0 right-full top-0 mr-1.5 flex items-center">
          <span ref={labelRef} className="whitespace-nowrap text-[.6rem] uppercase tracking-[.18em] text-accent" />
        </span>
      </button>

      <style>{`
        .porb-core { animation: porb-pulse 2.4s ease-in-out infinite; }
        @keyframes porb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
        .porb-pop {
          transform-origin: bottom right;
          animation: porb-in .35s cubic-bezier(.22,1,.36,1) both;
        }
        .porb-pop.porb-closing { animation: porb-out .3s cubic-bezier(.22,1,.36,1) both; }
        @keyframes porb-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes porb-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(12px); } }
        .porb-card { animation: porb-fade .25s cubic-bezier(.22,1,.36,1) both; }
        @keyframes porb-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .porb-root button:focus-visible,
        .porb-root input:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 2px;
          border-radius: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .porb-core { animation: none; }
          .porb-pop, .porb-pop.porb-closing, .porb-card { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
