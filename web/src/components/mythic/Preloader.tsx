"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { lockScroll, unlockScroll, prefersReduced } from "@/lib/mythic/motion";

/**
 * Preloader — terminal boot sequence.
 * Left: mono log lines streaming in with randomized gaps.
 * Bottom-right: huge percent + 2px accent bar.
 * Finale: "ACCESS GRANTED" stamp → two-stage panel wipe revealing the hero.
 * Click anywhere = fast-forward. Hard safety timeout at 4.5s.
 * On boot: adds `is-booted` to <html>, dispatches "mythic:booted", removes itself.
 */

type LogStatus = "ok" | "wait" | "warn";

const LOG_LINES: Array<[string, LogStatus]> = [
  ["init payload_crypto.ko", "ok"],
  ["mount /dev/uday", "ok"],
  ["probe frida.gadget … attached", "ok"],
  ["handshake: queue-it bypass", "wait"],
  ["spoof device.fingerprint", "ok"],
  ["attach 50 parallel sessions", "ok"],
  ["tls pin detected — bypassed", "warn"],
  ["decode swap intent", "ok"],
  ["decrypt portfolio.bin", "ok"],
];

const STATUS_TOKEN: Record<LogStatus, string> = {
  ok: "[ ok ]",
  wait: "[ .. ]",
  warn: "[ !! ]",
};

export default function Preloader() {
  const [done, setDone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mainPanel = useRef<HTMLDivElement>(null);
  const softPanel = useRef<HTMLDivElement>(null);
  const logBox = useRef<HTMLDivElement>(null);
  const pctEl = useRef<HTMLSpanElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const stampEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // already booted this client session (HMR / client nav) → never replay
    if (document.documentElement.classList.contains("is-booted")) {
      setDone(true);
      return;
    }

    let booted = false;
    const boot = () => {
      if (booted) return;
      booted = true;
      document.documentElement.classList.add("is-booted");
      window.dispatchEvent(new CustomEvent("mythic:booted"));
      unlockScroll();
    };

    lockScroll();

    // reduced motion: a brief beat, then fade straight through
    if (prefersReduced()) {
      const tween = gsap.to(root.current, {
        opacity: 0,
        duration: 0.35,
        delay: 0.25,
        ease: "power2.out",
        onStart: boot,
        onComplete: () => setDone(true),
      });
      return () => {
        tween.kill();
        unlockScroll();
      };
    }

    let skip: (() => void) | null = null;
    let safety = 0;

    const ctx = gsap.context(() => {
      const log = logBox.current!;
      log.innerHTML = ""; // strict-mode / re-mount safety

      const addLine = (text: string, status: LogStatus) => {
        const row = document.createElement("div");
        row.className = "mpre-row";
        const st = document.createElement("span");
        st.className = "mpre-st";
        st.textContent = STATUS_TOKEN[status];
        st.style.color = status === "ok" ? "var(--accent)" : "var(--accent-3)";
        const tx = document.createElement("span");
        tx.textContent = text;
        row.append(st, tx);
        log.appendChild(row);
        return st;
      };

      const tl = gsap.timeline({
        onComplete: () => {
          boot(); // safety: ensure boot even if the call below was skipped
          setDone(true);
        },
      });

      // ── log lines: randomized 60–220ms gaps ──
      let t = 0.3;
      let waitStamp: HTMLSpanElement | null = null;
      LOG_LINES.forEach(([text, status]) => {
        t += gsap.utils.random(0.06, 0.22);
        tl.call(
          () => {
            const st = addLine(text, status);
            if (status === "wait") waitStamp = st;
          },
          undefined,
          t
        );
      });
      // the pending handshake resolves a beat later
      tl.call(
        () => {
          if (waitStamp) {
            waitStamp.textContent = STATUS_TOKEN.ok;
            waitStamp.style.color = "var(--accent)";
          }
        },
        undefined,
        t + 0.45
      );

      // ── percent 0 → 100 + accent bar ──
      const counter = { v: 0 };
      tl.to(
        counter,
        {
          v: 100,
          duration: 2.0,
          ease: "power2.inOut",
          onUpdate: () => {
            if (pctEl.current)
              pctEl.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
            if (barEl.current)
              barEl.current.style.transform = `scaleX(${counter.v / 100})`;
          },
        },
        0.15
      );

      // ── ACCESS GRANTED stamp ──
      tl.fromTo(
        stampEl.current,
        { opacity: 0, scale: 1.4, rotation: -4 },
        { opacity: 1, scale: 1, rotation: -4, duration: 0.28, ease: "expo.out" },
        2.18
      );

      // ── boot + two-stage wipe (hero entrance overlaps the reveal) ──
      tl.call(boot, undefined, 2.5);
      tl.to(
        mainPanel.current,
        { yPercent: -100, duration: 0.9, ease: "expo.inOut" },
        2.48
      );
      tl.to(
        softPanel.current,
        { yPercent: -100, duration: 0.9, ease: "expo.inOut" },
        2.62
      );

      // skip: any click/tap fast-forwards the whole sequence
      skip = () => tl.timeScale(8);
      root.current?.addEventListener("pointerdown", skip);

      // hard safety: never trap the visitor past 4.5s
      safety = window.setTimeout(() => {
        if (!booted) {
          tl.kill();
          boot();
          setDone(true);
        }
      }, 4500);
    }, root);

    const rootEl = root.current;
    return () => {
      window.clearTimeout(safety);
      if (skip) rootEl?.removeEventListener("pointerdown", skip);
      ctx.revert();
      unlockScroll(); // never leave the page locked
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      className="mpre fixed inset-0 z-[1000]"
      role="status"
      aria-label="Booting"
    >
      {/* without JS the overlay must not entomb the page */}
      <noscript>
        <style>{`.mpre{display:none}`}</style>
      </noscript>

      {/* stage 2 panel (revealed by the main panel's wipe) */}
      <div ref={softPanel} className="absolute inset-0 z-[1] bg-bg-soft" />

      {/* stage 1 panel — carries all boot content */}
      <div ref={mainPanel} className="absolute inset-0 z-[2] overflow-hidden bg-bg">
        {/* terminal log */}
        <div className="absolute left-[var(--pad)] top-[18%] max-w-[34rem] md:top-[22%]">
          <div className="mb-3 font-mono text-[.6rem] uppercase tracking-[.25em] text-faint">
            uday.exe — boot sequence v2.6
          </div>
          <div
            ref={logBox}
            className="font-mono text-[.68rem] leading-[1.9] text-muted md:text-[.72rem]"
          />
          <span className="inline-block animate-blink font-mono text-[.72rem] text-accent">
            ▌
          </span>
        </div>

        {/* percent + bar */}
        <div className="absolute bottom-[7%] right-[var(--pad)] text-right">
          <div className="font-display text-[clamp(4rem,14vw,12rem)] font-bold leading-none tracking-[-.04em] text-text">
            <span ref={pctEl}>000</span>
            <span className="text-[.35em] text-faint">%</span>
          </div>
          <div className="mt-3 inline-block h-[2px] w-[min(38vw,320px)] bg-white/10">
            <div
              ref={barEl}
              className="h-full w-full origin-left bg-accent"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>

        {/* ACCESS GRANTED stamp */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            ref={stampEl}
            className="border-2 border-accent px-7 py-3 font-mono text-[.85rem] uppercase tracking-[.4em] text-accent md:text-[1.05rem]"
            style={{ opacity: 0 }}
          >
            Access granted
          </div>
        </div>

        {/* corner annotations */}
        <div className="absolute left-[var(--pad)] top-7 font-mono text-[.6rem] uppercase tracking-[.25em] text-faint">
          /// signal lock
        </div>
        <div className="absolute right-[var(--pad)] top-7 font-mono text-[.6rem] uppercase tracking-[.25em] text-faint">
          click to skip
        </div>
      </div>

      <style>{`
        .mpre-row { display: flex; gap: .9em; white-space: nowrap; }
        .mpre-st { flex: none; letter-spacing: .08em; }
        @media (max-width: 767px) {
          .mpre-row { white-space: normal; }
        }
      `}</style>
    </div>
  );
}
