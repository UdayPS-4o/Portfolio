"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@/\\<>{}[]";

/** 10 — Scramble: the name decodes from random glyphs into place. */
export default function V10Scramble() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".scr-line").forEach((el, idx) => {
        const full = el.dataset.text || "";
        const obj = { p: 0 };
        gsap.to(obj, {
          p: 1,
          duration: 1.6,
          ease: "power2.out",
          delay: 0.2 + idx * 0.35,
          onUpdate: () => {
            const reveal = Math.floor(obj.p * full.length);
            let out = "";
            for (let i = 0; i < full.length; i++) {
              out += full[i] === " " ? " " : i < reveal ? full[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            el.textContent = out;
          },
          onComplete: () => {
            el.textContent = full;
          },
        });
      });
      gsap.from(".scr-fade", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 1.2 });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,6rem)]"
    >
      <div className="scr-fade flex flex-wrap items-center gap-3 font-mono text-[clamp(.7rem,1.3vw,.85rem)] uppercase tracking-[.25em] text-muted">
        {TAGLINE.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <i className="not-italic text-accent">·</i>}
            {t}
          </span>
        ))}
      </div>

      <h1 className="mt-6 font-display text-[clamp(2.6rem,11vw,11rem)] font-semibold leading-[.86] tracking-[-.03em]">
        <span className="scr-line block" data-text={NAME_FIRST}>
          {NAME_FIRST}
        </span>
        <span className="scr-line block text-stroke" data-text={NAME_LAST}>
          {NAME_LAST}
        </span>
      </h1>

      <div className="mt-8 flex max-w-[44ch] flex-col gap-6">
        <p className="scr-fade text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">{INTRO}</p>
        <MetaRow className="scr-fade" />
      </div>
    </section>
  );
}
