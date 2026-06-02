"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 01 — Aurora: drifting gradient haze with a clip-up name reveal. */
export default function V01Aurora() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".aur-1", { x: 90, y: -50, scale: 1.2, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".aur-2", { x: -80, y: 60, scale: 1.15, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".aur-3", { x: 50, y: 70, scale: 1.1, duration: 13, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from(".aur-tag", { y: 24, opacity: 0, duration: 0.7, stagger: 0.08 })
        .from(".aur-name .inner", { yPercent: 120, duration: 1.1, stagger: 0.12 }, "-=0.3")
        .from(".aur-foot", { y: 20, opacity: 0, duration: 0.8, stagger: 0.12 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,6rem)]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="aur-1 absolute left-[8%] top-[12%] h-[42vw] w-[42vw] rounded-full bg-accent2/30 blur-[120px]" />
        <div className="aur-2 absolute right-[6%] top-[18%] h-[34vw] w-[34vw] rounded-full bg-accent/20 blur-[120px]" />
        <div className="aur-3 absolute bottom-[4%] left-[28%] h-[36vw] w-[36vw] rounded-full bg-accent3/25 blur-[130px]" />
      </div>

      <div className="flex flex-wrap items-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.25em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="aur-tag flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <h1 className="aur-name mt-6 font-display text-[clamp(2.6rem,11vw,11rem)] font-medium leading-[.86] tracking-[-.03em]">
        <span className="hero-line">
          <span className="inner block">{NAME_FIRST}</span>
        </span>
        <span className="hero-line text-stroke">
          <span className="inner block">{NAME_LAST}</span>
        </span>
      </h1>

      <div className="mt-8 flex max-w-[44ch] flex-col gap-6">
        <p className="aur-foot text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="aur-foot" />
      </div>
    </section>
  );
}
