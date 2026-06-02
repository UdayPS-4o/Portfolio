"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_WORDS, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 06 — Clip reveal: each word wipes in behind a sweeping accent bar. */
export default function V06Clip() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });
      gsap.utils.toArray<HTMLElement>(".clip-word").forEach((w, i) => {
        const bar = w.querySelector(".clip-bar");
        const txt = w.querySelector(".clip-txt");
        tl.set(txt, { clipPath: "inset(0 100% 0 0)" }, i * 0.18)
          .fromTo(bar, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.35 }, i * 0.18)
          .set(txt, { clipPath: "inset(0 0% 0 0)" }, i * 0.18 + 0.35)
          .to(bar, { scaleX: 0, transformOrigin: "right center", duration: 0.4 }, i * 0.18 + 0.35);
      });
      tl.from(".clip-fade", { y: 20, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }, "-=0.3");
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,6rem)]"
    >
      <div className="clip-fade flex flex-wrap items-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.25em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <h1 className="mt-6 font-display text-[clamp(2.6rem,12vw,12rem)] font-semibold leading-[.84] tracking-[-.03em]">
        <span className="flex flex-wrap gap-x-[.25em]">
          {NAME_WORDS.map((w, i) => (
            <span key={w} className={`clip-word relative inline-block ${i > 1 ? "text-stroke" : ""}`}>
              <span className="clip-txt inline-block">{w}</span>
              <span className="clip-bar absolute inset-0 bg-accent" />
            </span>
          ))}
        </span>
      </h1>

      <div className="mt-8 flex max-w-[44ch] flex-col gap-6">
        <p className="clip-fade text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="clip-fade" />
      </div>
    </section>
  );
}
