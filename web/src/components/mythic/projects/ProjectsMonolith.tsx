"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, type Project } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";
import { splitChars } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";

/**
 * VARIANT E — "MONOLITH"
 * Full-viewport vertical gallery. One project fills the screen at a time as an
 * image-dominant chapter with a bold entrance. No CSS scroll-snap (Lenis
 * conflict) and nothing is pinned — the "fills the screen" feel comes from
 * strong enter + slow scrubbed parallax. Detail lives inline behind a magnetic
 * "+ DETAILS" button; one panel open at a time, collapses on leaving the
 * chapter. Vertical scroll only. Tone is instrument/editorial: RESULT caption.
 *
 * All animation is self-driven (own gsap.context + ScrollTriggers); nothing
 * here depends on Chrome.tsx declarative attributes. Content is fully readable
 * with JS off — hidden/offset states are applied only from JS.
 */

const TOTAL = PROJECTS.length;
const PAD = String(TOTAL).padStart(2, "0");

/** initials for the missing-image glyph watermark (§0.4) */
function initials(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();
}

export default function ProjectsMonolith() {
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  // refs to the per-chapter detail panels so we can animate height/opacity
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);

  /* ---- inline detail panel: open one, close the rest (gsap height/opacity) ---- */
  const toggle = useCallback((i: number) => {
    setOpen((cur) => (cur === i ? null : i));
  }, []);

  useEffect(() => {
    const reduced = prefersReduced();
    panelRefs.current.forEach((panel, i) => {
      const inner = innerRefs.current[i];
      if (!panel || !inner) return;
      const isOpen = open === i;

      gsap.killTweensOf(panel);
      gsap.killTweensOf(inner);

      if (reduced) {
        gsap.set(panel, { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 });
        gsap.set(inner, { y: 0, opacity: isOpen ? 1 : 0 });
        return;
      }

      if (isOpen) {
        gsap.set(panel, { height: "auto" });
        const target = panel.offsetHeight;
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0 },
          {
            height: target,
            opacity: 1,
            duration: 0.55,
            ease: "expo.out",
            onComplete: () => gsap.set(panel, { height: "auto" }),
          },
        );
        gsap.fromTo(
          inner,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.12 },
        );
      } else {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.4,
          ease: "power3.inOut",
        });
        gsap.to(inner, { y: 8, opacity: 0, duration: 0.25, ease: "power2.in" });
      }
    });
    // height of the section changes — keep triggers honest
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  /* ---- entrance + scrubbed parallax (self-driven) ---- */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const removers: Array<() => void> = [];
    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      const chapters = Array.from(root.querySelectorAll<HTMLElement>(".pmn-chapter"));

      /* prep enter states from JS only (readable with JS off) */
      const prep = () => {
        chapters.forEach((ch) => {
          const titleEl = ch.querySelector<HTMLElement>(".pmn-title");
          const chars = titleEl ? splitChars(titleEl) : [];
          gsap.set(chars, { yPercent: 110 });
          gsap.set(ch.querySelector(".pmn-clip"), { clipPath: "inset(0% 0% 100% 0%)" });
          gsap.set(ch.querySelector(".pmn-img"), { scale: 1.12 });
          gsap.set(ch.querySelector(".pmn-numeral"), { yPercent: 40, opacity: 0 });
          gsap.set(ch.querySelectorAll<HTMLElement>(".pmn-fade"), { y: 16, opacity: 0 });
        });
      };

      /* desktop + motion: full entrance + scrubbed backdrop parallax */
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        prep();
        chapters.forEach((ch) => {
          const img = ch.querySelector<HTMLElement>(".pmn-img");
          const clip = ch.querySelector<HTMLElement>(".pmn-clip");
          const numeral = ch.querySelector<HTMLElement>(".pmn-numeral");
          const titleEl = ch.querySelector<HTMLElement>(".pmn-title");
          const chars = titleEl ? Array.from(titleEl.querySelectorAll<HTMLElement>(".mchar")) : [];

          // ENTER
          const tl = gsap.timeline({
            scrollTrigger: { trigger: ch, start: "top 70%", once: true },
          });
          if (clip) {
            tl.to(clip, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.0, ease: "expo.inOut" }, 0);
          }
          if (img) {
            tl.to(img, { scale: 1, duration: 1.2, ease: "expo.out" }, 0);
          }
          if (numeral) {
            tl.to(numeral, { yPercent: 0, opacity: 1, duration: 0.9, ease: "power4.out" }, 0.15);
          }
          if (chars.length) {
            tl.to(chars, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.02 }, 0.3);
          }
          tl.to(
            ch.querySelectorAll<HTMLElement>(".pmn-fade"),
            { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.06 },
            0.45,
          );

          // THROUGH — backdrop image parallaxes slowly + numeral drifts (transform only)
          if (img) {
            gsap.fromTo(
              img,
              { yPercent: -6 },
              {
                yPercent: 6,
                ease: "none",
                scrollTrigger: { trigger: ch, start: "top bottom", end: "bottom top", scrub: true },
              },
            );
          }
          if (numeral) {
            gsap.fromTo(
              numeral,
              { yPercent: 0 },
              {
                yPercent: -22,
                ease: "none",
                scrollTrigger: { trigger: ch, start: "top bottom", end: "bottom top", scrub: true },
              },
            );
          }
        });
      });

      /* mobile + motion: keep clip-reveal, NO parallax scrub, static backdrop */
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
        prep();
        chapters.forEach((ch) => {
          const img = ch.querySelector<HTMLElement>(".pmn-img");
          const clip = ch.querySelector<HTMLElement>(".pmn-clip");
          const numeral = ch.querySelector<HTMLElement>(".pmn-numeral");
          const titleEl = ch.querySelector<HTMLElement>(".pmn-title");
          const chars = titleEl ? Array.from(titleEl.querySelectorAll<HTMLElement>(".mchar")) : [];

          const tl = gsap.timeline({
            scrollTrigger: { trigger: ch, start: "top 78%", once: true },
          });
          if (clip) tl.to(clip, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" }, 0);
          if (img) tl.to(img, { scale: 1, duration: 1.0, ease: "expo.out" }, 0);
          if (numeral) tl.to(numeral, { yPercent: 0, opacity: 1, duration: 0.8, ease: "power4.out" }, 0.1);
          if (chars.length) tl.to(chars, { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.02 }, 0.25);
          tl.to(
            ch.querySelectorAll<HTMLElement>(".pmn-fade"),
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.05 },
            0.4,
          );
        });
      });

      /* reduced motion: static chapters, simple fades, no transforms */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        chapters.forEach((ch) => {
          const titleEl = ch.querySelector<HTMLElement>(".pmn-title");
          if (titleEl) splitChars(titleEl); // keep markup parity; no offset
          gsap.set(ch.querySelector(".pmn-clip"), { clipPath: "inset(0% 0% 0% 0%)" });
          gsap.set(ch.querySelector(".pmn-img"), { scale: 1 });
          gsap.fromTo(
            ch,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: { trigger: ch, start: "top 85%", once: true },
            },
          );
        });
      });

      /* magnetic on each "+ DETAILS" button (no-ops on touch/reduced) */
      root.querySelectorAll<HTMLElement>(".pmn-details-btn").forEach((btn) => {
        removers.push(magnetize(btn, 0.35));
      });
    }, root);

    return () => {
      removers.forEach((fn) => fn());
      mm.revert();
      ctx.revert();
    };
  }, []);

  /* close an open panel when its chapter scrolls out of view */
  useEffect(() => {
    if (open === null) return;
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;
    const ch = root.querySelectorAll<HTMLElement>(".pmn-chapter")[open];
    if (!ch) return;
    const st = ScrollTrigger.create({
      trigger: ch,
      start: "top bottom",
      end: "bottom top",
      onLeave: () => setOpen(null),
      onLeaveBack: () => setOpen(null),
    });
    return () => st.kill();
  }, [open]);

  return (
    <section id="projects" data-section-name="04 / CASE FILES" ref={rootRef} className="relative">
      <div className="pad-x pt-[clamp(4rem,10vh,9rem)]">
        <SectionHeading index="04" title="CASE FILES" sub={`${TOTAL} operations`} />
      </div>

      <div className="pmn-gallery mt-[clamp(2rem,6vh,4.5rem)]">
        {PROJECTS.map((p: Project, i) => {
          const num = String(i + 1).padStart(2, "0");
          const isOpen = open === i;
          const panelId = `pmn-panel-${i}`;
          const btnId = `pmn-btn-${i}`;
          return (
            <article
              key={p.title}
              className="pmn-chapter relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden border-t border-line md:min-h-[100svh]"
            >
              {/* ---- full-bleed backdrop (clip-reveal wrapper holds the counter-scaling image) ---- */}
              <div aria-hidden className="pmn-clip absolute inset-0 -z-10 overflow-hidden">
                {p.image ? (
                  <img
                    src={p.image}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="pmn-img absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="pmn-img absolute inset-0 h-full w-full overflow-hidden bg-bg-soft">
                    <div
                      className="pmn-placeholder absolute -inset-[20%] select-none whitespace-pre-wrap break-all font-mono text-[34px] leading-[48px] tracking-[.12em] text-white/[.1]"
                      aria-hidden
                    >
                      {`${initials(p.title)} 0x // `.repeat(220)}
                    </div>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-[10%] top-1/3 h-px w-[140%] origin-left -rotate-[12deg] bg-accent/40"
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-mono text-[.7rem] uppercase tracking-[.3em] text-faint">
                      {p.title}
                    </span>
                  </div>
                )}
                {/* bottom-up legibility scrim */}
                <div className="pmn-scrim pointer-events-none absolute inset-0" />
              </div>

              {/* ---- huge index numeral, .text-stroke, rises + drifts ---- */}
              <span
                aria-hidden
                className="pmn-numeral text-stroke pointer-events-none absolute left-[clamp(1.25rem,4vw,4rem)] top-[8vh] select-none font-display font-bold leading-none tracking-[-.04em]"
              >
                {num}
              </span>

              {/* ---- lower-third content ---- */}
              <div className="pad-x relative z-10 pb-[clamp(2.5rem,7vh,5rem)] pt-[clamp(2rem,6vh,4rem)]">
                <div className="pmn-fade mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.18em] text-muted">
                  <span className="text-accent">
                    {num} / {PAD}
                  </span>
                  {p.client && <span>{p.client}</span>}
                  <span>{p.year}</span>
                  <span>{p.role}</span>
                </div>

                <div className="overflow-hidden pb-[.12em] [&_.mchar]:will-change-transform">
                  <h3
                    className="pmn-title max-w-[18ch] break-words font-display font-bold leading-[.92] tracking-[-.03em]"
                  >
                    {p.title}
                  </h3>
                </div>

                {p.tagline && (
                  <p className="pmn-fade mt-5 flex max-w-[44ch] gap-3 font-display text-[clamp(1rem,1.6vw,1.35rem)] leading-snug tracking-[-.01em] text-text before:mt-[.7em] before:h-px before:w-7 before:shrink-0 before:bg-accent before:content-['']">
                    {p.tagline}
                  </p>
                )}

                {/* ---- + DETAILS button (magnetic, real toggle) ---- */}
                <div className="pmn-fade mt-7 flex">
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(i)}
                    data-cursor="hover"
                    data-cursor-label={isOpen ? "CLOSE" : "DETAILS"}
                    className="pmn-details-btn group inline-flex items-center gap-3 rounded-[3px] border border-line bg-bg/40 px-4 py-2.5 font-mono text-[.62rem] uppercase tracking-[.18em] text-muted outline-none backdrop-blur-[2px] transition-colors duration-300 hover:border-accent/70 hover:text-text focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <span
                      aria-hidden
                      className={`pmn-plus inline-block text-accent transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                    {isOpen ? "Close" : "Details"}
                  </button>
                </div>

                {/* ---- inline detail panel (gsap height/opacity) ---- */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  ref={(el) => {
                    panelRefs.current[i] = el;
                  }}
                  className="pmn-panel overflow-hidden"
                  style={{ height: 0, opacity: 0 }}
                >
                  <div
                    ref={(el) => {
                      innerRefs.current[i] = el;
                    }}
                    className="pmn-panel-inner grid grid-cols-1 gap-x-10 gap-y-6 pt-7 md:grid-cols-12"
                  >
                    <div className="md:col-span-7">
                      <p
                        className="max-w-[58ch] text-[clamp(.9rem,1.1vw,1rem)] leading-[1.7] text-muted [&_strong]:font-medium [&_strong]:text-accent"
                        dangerouslySetInnerHTML={{ __html: p.desc }}
                      />
                      {p.bullets && p.bullets.length > 0 && (
                        <ul className="diamond-list mt-5 flex max-w-[58ch] flex-col gap-[.55rem]">
                          {p.bullets.map((b) => (
                            <li key={b} className="text-[.88rem] leading-relaxed text-muted">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-col gap-6 md:col-span-5">
                      <div className="flex flex-wrap gap-2">
                        {p.stack.map((s) => (
                          <span
                            key={s}
                            className="rounded-[3px] border border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted transition-colors duration-300 hover:border-accent/60 hover:text-text"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="border-l-2 border-accent pl-4">
                        <span className="block font-mono text-[.58rem] uppercase tracking-[.24em] text-faint">
                          Result
                        </span>
                        <p className="mt-2 font-display text-[clamp(1.15rem,1.9vw,1.6rem)] leading-tight tracking-[-.01em] text-text">
                          {p.highlight}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <style>{`
        .pmn-numeral {
          font-size: 18vw;
        }
        .pmn-title {
          font-size: clamp(2.4rem, 10vw, 3.4rem);
        }
        @media (min-width: 768px) {
          .pmn-title { font-size: clamp(3rem, 8vw, 8rem); }
        }
        /* bottom-up scrim for lower-third legibility over imagery */
        .pmn-scrim {
          background: linear-gradient(
            to top,
            #070709 0%,
            rgba(7, 7, 9, 0.92) 18%,
            rgba(7, 7, 9, 0.6) 42%,
            rgba(7, 7, 9, 0.18) 68%,
            rgba(7, 7, 9, 0) 100%
          );
        }
        /* missing-image glyph watermark (§0.4): initials + 0x + // tile, -12deg */
        .pmn-placeholder {
          transform: rotate(-12deg);
        }
        .pmn-img { will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .pmn-img { will-change: auto; }
          .pmn-plus { transition: none; }
        }
      `}</style>
    </section>
  );
}
