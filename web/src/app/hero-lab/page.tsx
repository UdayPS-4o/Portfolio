"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * /hero-lab — audition room for the hero finalists and presence-widget styles.
 * Keys 1–3 switch heroes, Q/W/E/T cycle presence widgets, R replays the entrance.
 * Only the selected components load (dynamic imports, no SSR).
 */

const HEROES_DEF = [
  { key: "breach", label: "BREACH", sub: "terminal rain intrusion" },
  { key: "schematic", label: "SCHEMATIC", sub: "self-drafting blueprint" },
  { key: "overwatch", label: "OVERWATCH", sub: "tactical radar — visitors are blips" },
] as const;

const PRESENCE_DEF = [
  { key: "chip", label: "CHIP", sub: "compact chip + chat panel (current)" },
  { key: "ticker", label: "TICKER", sub: "bottom status rail + drawer" },
  { key: "orbital", label: "ORBITAL", sub: "node constellation" },
  { key: "hud", label: "HUD", sub: "one-line instrument readout" },
  { key: "none", label: "OFF", sub: "no standalone widget" },
] as const;

type HeroKey = (typeof HEROES_DEF)[number]["key"];
type PresenceKey = (typeof PRESENCE_DEF)[number]["key"];

const HEROES: Record<HeroKey, React.ComponentType> = {
  breach: dynamic(() => import("@/components/mythic/heroes/HeroBreach"), { ssr: false }),
  schematic: dynamic(() => import("@/components/mythic/heroes/HeroSchematic"), { ssr: false }),
  overwatch: dynamic(() => import("@/components/mythic/heroes/HeroOverwatch"), { ssr: false }),
};

const PRESENCE: Record<Exclude<PresenceKey, "none">, React.ComponentType> = {
  chip: dynamic(() => import("@/components/LivePresence"), { ssr: false }),
  ticker: dynamic(() => import("@/components/mythic/presence/PresenceTicker"), { ssr: false }),
  orbital: dynamic(() => import("@/components/mythic/presence/PresenceOrbital"), { ssr: false }),
  hud: dynamic(() => import("@/components/mythic/presence/PresenceHud"), { ssr: false }),
};

export default function HeroLab() {
  const [ready, setReady] = useState(false);
  const [hero, setHero] = useState(0);
  const [presence, setPresence] = useState(0);
  const [run, setRun] = useState(0); // bump to remount the hero -> replay entrance

  useEffect(() => {
    // heroes gate their entrance on the boot signal; in the lab we're always booted
    document.documentElement.classList.add("is-booted");
    setReady(true);

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= HEROES_DEF.length) {
        setHero(n - 1);
        setRun((r) => r + 1);
        return;
      }
      const pIdx = ["q", "w", "e", "t", "o"].indexOf(e.key.toLowerCase());
      if (pIdx >= 0 && pIdx < PRESENCE_DEF.length) {
        setPresence(pIdx);
        return;
      }
      if (e.key === "ArrowRight") {
        setHero((i) => (i + 1) % HEROES_DEF.length);
        setRun((r) => r + 1);
      } else if (e.key === "ArrowLeft") {
        setHero((i) => (i - 1 + HEROES_DEF.length) % HEROES_DEF.length);
        setRun((r) => r + 1);
      } else if (e.key.toLowerCase() === "r") {
        setRun((r) => r + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ActiveHero = HEROES[HEROES_DEF[hero].key];
  const presenceKey = PRESENCE_DEF[presence].key;
  const ActivePresence = presenceKey === "none" ? null : PRESENCE[presenceKey];

  return (
    <main className="relative min-h-[100svh] bg-bg text-text">
      {/* no Chrome on this page: restore the native cursor */}
      <style>{`body{cursor:auto}`}</style>
      <div className="grain" />

      {ready && <ActiveHero key={`${HEROES_DEF[hero].key}-${run}`} />}
      {ready && ActivePresence && <ActivePresence key={presenceKey} />}

      {/* switcher */}
      <div className="fixed inset-x-0 bottom-5 z-[990] flex justify-center px-4">
        <div className="flex max-w-full flex-col items-center gap-1 rounded-lg border border-line bg-bg-soft/85 p-1.5 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span className="px-2 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint">hero</span>
            {HEROES_DEF.map((v, i) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  setHero(i);
                  setRun((r) => r + 1);
                }}
                title={v.sub}
                className={`rounded px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.14em] transition-colors duration-200 ${
                  i === hero ? "bg-accent text-bg" : "text-muted hover:bg-white/5 hover:text-text"
                }`}
              >
                {String(i + 1).padStart(2, "0")} {v.label}
              </button>
            ))}
            <span className="hidden px-2 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint md:inline">
              1–3 · R replay
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span className="px-2 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint">link</span>
            {PRESENCE_DEF.map((v, i) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setPresence(i)}
                title={v.sub}
                className={`rounded px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.14em] transition-colors duration-200 ${
                  i === presence ? "bg-accent2 text-text" : "text-muted hover:bg-white/5 hover:text-text"
                }`}
              >
                {v.label}
              </button>
            ))}
            <span className="hidden px-2 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint md:inline">
              Q/W/E/T/O
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
