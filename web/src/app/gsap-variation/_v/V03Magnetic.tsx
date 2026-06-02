"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

function Line({ text, stroke = false }: { text: string; stroke?: boolean }) {
  return (
    <span className={`block ${stroke ? "text-stroke" : ""}`}>
      {text.split(" ").map((w, wi) => (
        <span key={wi} className="mr-[.22em] inline-block whitespace-nowrap">
          {w.split("").map((c, ci) => (
            <span key={ci} className="mag-char inline-block">
              {c}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/** 03 — Magnetic: letters are pushed away from the cursor in real time. */
export default function V03Magnetic() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".mag-char", { yPercent: 120, opacity: 0, duration: 0.8, ease: "power4.out", stagger: 0.02 });
      gsap.from(".mag-fade", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.4 });

      const chars = gsap.utils.toArray<HTMLElement>(".mag-char");
      const move = chars.map((c) => ({
        x: gsap.quickTo(c, "x", { duration: 0.5, ease: "power3" }),
        y: gsap.quickTo(c, "y", { duration: 0.5, ease: "power3" }),
      }));
      const radius = 220;
      const onMove = (e: PointerEvent) => {
        chars.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < radius) {
            const f = (1 - dist / radius) * 36;
            move[i].x(-(dx / dist) * f);
            move[i].y(-(dy / dist) * f);
          } else {
            move[i].x(0);
            move[i].y(0);
          }
        });
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,6rem)]"
    >
      <div className="mag-fade flex flex-wrap items-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.25em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <h1 className="mt-6 font-display text-[clamp(2.6rem,11vw,11rem)] font-medium leading-[.88] tracking-[-.03em]">
        <Line text={NAME_FIRST} />
        <Line text={NAME_LAST} stroke />
      </h1>

      <div className="mt-8 flex max-w-[44ch] flex-col gap-6">
        <p className="mag-fade text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="mag-fade" />
      </div>

      <span className="mag-fade pointer-events-none absolute bottom-6 right-6 hidden font-mono text-[.7rem] text-faint md:block">
        move your cursor through the name
      </span>
    </section>
  );
}
