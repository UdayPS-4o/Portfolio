"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";

type Group = {
  id: string;
  title: string;
  items: string[];
  /** decorative glyph inserted AFTER the item at this index */
  decos: Record<number, string>;
};

const GROUPS: Group[] = [
  {
    id: "A",
    title: "RPA, Automation & RE",
    items: [
      "RPA / Bot Frameworks",
      "API / Android Reverse Engineering",
      "Puppeteer",
      "Appium",
      "SSL Proxying",
      "Burp Suite",
      "Frida",
      "Dify",
    ],
    decos: { 2: "//", 5: "0x" },
  },
  {
    id: "B",
    title: "Frontend",
    items: ["React", "Next.js", "TypeScript", "Tailwind", "React Native"],
    decos: { 1: "::" },
  },
  {
    id: "C",
    title: "Backend & DB",
    items: ["Node.js", "Python", "PHP", "PostgreSQL", "MongoDB"],
    decos: { 2: "0x" },
  },
  {
    id: "D",
    title: "Cloud & Infra",
    items: [
      "GCP · Compute · Cloud Run",
      "AWS · ECS · Lambda",
      "Docker",
      "CI / CD Pipelines",
      "Nginx · Reverse Proxy",
      "Linux · VPS Ops",
    ],
    decos: { 1: "//", 4: "::" },
  },
];

const RADIUS = 180; // px — proximity field radius
const PULL = 6; // px — max translate toward cursor

type ChipNode = {
  el: HTMLElement;
  setX: (v: number) => void;
  setY: (v: number) => void;
  cx: number; // chip center, page coords (scroll-independent)
  cy: number;
  x: number; // current translate
  y: number;
  p: number; // current proximity 0..1
  idle: boolean;
};

export default function Skills() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const reduced = prefersReduced();
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    let io: IntersectionObserver | null = null;
    let tick: (() => void) | null = null;
    let tickerOn = false;
    let unRefresh: (() => void) | null = null;
    const listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];
    const on = (t: EventTarget, e: string, fn: EventListenerOrEventListenerObject) => {
      t.addEventListener(e, fn);
      listeners.push([t, e, fn]);
    };

    const ctx = gsap.context(() => {
      const pops = Array.from(root.querySelectorAll<HTMLElement>(".msk-pop"));
      const chips = Array.from(root.querySelectorAll<HTMLElement>(".msk-chip"));

      /* ---------- entrance ---------- */
      if (reduced) {
        gsap.set(pops, { opacity: 0 });
        ScrollTrigger.batch(pops, {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.02 }),
        });
        return; // no proximity, no ripple
      }

      // scale-only pop: transforms stay centered, so proximity-field center
      // caching (below) remains exact even if it runs mid-entrance.
      gsap.set(pops, { opacity: 0, scale: 0.6 });
      ScrollTrigger.batch(pops, {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "back.out(1.8)",
            stagger: 0.035,
            overwrite: "auto",
          }),
      });

      /* ---------- touch: ripple-highlight wave per group ---------- */
      if (touch) {
        root.querySelectorAll<HTMLElement>(".msk-group").forEach((group) => {
          const groupChips = group.querySelectorAll<HTMLElement>(".msk-chip");
          ScrollTrigger.create({
            trigger: group,
            start: "top 70%",
            once: true,
            onEnter: () => {
              gsap.to(groupChips, {
                keyframes: [
                  {
                    borderColor: "rgba(204,255,61,.75)",
                    color: "#ccff3d",
                    boxShadow: "0 0 16px rgba(204,255,61,.22)",
                    duration: 0.3,
                    ease: "power2.in",
                  },
                  {
                    borderColor: "rgba(255,255,255,.10)",
                    color: "#8a8a93",
                    boxShadow: "0 0 0px rgba(204,255,61,0)",
                    duration: 0.9,
                    ease: "power2.out",
                  },
                ],
                stagger: 0.06,
                delay: 0.3,
                onComplete: () => {
                  gsap.set(groupChips, { clearProps: "borderColor,color,boxShadow" });
                },
              });
            },
          });
        });
        return;
      }

      /* ---------- desktop pointer: proximity field ---------- */
      const nodes: ChipNode[] = chips.map((el) => ({
        el,
        setX: gsap.quickSetter(el, "x", "px") as (v: number) => void,
        setY: gsap.quickSetter(el, "y", "px") as (v: number) => void,
        cx: 0,
        cy: 0,
        x: 0,
        y: 0,
        p: 0,
        idle: true,
      }));

      let mx = 0;
      let my = 0;
      let inside = false;
      let dirty = true;

      // Page-coord centers: stable under scroll, recached on resize/refresh.
      const cache = () => {
        dirty = false;
        const sx = window.scrollX;
        const sy = window.scrollY;
        for (const n of nodes) {
          const r = n.el.getBoundingClientRect();
          n.cx = r.left + r.width / 2 - n.x + sx;
          n.cy = r.top + r.height / 2 - n.y + sy;
        }
      };

      tick = () => {
        if (dirty) cache();
        const sx = window.scrollX;
        const sy = window.scrollY;
        for (const n of nodes) {
          let tp = 0;
          let tx = 0;
          let ty = 0;
          if (inside) {
            const dx = mx - (n.cx - sx);
            const dy = my - (n.cy - sy);
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              tp = 1 - d / RADIUS;
              const f = (PULL * tp) / (d || 1);
              tx = dx * f;
              ty = dy * f;
            }
          }
          const l = tp > n.p ? 0.18 : 0.12; // approach fast, relax slow
          n.p += (tp - n.p) * l;
          n.x += (tx - n.x) * l;
          n.y += (ty - n.y) * l;

          if (n.p < 0.005 && Math.abs(n.x) < 0.05 && Math.abs(n.y) < 0.05) {
            if (!n.idle) {
              n.idle = true;
              n.p = 0;
              n.x = 0;
              n.y = 0;
              n.setX(0);
              n.setY(0);
              n.el.style.borderColor = "";
              n.el.style.color = "";
              n.el.style.boxShadow = "";
            }
            continue;
          }

          n.idle = false;
          const p = n.p;
          n.setX(n.x);
          n.setY(n.y);
          // line rgba(255,255,255,.1) -> accent #ccff3d / muted #8a8a93 -> accent
          n.el.style.borderColor = `rgba(${Math.round(255 - 51 * p)},255,${Math.round(255 - 194 * p)},${(0.1 + 0.75 * p).toFixed(3)})`;
          n.el.style.color = `rgb(${Math.round(138 + 66 * p)},${Math.round(138 + 117 * p)},${Math.round(147 - 86 * p)})`;
          n.el.style.boxShadow = `0 0 ${(22 * p).toFixed(1)}px rgba(204,255,61,${(0.28 * p).toFixed(3)})`;
        }
      };

      const start = () => {
        if (!tickerOn && tick) {
          gsap.ticker.add(tick);
          tickerOn = true;
        }
      };
      const stop = () => {
        if (tickerOn && tick) {
          gsap.ticker.remove(tick);
          tickerOn = false;
        }
      };

      io = new IntersectionObserver(
        (entries) => {
          const visible = entries[0]?.isIntersecting ?? false;
          if (visible) {
            dirty = true;
            start();
          } else {
            stop();
          }
        },
        { rootMargin: "160px 0px" }
      );
      io.observe(root);

      on(root, "pointermove", ((e: PointerEvent) => {
        mx = e.clientX;
        my = e.clientY;
        inside = true;
      }) as EventListener);
      on(root, "pointerleave", () => {
        inside = false;
      });
      on(window, "resize", () => {
        dirty = true;
      });

      const markDirty = () => {
        dirty = true;
      };
      ScrollTrigger.addEventListener("refresh", markDirty);
      unRefresh = () => ScrollTrigger.removeEventListener("refresh", markDirty);
    }, root);

    return () => {
      io?.disconnect();
      if (tick && tickerOn) gsap.ticker.remove(tick);
      listeners.forEach(([t, e, fn]) => t.removeEventListener(e, fn));
      unRefresh?.();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="skills"
      ref={rootRef}
      data-section-name="05 / SKILLS"
      className="relative pad-x py-[clamp(5rem,14vh,11rem)]"
    >
      <SectionHeading index="05" title="SKILLS" sub="tools & technologies" />

      <div className="mt-[clamp(3rem,7vh,5.5rem)] flex flex-col gap-[clamp(3rem,7vh,5rem)]">
        {GROUPS.map((g) => (
          <div
            key={g.id}
            className="msk-group grid grid-cols-1 gap-5 border-t border-line pt-6 md:grid-cols-[230px_1fr] md:gap-10 md:pt-8"
          >
            <header className="flex items-baseline gap-3" data-reveal>
              <span className="font-mono text-[.65rem] tracking-[.18em] text-accent">[{g.id}]</span>
              <h3 className="font-mono text-[.68rem] font-medium uppercase tracking-[.22em] text-muted">{g.title}</h3>
            </header>

            <ul aria-label={g.title} className="flex flex-wrap items-center gap-2.5 md:gap-3">
              {g.items.map((it, i) => (
                <Fragment key={it}>
                  <li className="msk-chip msk-pop whitespace-nowrap rounded-full border border-line px-4 py-2 font-mono text-sm text-muted max-md:px-3.5 max-md:text-[.8rem]">
                    {it}
                  </li>
                  {g.decos[i] ? (
                    <li
                      aria-hidden="true"
                      className="msk-pop select-none px-1.5 py-2 font-mono text-sm text-faint"
                    >
                      {g.decos[i]}
                    </li>
                  ) : null}
                </Fragment>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .msk-chip { will-change: transform; }
        }
      `}</style>
    </section>
  );
}
