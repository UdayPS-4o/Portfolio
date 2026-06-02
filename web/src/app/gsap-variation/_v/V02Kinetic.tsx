"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_WORDS, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 02 — Kinetic: centered name explodes in per-character, then floats forever. */
export default function V02Kinetic() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chars = gsap.utils.toArray<HTMLElement>(".kin-char");
      gsap.from(chars, {
        yPercent: 130,
        opacity: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: { each: 0.025, from: "start" },
      });
      gsap.to(chars, {
        y: (i) => (i % 2 ? -10 : 10),
        duration: 2.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.05, from: "center" },
        delay: 1,
      });
      gsap.from(".kin-fade", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.5 });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div className="kin-fade mb-8 flex flex-wrap justify-center gap-3 font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.3em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <h1 className="font-display text-[clamp(2.2rem,12vw,12rem)] font-semibold leading-[.82] tracking-[-.04em]">
        {NAME_WORDS.map((w, wi) => (
          <span key={w} className={`mx-[.1em] inline-block ${wi > 1 ? "text-stroke" : ""}`}>
            {w.split("").map((c, ci) => (
              <span key={ci} className="kin-char inline-block">
                {c}
              </span>
            ))}
          </span>
        ))}
      </h1>

      <p className="kin-fade mt-10 max-w-[46ch] text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
      <MetaRow className="kin-fade mt-8 justify-center" />
    </section>
  );
}
