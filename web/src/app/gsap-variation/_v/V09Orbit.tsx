"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 09 — Orbit: centered name inside the 3D particle rings (provided by ThreeScene). */
export default function V09Orbit() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.2, defaults: { ease: "power4.out" } })
        .from(".orb-name .inner", { yPercent: 120, duration: 1, stagger: 0.12 })
        .from(".orb-fade", { y: 20, opacity: 0, duration: 0.8, stagger: 0.12 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden px-6">
      <div className="flex flex-col items-center text-center">
        <div className="orb-fade mb-7 flex flex-wrap justify-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.3em] text-muted">
          {TAGLINE.map((t, i) => (
            <span key={t} className="flex items-center gap-3">
              {i > 0 && <i className="not-italic text-accent">·</i>}
              {t}
            </span>
          ))}
        </div>
        <h1 className="orb-name font-display text-[clamp(2.4rem,9vw,9rem)] font-semibold leading-[.86] tracking-[-.03em]">
          <span className="hero-line">
            <span className="inner block">{NAME_FIRST}</span>
          </span>
          <span className="hero-line text-stroke">
            <span className="inner block">{NAME_LAST}</span>
          </span>
        </h1>
        <p className="orb-fade mt-8 max-w-[42ch] text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="orb-fade mt-7 justify-center" />
      </div>
    </section>
  );
}
