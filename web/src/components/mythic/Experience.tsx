"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/mythic/SectionHeading";
import { scramble } from "@/lib/mythic/text";
import { prefersReduced } from "@/lib/mythic/motion";

type Entry = {
  hex: string;
  stamp: string;
  role: string;
  company: string;
  meta: string;
  body: string;
  points: string[];
  tags: string[];
};

const ENTRIES: Entry[] = [
  {
    hex: "0x00",
    stamp: "[2023–25]",
    role: "Founding Engineer",
    company: "Delivo",
    meta: "Mumbai, India · Jan 2023 — Feb 2025",
    body: "Founding engineer behind Delivo's logistics platform for international shipping — owned the stack end to end and turned messy, regulation-heavy operations into software a team could run their whole day on.",
    points: [
      "Designed the platform architecture and core operational workflows from zero.",
      "Built the client and warehouse dashboards that ran daily shipping operations.",
      "Integrated third-party systems and kept everything compliant with international shipping regulations.",
    ],
    tags: ["Architecture", "Dashboards", "Integrations", "Logistics"],
  },
  {
    hex: "0x01",
    stamp: "[2025]",
    role: "Software Engineer",
    company: "Tradyon",
    meta: "Bengaluru, India · May 2025 — Jul 2025",
    body: "Shipped end-to-end features for Tradyon's cross-platform AI chatbot — a Next.js web app and a React Native mobile app — improving its UX and reliability on both with a fast iteration cycle.",
    points: [
      "Built agentic workflows in Dify that orchestrated LLM calls against BigQuery-backed global trade data.",
      "Enabled rich responses with text, charts and graphs by wiring workflows into the app's data layer.",
      "Shipped production features and fixes across web and mobile without sacrificing code quality.",
    ],
    tags: ["Next.js", "React Native", "Dify", "BigQuery", "LLM"],
  },
];

type EntryState = {
  el: HTMLElement;
  stamp: HTMLElement | null;
  y: number;
  on: boolean;
  cancel: (() => void) | null;
};

export default function Experience() {
  const rootRef = useRef<HTMLElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    const trace = traceRef.current;
    const fill = fillRef.current;
    if (!root || !trace || !fill) return;

    const states: EntryState[] = [];

    const ctx = gsap.context(() => {
      const entryEls = Array.from(trace.querySelectorAll<HTMLElement>(".mxp-entry"));

      if (prefersReduced()) {
        // Static trace: full line, everything lit, no scramble / scrub.
        gsap.set(fill, { height: "100%" });
        entryEls.forEach((el) => el.classList.add("is-on"));
        return;
      }

      entryEls.forEach((el) =>
        states.push({
          el,
          stamp: el.querySelector<HTMLElement>(".mxp-stamp-text"),
          y: 0,
          on: false,
          cancel: null,
        })
      );

      let traceH = 1;

      const measure = () => {
        const tr = trace.getBoundingClientRect();
        traceH = Math.max(tr.height, 1);
        for (const s of states) {
          const node = s.el.querySelector<HTMLElement>(".mxp-node");
          const nr = (node ?? s.el).getBoundingClientRect();
          s.y = nr.top + nr.height / 2 - tr.top;
        }
      };

      // Flip entries exactly when the fill tip crosses their node.
      const apply = (progress: number) => {
        const tipY = progress * traceH;
        for (const s of states) {
          if (!s.on && tipY >= s.y) {
            s.on = true;
            s.el.classList.add("is-on");
            s.cancel?.();
            s.cancel = s.stamp ? scramble(s.stamp, { duration: 0.5 }) : null;
          } else if (s.on && tipY < s.y - 28) {
            s.on = false;
            s.el.classList.remove("is-on");
            s.cancel?.();
            s.cancel = null;
            if (s.stamp?.dataset.text) s.stamp.textContent = s.stamp.dataset.text;
          }
        }
      };

      gsap.fromTo(
        fill,
        { height: 0 },
        {
          height: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: trace,
            start: "top 72%",
            end: "bottom 70%",
            scrub: true,
            onRefresh: (self) => {
              measure();
              apply(self.progress);
            },
            onUpdate: (self) => apply(self.progress),
          },
        }
      );
    }, root);

    return () => {
      states.forEach((s) => s.cancel?.());
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="work"
      ref={rootRef}
      data-section-name="03 / EXPERIENCE"
      className="relative pad-x py-[clamp(5rem,14vh,11rem)]"
    >
      <SectionHeading index="03" label="EXPERIENCE" title="Where I’ve shipped" />

      <div ref={traceRef} className="mxp-trace mt-[clamp(3rem,9vh,6.5rem)]">
        {/* trace line + scrubbed accent fill + riding tip */}
        <div aria-hidden="true" className="mxp-line">
          <div ref={fillRef} className="mxp-fill">
            <span className="mxp-tip" />
          </div>
        </div>

        <ol className="mxp-entries flex flex-col gap-[clamp(6rem,30vh,20rem)] pt-[clamp(1.5rem,5vh,3.5rem)] pb-[clamp(3rem,9vh,7rem)]">
          {ENTRIES.map((e) => (
            <li key={e.company} className="mxp-entry" data-cursor="hover">
              <span aria-hidden="true" className="mxp-node" />

              <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2" data-reveal>
                <span aria-hidden="true" className="mxp-hex font-mono text-[.65rem] tracking-[.18em] text-faint">
                  {e.hex}
                </span>
                <span className="mxp-stamp inline-flex items-center border border-line bg-surface/50 px-3 py-1.5 font-mono text-[.7rem] tracking-[.14em] text-muted">
                  <span className="mxp-stamp-text">{e.stamp}</span>
                </span>
                <span className="font-mono text-[.65rem] uppercase tracking-[.18em] text-muted">{e.meta}</span>
              </div>

              <h3
                className="mt-5 font-display text-[clamp(1.9rem,4.2vw,3.4rem)] font-bold leading-[1.02] tracking-[-.025em]"
                data-reveal
              >
                {e.role} <span className="mxp-co">/ {e.company}</span>
              </h3>

              <p
                className="mt-5 max-w-[58ch] text-[clamp(.95rem,1.3vw,1.06rem)] leading-relaxed text-muted"
                data-reveal
                data-reveal-delay="0.08"
              >
                {e.body}
              </p>

              <ul className="mt-6 flex max-w-[60ch] flex-col gap-2.5">
                {e.points.map((p, j) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[clamp(.9rem,1.25vw,1rem)] leading-relaxed text-muted"
                    data-reveal
                    data-reveal-delay={`${(0.12 + j * 0.06).toFixed(2)}`}
                  >
                    <span aria-hidden="true" className="select-none pt-[.18em] font-mono text-[.72rem] text-accent/70">
                      &gt;
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <ul className="mt-7 flex flex-wrap gap-2.5" data-reveal data-reveal-delay="0.2">
                {e.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[.68rem] tracking-[.08em] text-muted"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </li>
          ))}

          {/* end-of-file marker — lights up when the trace completes */}
          <li aria-hidden="true" className="mxp-entry">
            <span className="mxp-node" />
            <span className="font-mono text-[.65rem] uppercase tracking-[.18em] text-faint">
              [EOF] · end of trace
            </span>
          </li>
        </ol>
      </div>

      <style>{`
        .mxp-trace { --mxp-x: 2px; --mxp-gap: 30px; position: relative; }
        @media (min-width: 768px) { .mxp-trace { --mxp-x: 118px; --mxp-gap: 64px; } }

        .mxp-line { position: absolute; top: 0; bottom: 0; left: var(--mxp-x); width: 1px; background: rgba(255,255,255,.10); }
        .mxp-fill { position: absolute; top: 0; left: 0; width: 100%; height: 0; background: var(--accent); box-shadow: 0 0 12px rgba(204,255,61,.35); }
        .mxp-tip { position: absolute; bottom: 0; left: 50%; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); transform: translate(-50%, 50%); box-shadow: 0 0 10px rgba(204,255,61,.6); }
        .mxp-tip::before { content: ""; position: absolute; inset: -7px; border-radius: 50%; border: 1px solid rgba(204,255,61,.45); animation: mxp-pulse 1.7s cubic-bezier(.22,1,.36,1) infinite; }
        @keyframes mxp-pulse { 0% { transform: scale(.45); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .mxp-tip::before { animation: none; opacity: 0; } }

        .mxp-entries { padding-left: calc(var(--mxp-x) + var(--mxp-gap)); }
        .mxp-entry { position: relative; }

        .mxp-node {
          position: absolute; top: .5rem; left: calc(-1 * var(--mxp-gap));
          width: 9px; height: 9px;
          transform: translateX(-50%) rotate(45deg);
          background: #17171c; border: 1px solid rgba(255,255,255,.22);
          transition: background-color .35s var(--ease), border-color .35s var(--ease), box-shadow .35s var(--ease);
        }
        .mxp-entry.is-on .mxp-node { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 14px rgba(204,255,61,.55); }

        .mxp-stamp { border-radius: 2px; transition: color .35s var(--ease), border-color .35s var(--ease); }
        .mxp-entry.is-on .mxp-stamp { color: var(--accent); border-color: rgba(204,255,61,.4); }

        .mxp-hex { line-height: 1; }
        @media (min-width: 768px) {
          .mxp-hex {
            position: absolute; top: 50%; left: calc(-1 * var(--mxp-gap));
            transform: translateX(calc(-100% - 18px)) translateY(-50%);
          }
        }

        .mxp-co {
          color: transparent;
          -webkit-text-stroke: 1px rgba(237,237,240,.45);
          transition: color .4s var(--ease), -webkit-text-stroke-color .4s var(--ease);
        }
        .mxp-entry:hover .mxp-co { color: var(--accent); -webkit-text-stroke-color: rgba(204,255,61,0); }
        @media (hover: none) {
          .mxp-entry.is-on .mxp-co { color: #ededf0; -webkit-text-stroke-color: rgba(237,237,240,0); }
        }
      `}</style>
    </section>
  );
}
