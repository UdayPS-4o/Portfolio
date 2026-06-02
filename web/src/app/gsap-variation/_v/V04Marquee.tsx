"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, NAME_FULL } from "./shared";
import MetaRow from "./MetaRow";

const ROWS = 6;

/** 04 — Marquee wall: endless scrolling name behind a crisp foreground title. */
export default function V04Marquee() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".mq-row").forEach((row, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        gsap.fromTo(
          row,
          { xPercent: dir < 0 ? 0 : -50 },
          { xPercent: dir < 0 ? -50 : 0, duration: 22 + i * 5, ease: "none", repeat: -1 }
        );
      });
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from(".mq-fg .inner", { yPercent: 120, duration: 1, stagger: 0.12 })
        .from(".mq-fade", { y: 20, opacity: 0, duration: 0.8, stagger: 0.12 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 flex flex-col justify-center gap-1 opacity-[.05]">
        {Array.from({ length: ROWS }).map((_, i) => (
          <div key={i} className="mq-row flex w-max whitespace-nowrap text-[7vw] font-bold uppercase tracking-tight">
            <span className="px-4">{`${NAME_FULL} · `.repeat(6)}</span>
            <span className="px-4">{`${NAME_FULL} · `.repeat(6)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center text-center">
        <h1 className="mq-fg font-display text-[clamp(2.6rem,11vw,11rem)] font-semibold leading-[.85] tracking-[-.03em]">
          <span className="hero-line">
            <span className="inner block">{NAME_FIRST}</span>
          </span>
          <span className="hero-line text-stroke">
            <span className="inner block">{NAME_LAST}</span>
          </span>
        </h1>
        <p className="mq-fade mt-8 max-w-[44ch] text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="mq-fade mt-7 justify-center" />
      </div>
    </section>
  );
}
