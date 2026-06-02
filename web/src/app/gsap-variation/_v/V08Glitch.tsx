"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 08 — Glitch: RGB-split name that tears on a loop over scanlines. */
export default function V08Glitch() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gl-line", { opacity: 0, y: 16, duration: 0.7, ease: "power3.out", stagger: 0.12 });
      gsap.from(".gl-fade", { opacity: 0, y: 18, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.4 });

      const tear = (sel: string, dx: number) => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 1 });
        for (let i = 0; i < 5; i++) {
          tl.to(sel, {
            x: gsap.utils.random(-dx, dx),
            clipPath: `inset(${gsap.utils.random(0, 70)}% 0 ${gsap.utils.random(0, 70)}% 0)`,
            duration: 0.07,
            ease: "none",
          });
        }
        tl.to(sel, { x: 0, clipPath: "inset(0% 0 0% 0)", duration: 0.1 });
      };
      tear(".gl-r", 6);
      tear(".gl-b", -6);
    }, root);
    return () => ctx.revert();
  }, []);
  const Name = () => (
    <>
      {NAME_FIRST}
      <br />
      <span className="text-stroke">{NAME_LAST}</span>
    </>
  );
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,6rem)]"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[.06]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)" }}
      />
      <div className="gl-fade flex flex-wrap items-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.3em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <div className="relative mt-6 font-display text-[clamp(2.4rem,11vw,11rem)] font-bold leading-[.86] tracking-[-.03em]">
        <h1 className="gl-line relative z-10">
          <Name />
        </h1>
        <h1 aria-hidden className="gl-r pointer-events-none absolute inset-0 z-0 text-accent3 mix-blend-screen">
          <Name />
        </h1>
        <h1 aria-hidden className="gl-b pointer-events-none absolute inset-0 z-0 text-accent2 mix-blend-screen">
          <Name />
        </h1>
      </div>

      <div className="mt-8 flex max-w-[44ch] flex-col gap-6">
        <p className="gl-fade text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="gl-fade" />
      </div>
    </section>
  );
}
