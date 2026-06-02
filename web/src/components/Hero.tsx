"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ThreeScene from "./ThreeScene";

const NAME_FIRST = "Uday Pratap";
const NAME_LAST = "Singh Parihar";

function Name() {
  return (
    <>
      {NAME_FIRST}
      <br />
      <span className="text-stroke">{NAME_LAST}</span>
    </>
  );
}

/* Hero — variation 08 "Glitch": RGB-split name tearing over a particle tunnel. */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gl-line", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out", delay: 0.5 });
      gsap.from(".gl-fade", { opacity: 0, y: 18, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.7 });

      const tear = (sel: string, dx: number) => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, delay: 1.6 });
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

  return (
    <section ref={root} id="hero" className="relative h-[100svh] min-h-[640px] overflow-hidden">
      <ThreeScene mode="tunnel" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      {/* scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[.05]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)" }}
      />

      <div className="pointer-events-none relative z-[2] flex h-full flex-col justify-end gap-6 pad-x pb-[clamp(2rem,6vh,5rem)]">
        <div className="gl-fade flex flex-wrap items-center gap-[.8rem] font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.25em] text-muted">
          <span>Full-Stack</span>
          <i className="not-italic text-accent">·</i>
          <span>RPA &amp; Automation</span>
          <i className="not-italic text-accent">·</i>
          <span>Reverse Engineering</span>
        </div>

        <div className="relative font-display text-[clamp(2.8rem,11vw,11rem)] font-bold leading-[.86] tracking-[-.03em]">
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

        <div className="mt-2 flex flex-wrap items-end justify-between gap-8">
          <p className="gl-fade pointer-events-auto max-w-[42ch] text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">
            I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools
            that thrive where the documentation runs out.
          </p>
          <div className="gl-fade pointer-events-auto flex gap-8 font-display text-[.85rem] tracking-[.05em]">
            <span>Indore, India</span>
            <span id="clock" className="text-accent">—</span>
          </div>
        </div>
      </div>
    </section>
  );
}
