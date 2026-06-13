"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";

type Cap = {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
};

const CAPS: Cap[] = [
  {
    id: "01",
    title: "Product Engineering",
    summary: "architecture to the last bug fix — web, mobile, backend",
    body: "End-to-end features across web and mobile with Next.js, React Native and Node — taken from architecture and data modeling all the way to the last bug fix before release.",
    tags: ["Next.js", "React Native", "Node.js", "Data modeling"],
  },
  {
    id: "02",
    title: "Automation & RPA",
    summary: "hundreds of parallel sessions, built for demand spikes",
    body: "High-concurrency systems that generate accounts, monitor live state and act in real time. Built to stay fast and reliable under hundreds of parallel sessions and sudden demand spikes.",
    tags: ["Puppeteer", "Appium", "Concurrency", "Live monitoring"],
  },
  {
    id: "03",
    title: "Reverse Engineering",
    summary: "where the only documentation is the wire",
    body: "API and Android reverse engineering: traffic interception, payload decryption, protocol reconstruction. Integrations built where no public API exists and the only documentation is the wire.",
    tags: ["Burp Suite", "Frida", "SSL proxying", "Protocol recon"],
  },
  {
    id: "04",
    title: "LLM & Agentic Systems",
    summary: "agents wired against real data, returning useful output",
    body: "Agentic workflows that orchestrate LLMs against real data sources and return genuinely useful output — text, charts and structured responses wired into the rest of the product.",
    tags: ["Dify", "LLM orchestration", "Structured output", "Charts"],
  },
];

const GHOST_OPACITY = 0.07;

export default function Capabilities() {
  const rootRef = useRef<HTMLElement | null>(null);
  const bodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const ghostRefs = useRef<Array<HTMLDivElement | null>>([]);
  const drift = useRef<Array<gsap.core.Tween | null>>([]);
  const reduced = useRef(false);
  const canHover = useRef(false);
  const prevOpen = useRef<number | null>(null);
  const [open, setOpen] = useState(0); // first row starts open; -1 = all closed (touch)

  const startDrift = useCallback((i: number) => {
    const g = ghostRefs.current[i];
    if (!g || drift.current[i]) return;
    drift.current[i] = gsap.fromTo(
      g,
      { xPercent: -5 },
      { xPercent: 5, duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true }
    );
  }, []);

  const stopDrift = useCallback((i: number) => {
    drift.current[i]?.kill();
    drift.current[i] = null;
  }, []);

  /* initial states — set from JS only, so the page reads fine without it */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    reduced.current = prefersReduced();
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const ctx = gsap.context(() => {
      bodyRefs.current.forEach((b, i) => {
        if (b) gsap.set(b, { height: i === 0 ? "auto" : 0 });
      });
      ghostRefs.current.forEach((g, i) => {
        if (g) gsap.set(g, { scale: 1.4, xPercent: -5, opacity: i === 0 && !reduced.current ? GHOST_OPACITY : 0 });
      });
      if (!reduced.current) startDrift(0);
    }, root);

    return () => {
      drift.current.forEach((t) => t?.kill());
      drift.current = [];
      const els: Element[] = [];
      bodyRefs.current.forEach((b) => {
        if (b) {
          els.push(b);
          if (b.firstElementChild) els.push(b.firstElementChild);
        }
      });
      ghostRefs.current.forEach((g) => {
        if (g) els.push(g);
      });
      if (els.length) gsap.killTweensOf(els);
      ctx.revert();
    };
  }, [startDrift]);

  /* open/close choreography */
  useEffect(() => {
    const prev = prevOpen.current;
    prevOpen.current = open;
    if (prev === null || prev === open) return;

    const animate = (i: number, show: boolean) => {
      const b = bodyRefs.current[i];
      const g = ghostRefs.current[i];
      if (b) {
        if (reduced.current) {
          gsap.set(b, { height: show ? "auto" : 0 });
        } else if (show) {
          gsap.to(b, {
            height: "auto",
            duration: 0.5,
            ease: "expo.out",
            overwrite: "auto",
            onComplete: () => gsap.set(b, { height: "auto" }), // resize-proof
          });
          const inner = b.firstElementChild;
          if (inner) {
            gsap.fromTo(
              inner,
              { y: 16, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.55, ease: "power3.out", delay: 0.06, overwrite: "auto" }
            );
          }
        } else {
          gsap.to(b, { height: 0, duration: 0.45, ease: "expo.inOut", overwrite: "auto" });
        }
      }
      if (g && !reduced.current) {
        if (show) {
          gsap.to(g, { opacity: GHOST_OPACITY, duration: 0.6, ease: "power2.out", overwrite: "auto" });
          startDrift(i);
        } else {
          stopDrift(i);
          gsap.to(g, { opacity: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
        }
      }
    };

    if (prev >= 0) animate(prev, false);
    if (open >= 0) animate(open, true);
  }, [open, startDrift, stopDrift]);

  const onRowEnter = (i: number) => {
    if (canHover.current) setOpen(i);
  };
  const onTriggerFocus = (i: number) => {
    if (canHover.current) setOpen(i);
  };
  const onToggle = (i: number) => {
    // desktop: hover/focus owns the open state, click never collapses;
    // touch: tap-to-toggle accordion
    setOpen((p) => (p === i ? (canHover.current ? i : -1) : i));
  };

  return (
    <section
      id="capabilities"
      ref={rootRef}
      data-section-name="02 / CAPABILITIES"
      className="relative pad-x py-[clamp(5rem,14vh,11rem)]"
    >
      <SectionHeading index="02" title="CAPABILITIES" sub="areas of focus" />

      <div className="mt-[clamp(3rem,7vh,5.5rem)]">
        {CAPS.map((c, i) => {
          const isOpen = open === i;
          return (
            <article
              key={c.id}
              data-cursor="hover"
              data-reveal
              onMouseEnter={() => onRowEnter(i)}
              className={`relative overflow-hidden border-t border-line transition-colors duration-500 ease-ease motion-reduce:transition-none ${
                i === CAPS.length - 1 ? "border-b" : ""
              } ${isOpen ? "bg-bg-soft" : "bg-transparent"}`}
            >
              {/* ghost outline word drifting behind the row */}
              <div
                ref={(el) => {
                  ghostRefs.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center opacity-0"
              >
                <span className="text-stroke whitespace-nowrap font-display text-[clamp(5rem,15vw,13rem)] font-bold leading-none tracking-[-.04em]">
                  {c.title}
                </span>
              </div>

              <h3 className="relative z-[1] m-0">
                <button
                  type="button"
                  id={`mcap-trigger-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`mcap-panel-${i}`}
                  onClick={() => onToggle(i)}
                  onFocus={() => onTriggerFocus(i)}
                  className="grid w-full grid-cols-[2.4rem_minmax(0,1fr)_auto] items-baseline gap-x-[clamp(.9rem,2.5vw,2rem)] py-[clamp(1.5rem,3.5vw,2.6rem)] text-left outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/70 md:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
                >
                  <span
                    className={`font-mono text-[.7rem] tracking-[.18em] transition-colors duration-300 motion-reduce:transition-none ${
                      isOpen ? "text-accent" : "text-faint"
                    }`}
                  >
                    /{c.id}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block font-display text-[clamp(1.8rem,4.5vw,4rem)] font-bold leading-[1.02] tracking-[-.03em] transition-colors duration-300 motion-reduce:transition-none ${
                        isOpen ? "text-text" : "text-text/75"
                      }`}
                    >
                      {c.title}
                    </span>
                    <span className="mt-2.5 block font-mono text-[.62rem] uppercase tracking-[.18em] text-muted">
                      {c.summary}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`self-center justify-self-end font-mono text-[clamp(1.1rem,2vw,1.5rem)] transition-all duration-[450ms] ease-ease motion-reduce:transition-none ${
                      isOpen ? "rotate-45 text-accent" : "rotate-0 text-muted"
                    }`}
                  >
                    -&gt;
                  </span>
                </button>
              </h3>

              {/* collapsible interrogation record */}
              <div
                id={`mcap-panel-${i}`}
                role="region"
                aria-labelledby={`mcap-trigger-${i}`}
                aria-hidden={!isOpen}
                ref={(el) => {
                  bodyRefs.current[i] = el;
                }}
                className="relative z-[1] overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-x-[clamp(.9rem,2.5vw,2rem)] pb-[clamp(1.6rem,3.5vw,2.6rem)] md:grid-cols-[4.5rem_minmax(0,1fr)]">
                  <span aria-hidden="true" className="hidden md:block" />
                  <div className="max-w-[62ch]">
                    <p className="text-[clamp(.95rem,1.3vw,1.1rem)] leading-relaxed text-muted">{c.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {c.tags.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-line px-3 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-muted"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
