"use client";

/**
 * PresenceHud — "instrument readout" presence variant (the most minimal).
 * A single mono line fixed bottom-right reading "◉ N LINKED · x/y" that
 * matches the site HUD typography (text-[.6rem] tracking-widest text-faint,
 * accent dot while connected). On a new transmission the line briefly swaps
 * to "rx <name>: <text>" (scramble in, hold ~4s, scramble back). Clicking it
 * opens a slide-up chat card. Offline = dimmed "LINK: OFFLINE".
 * Drop-in replacement for LivePresence: mount once, no props.
 */

import { useEffect, useRef, useState } from "react";
import { useChat, usePresence, type ChatMessage } from "@/lib/mythic/presence";
import { prefersReduced } from "@/lib/mythic/motion";
import { scramble } from "@/lib/mythic/text";

const RX_HOLD_MS = 4000;
const RX_MAX_CHARS = 48;

function senderLabel(m: ChatMessage): string {
  return m.admin ? "udayps" : m.self ? "you" : m.name;
}

export default function PresenceHud() {
  const { connected, nodes, pcs, mobiles } = usePresence();
  const { messages, send, name, setName } = useChat();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");

  const lineRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelScrambleRef = useRef<(() => void) | null>(null);
  const rxTimer = useRef<number | undefined>(undefined);
  const rxActive = useRef(false);
  const firstRun = useRef(true);
  const statusRef = useRef("");
  const openRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const status = connected ? `${nodes} LINKED · ${pcs}/${mobiles}` : "LINK: OFFLINE";
  statusRef.current = status;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* keep the readout line in sync with presence (scramble on change) */
  useEffect(() => {
    const el = lineRef.current;
    if (!el || rxActive.current) return;
    el.dataset.text = status;
    if (firstRun.current) {
      firstRun.current = false;
      el.textContent = status;
      return;
    }
    cancelScrambleRef.current?.();
    cancelScrambleRef.current = scramble(el, { duration: 0.45 });
  }, [status]);

  /* new transmission: swap to "rx <name>: <text>" for 4s, then scramble back */
  const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    const el = lineRef.current;
    if (!el || !lastId) return;
    const m = messages[messages.length - 1];
    if (m.at < Date.now() - 3000) return; // history backfill, not live traffic
    if (openRef.current) return; // chat card open — already visible there
    const raw = `${m.self ? "tx" : "rx"} ${senderLabel(m)}: ${m.text}`;
    const line = raw.length > RX_MAX_CHARS ? `${raw.slice(0, RX_MAX_CHARS - 1)}…` : raw;
    rxActive.current = true;
    el.dataset.text = line;
    cancelScrambleRef.current?.();
    cancelScrambleRef.current = scramble(el, { duration: 0.5 });
    window.clearTimeout(rxTimer.current);
    rxTimer.current = window.setTimeout(() => {
      rxActive.current = false;
      const cur = lineRef.current;
      if (!cur) return;
      cur.dataset.text = statusRef.current;
      cancelScrambleRef.current?.();
      cancelScrambleRef.current = scramble(cur, { duration: 0.5 });
    }, RX_HOLD_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  /* keep transcript pinned to newest */
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: prefersReduced() ? "auto" : "smooth" });
  }, [messages, open]);

  const openCard = () => {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };
  const closeCard = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 300);
  };
  const toggleCard = () => {
    if (open && !closing) closeCard();
    else openCard();
  };

  /* ESC inside the card closes it (native listener) */
  const closeRef = useRef(closeCard);
  closeRef.current = closeCard;
  useEffect(() => {
    if (!open) return;
    const el = cardRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open]);

  /* full cleanup */
  useEffect(
    () => () => {
      window.clearTimeout(rxTimer.current);
      window.clearTimeout(closeTimer.current);
      cancelScrambleRef.current?.();
    },
    []
  );

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

  return (
    <div className="phud-root fixed bottom-5 right-4 z-[400] flex max-w-[calc(100vw-1.5rem)] flex-col items-end font-mono md:bottom-12 md:right-6">
      {/* slide-up chat card */}
      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label="Live chat"
          className={`live-chat phud-card ${closing ? "phud-closing" : ""} mb-2.5 flex h-[320px] w-[min(300px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-[#0b0b0e]/95 shadow-2xl backdrop-blur`}
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
                onClick={closeCard}
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

      {/* the instrument line */}
      <button
        data-cursor="hover"
        onClick={toggleCard}
        aria-expanded={open}
        aria-label={
          connected
            ? `Live presence: ${nodes} linked, ${pcs} desktop, ${mobiles} mobile. ${open ? "Close" : "Open"} live chat`
            : "Live presence offline. Open live chat"
        }
        className={`flex items-center gap-2 rounded px-1 py-1 text-[.6rem] tracking-widest transition-colors ${
          connected ? "text-faint hover:text-muted" : "text-faint/80 hover:text-faint"
        }`}
      >
        <span aria-hidden="true" className={connected ? "phud-dot text-accent" : "text-faint"}>
          {connected ? "◉" : "◌"}
        </span>
        {/* populated imperatively: "N LINKED · x/y" | "LINK: OFFLINE" | "rx name: text" */}
        <span ref={lineRef} aria-hidden="true" className="whitespace-nowrap" />
      </button>

      <style>{`
        .phud-dot { animation: phud-pulse 2.4s ease-in-out infinite; }
        @keyframes phud-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        .phud-card {
          transform-origin: bottom right;
          animation: phud-in .35s cubic-bezier(.22,1,.36,1) both;
        }
        .phud-card.phud-closing { animation: phud-out .3s cubic-bezier(.22,1,.36,1) both; }
        @keyframes phud-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes phud-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(14px); } }
        .phud-root button:focus-visible,
        .phud-root input:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 2px;
          border-radius: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .phud-dot { animation: none; }
          .phud-card, .phud-card.phud-closing { animation-duration: .01s; }
        }
      `}</style>
    </div>
  );
}
