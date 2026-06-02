"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, NAME_FIRST, NAME_LAST, TAGLINE } from "./shared";
import MetaRow from "./MetaRow";

/** 07 — Tilt: a glass hero card with parallax layers tilting toward the cursor. */
export default function V07Tilt() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".tilt-card", { y: 40, opacity: 0, scale: 0.96, duration: 1, ease: "power4.out" });
      gsap.from(".tilt-in", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.25 });

      const card = root.current!.querySelector(".tilt-card") as HTMLElement;
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
      gsap.set(card, { transformPerspective: 900, transformOrigin: "center" });
      const layers = gsap.utils.toArray<HTMLElement>(".tilt-layer");
      const lx = layers.map((l) => gsap.quickTo(l, "x", { duration: 0.7, ease: "power3" }));
      const ly = layers.map((l) => gsap.quickTo(l, "y", { duration: 0.7, ease: "power3" }));

      const onMove = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        ry(px * 9);
        rx(-py * 9);
        layers.forEach((_, i) => {
          const depth = (i + 1) * 8;
          lx[i](px * depth);
          ly[i](py * depth);
        });
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent2/20 blur-[120px]" />
      <div className="tilt-card relative w-full max-w-[760px] rounded-3xl border border-line bg-[#0d0d12]/70 p-[clamp(1.6rem,4vw,3.2rem)] shadow-2xl backdrop-blur-md">
        <div className="tilt-layer tilt-in flex flex-wrap items-center gap-3 font-display text-[clamp(.65rem,1.3vw,.85rem)] uppercase tracking-[.25em] text-muted">
          {TAGLINE.map((t, i) => (
            <span key={t} className="flex items-center gap-3">
              {i > 0 && <i className="not-italic text-accent">·</i>}
              {t}
            </span>
          ))}
        </div>
        <h1 className="tilt-layer tilt-in mt-5 font-display text-[clamp(2.2rem,7.5vw,5.5rem)] font-semibold leading-[.9] tracking-[-.03em]">
          {NAME_FIRST}
          <br />
          <span className="text-stroke">{NAME_LAST}</span>
        </h1>
        <p className="tilt-layer tilt-in mt-6 max-w-[46ch] text-[clamp(.9rem,1.3vw,1.05rem)] text-muted">{INTRO}</p>
        <MetaRow className="tilt-layer tilt-in mt-7" />
      </div>
    </section>
  );
}
