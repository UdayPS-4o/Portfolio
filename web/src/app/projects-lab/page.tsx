"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * /projects-lab — audition room for the 5 "CASE FILES" variants.
 * Keys 1–5 switch, R replays the entrance. Only the selected variant loads.
 *
 * These are scroll-driven sections (some pin, some have tall runways), so the
 * page wraps the active variant in scroll spacers above/below — without them a
 * pinned/scrubbed section has nowhere to play.
 */

const VARIANTS = [
  { key: "schematic", label: "SCHEMATIC", sub: "self-drafting blueprint sheets" },
  { key: "ledger", label: "LEDGER", sub: "expanding spec-directory" },
  { key: "console", label: "CONSOLE", sub: "instrument bezel · channels tune" },
  { key: "atlas", label: "ATLAS", sub: "flowing editorial spreads" },
  { key: "monolith", label: "MONOLITH", sub: "full-viewport gallery" },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

const SECTIONS: Record<VariantKey, React.ComponentType> = {
  schematic: dynamic(() => import("@/components/mythic/projects/ProjectsSchematic"), { ssr: false }),
  ledger: dynamic(() => import("@/components/mythic/projects/ProjectsLedger"), { ssr: false }),
  console: dynamic(() => import("@/components/mythic/projects/ProjectsConsole"), { ssr: false }),
  atlas: dynamic(() => import("@/components/mythic/projects/ProjectsAtlas"), { ssr: false }),
  monolith: dynamic(() => import("@/components/mythic/projects/ProjectsMonolith"), { ssr: false }),
};

function Spacer({ label }: { label: string }) {
  return (
    <div className="relative flex h-[55vh] items-center justify-center">
      <span className="font-mono text-[.6rem] uppercase tracking-[.3em] text-faint">{label}</span>
      <span className="pointer-events-none absolute inset-x-[var(--pad)] top-1/2 h-px bg-line" />
    </div>
  );
}

export default function ProjectsLab() {
  const [ready, setReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const [run, setRun] = useState(0); // bump to remount -> replay entrance

  const idxRef = useRef(idx);
  idxRef.current = idx;

  const switchTo = (next: number) => {
    setIdx(next);
    setRun((r) => r + 1);
    window.scrollTo(0, 0);
    // let the new section mount + measure, then re-sync triggers
    requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // sections gate entrances on the boot signal; the lab is always "booted"
    document.documentElement.classList.add("is-booted");
    setReady(true);

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) {
        switchTo(n - 1);
      } else if (e.key === "ArrowRight") {
        switchTo((idxRef.current + 1) % VARIANTS.length);
      } else if (e.key === "ArrowLeft") {
        switchTo((idxRef.current - 1 + VARIANTS.length) % VARIANTS.length);
      } else if (e.key.toLowerCase() === "r") {
        setRun((r) => r + 1);
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Active = SECTIONS[VARIANTS[idx].key];

  return (
    <main className="relative bg-bg text-text">
      {/* no Chrome on this page: restore the native cursor */}
      <style>{`body{cursor:auto}`}</style>
      <div className="grain" />

      <Spacer label="↓ scroll into the section" />
      {ready && (
        <div key={`${VARIANTS[idx].key}-${run}`}>
          <Active />
        </div>
      )}
      <Spacer label="end of audition runway" />

      {/* switcher */}
      <div className="fixed inset-x-0 bottom-5 z-[990] flex justify-center px-4">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-line bg-bg-soft/90 p-1.5 shadow-2xl backdrop-blur">
          {VARIANTS.map((v, i) => (
            <button
              key={v.key}
              type="button"
              onClick={() => switchTo(i)}
              title={v.sub}
              className={`rounded px-3 py-2 font-mono text-[.62rem] uppercase tracking-[.14em] transition-colors duration-200 ${
                i === idx ? "bg-accent text-bg" : "text-muted hover:bg-white/5 hover:text-text"
              }`}
            >
              {String(i + 1).padStart(2, "0")} {v.label}
            </button>
          ))}
          <span className="hidden px-3 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint md:inline">
            1–5 switch · R replay
          </span>
        </div>
      </div>
    </main>
  );
}
