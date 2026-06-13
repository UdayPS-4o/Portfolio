"use client";

/**
 * PresenceTicker — "status rail" presence variant.
 * A 28px hairline bar pinned to the very bottom edge of the viewport:
 *   left   = pulsing link dot + "LINK: N NODES · x PC / y MOB"
 *   center = last transmission preview ("rx uday: …", scramble-resolves in)
 *   right  = TRANSMIT button that expands the bar upward into a 300px chat drawer
 * Mobile shows only dot + count + TRANSMIT. The site HUD owns the bottom
 * corners at z-700, so on md+ all rail content stays within the center 60%.
 * Drop-in replacement for LivePresence: mount once, no props.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useChat, usePresence, type ChatMessage } from "@/lib/mythic/presence";
import { prefersReduced } from "@/lib/mythic/motion";
import { scramble } from "@/lib/mythic/text";

const DRAWER_H = 300;

function senderLabel(m: ChatMessage): string {
  return m.admin ? "udayps" : m.self ? "you" : m.name;
}

export default function PresenceTicker() {
  const { connected, nodes, pcs, mobiles } = usePresence();
  const { messages, send, name, setName } = useChat();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");

  const drawerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const closingRef = useRef(false);
  const cancelScrambleRef = useRef<(() => void) | null>(null);

  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastId = last ? last.id : null;

  /* center preview: scramble-resolve the newest transmission into the rail */
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !last) return;
    const line = `${last.self ? "tx" : "rx"} ${senderLabel(last)}: ${last.text}`;
    el.dataset.text = line;
    cancelScrambleRef.current?.();
    cancelScrambleRef.current = scramble(el, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  /* drawer entrance: expand upward with expo ease (height 0 -> 300) */
  useLayoutEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    if (!el) return;
    if (prefersReduced()) {
      gsap.set(el, { height: DRAWER_H });
      return;
    }
    tweenRef.current = gsap.fromTo(
      el,
      { height: 0 },
      { height: DRAWER_H, duration: 0.6, ease: "expo.out" }
    );
  }, [open]);

  const closeDrawer = () => {
    if (!open || closingRef.current) return;
    const el = drawerRef.current;
    if (!el || prefersReduced()) {
      setOpen(false);
      return;
    }
    closingRef.current = true;
    tweenRef.current?.kill();
    tweenRef.current = gsap.to(el, {
      height: 0,
      duration: 0.45,
      ease: "expo.inOut",
      onComplete: () => {
        closingRef.current = false;
        setOpen(false);
      },
    });
  };

  const toggleDrawer = () => {
    if (open && !closingRef.current) {
      closeDrawer();
      return;
    }
    if (open && closingRef.current) {
      // re-open mid-close
      closingRef.current = false;
      tweenRef.current?.kill();
      const el = drawerRef.current;
      if (el) {
        if (prefersReduced()) gsap.set(el, { height: DRAWER_H });
        else
          tweenRef.current = gsap.to(el, {
            height: DRAWER_H,
            duration: 0.5,
            ease: "expo.out",
          });
      }
      return;
    }
    setOpen(true);
  };

  /* ESC inside the drawer closes it (native listener — window-level handlers
     elsewhere may stopPropagation on React synthetic events) */
  const closeRef = useRef(closeDrawer);
  closeRef.current = closeDrawer;
  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [open]);

  /* keep the transcript pinned to the newest transmission */
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: prefersReduced() ? "auto" : "smooth" });
  }, [messages, open]);

  /* full cleanup */
  useEffect(
    () => () => {
      tweenRef.current?.kill();
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

  const others = Math.max(0, nodes - 1);
  const status = connected ? `LINK: ${nodes} NODE${nodes === 1 ? "" : "S"}` : "LINK: OFFLINE";

  return (
    <div className="ptk-root fixed inset-x-0 bottom-0 z-[400] font-mono">
      {/* chat drawer — expands upward out of the rail */}
      {open && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="Live chat"
          className="live-chat relative w-full overflow-hidden border-t border-line bg-[#0b0b0e]/95 backdrop-blur"
        >
          <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[300px] w-full max-w-xl flex-col px-4">
            <div className="flex items-center justify-between border-b border-line py-2.5">
              <span className="text-[.62rem] uppercase tracking-[.15em] text-muted">
                <span className="text-accent">/ws</span> — live channel
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[.58rem] uppercase tracking-[.12em] text-faint">
                  {connected ? `${others} peer${others === 1 ? "" : "s"}` : "offline"}
                </span>
                <button
                  onClick={closeDrawer}
                  aria-label="Close chat"
                  className="text-[.72rem] leading-none text-muted transition-colors hover:text-accent"
                >
                  ✕
                </button>
              </div>
            </div>

            {!name ? (
              /* register a handle before transmitting */
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
                <div className="flex w-full max-w-xs items-center gap-2 rounded border border-line px-2.5 transition-colors focus-within:border-accent">
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
                  className="w-full max-w-xs rounded bg-accent px-3 py-2 text-[.62rem] font-semibold uppercase tracking-[.15em] text-black transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  join channel
                </button>
              </form>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  data-lenis-prevent="true"
                  className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain py-3"
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
                  className="flex items-center gap-2 border-t border-line py-2.5"
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
        </div>
      )}

      {/* the rail itself */}
      <div className="relative flex h-7 items-center border-t border-line bg-bg/85 backdrop-blur">
        {/* HUD owns the bottom corners at z-700 — keep rail content in the center 60% on md+ */}
        <div className="mx-auto flex h-full w-full items-center gap-4 px-4 md:w-[60%] md:px-0">
          {/* left: link status */}
          <span className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              data-live={connected ? "1" : "0"}
              className={`ptk-dot h-1.5 w-1.5 rounded-full ${connected ? "bg-accent" : "bg-faint"}`}
            />
            <span className={`text-[.6rem] uppercase tracking-[.18em] ${connected ? "text-muted" : "text-faint"}`}>
              {status}
            </span>
            {connected && (
              <span className="hidden text-[.6rem] uppercase tracking-[.18em] text-faint md:inline">
                · {pcs} PC / {mobiles} MOB
              </span>
            )}
          </span>

          {/* center: last transmission preview (md+ only; populated imperatively) */}
          <span className="hidden min-w-0 flex-1 justify-center md:flex">
            <span ref={previewRef} aria-hidden="true" className="truncate text-[.6rem] tracking-[.12em] text-muted" />
          </span>
          <span aria-hidden="true" className="flex-1 md:hidden" />

          {/* right: transmit toggle */}
          <button
            data-cursor="hover"
            onClick={toggleDrawer}
            aria-expanded={open}
            aria-label={open ? "Close live chat" : "Open live chat"}
            className="group flex shrink-0 items-center gap-1.5 text-[.6rem] uppercase tracking-[.18em] text-muted transition-colors hover:text-accent"
          >
            {open ? "CLOSE" : "TRANSMIT"}
            <span aria-hidden="true" className={open ? "" : "text-accent"}>
              {open ? "✕" : "↗"}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        .ptk-dot[data-live="1"] { animation: ptk-pulse 2.2s ease-in-out infinite; }
        @keyframes ptk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
        .ptk-root button:focus-visible,
        .ptk-root input:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 2px;
          border-radius: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ptk-dot[data-live="1"] { animation: none; }
        }
      `}</style>
    </div>
  );
}
