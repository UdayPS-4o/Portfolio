"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LivePresence from "@/components/LivePresence";
import ThreeScene from "./_v/ThreeScene";
import { VARIATIONS } from "./_v";

export default function GsapVariationPage() {
  const [idx, setIdx] = useState(0);
  const count = VARIATIONS.length;
  const go = useCallback((n: number) => setIdx(((n % count) + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (/^[1-9]$/.test(e.key)) go(Number(e.key) - 1);
      else if (e.key === "0") go(9);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go]);

  const current = VARIATIONS[idx];
  const Active = current.Component;

  return (
    <main className="relative min-h-[100svh] cursor-auto overflow-hidden bg-bg text-text">
      {/* shared 3D particle backdrop — mode changes per variation */}
      <ThreeScene mode={current.three} className="fixed inset-0 z-0 h-full w-full" />

      {/* active hero variation — keyed so its GSAP intro replays on switch */}
      <div key={idx} className="relative z-10">
        <Active />
      </div>

      {/* top control bar */}
      <header className="fixed left-1/2 top-4 z-[600] flex max-w-[94vw] -translate-x-1/2 flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-line bg-[#0b0b0f]/85 px-2 py-2 font-display backdrop-blur">
          <button
            onClick={() => go(idx - 1)}
            aria-label="Previous"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text"
          >
            ‹
          </button>
          <div className="flex items-center gap-1">
            {VARIATIONS.map((v, i) => (
              <button
                key={v.id}
                onClick={() => go(i)}
                title={v.title}
                className={`h-8 min-w-8 rounded-full px-2 text-[.78rem] tabular-nums transition-colors ${
                  i === idx ? "bg-accent text-black" : "text-muted hover:bg-white/10 hover:text-text"
                }`}
              >
                {v.id}
              </button>
            ))}
          </div>
          <button
            onClick={() => go(idx + 1)}
            aria-label="Next"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-3 text-center font-display text-[.74rem] text-muted">
          <span className="text-accent">
            {String(current.id).padStart(2, "0")} · {current.title}
          </span>
          <span className="hidden text-faint sm:inline">{current.blurb}</span>
          <Link href="/" className="text-faint underline-offset-2 hover:text-text hover:underline">
            ← site
          </Link>
        </div>
      </header>

      {/* persistent live presence + chat (single connection for all variations) */}
      <LivePresence />
    </main>
  );
}
