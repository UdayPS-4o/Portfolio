"use client";

/**
 * VARIANT C — "CONSOLE"
 * A single instrument bezel stays pinned (position: sticky) while the page
 * scrolls VERTICALLY down an N×100vh runway. The project inside the console
 * TUNES from one channel to the next: an in-place CRT sync-tear / RGB-split
 * glitch — NOT a horizontal traverse. The section itself only ever moves on the
 * y-axis. Detail is rendered fully inline (no modal, no ProjectOverlay).
 *
 * prefix: pcn-
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, type Project } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced, getLenis } from "@/lib/mythic/motion";
import { scramble } from "@/lib/mythic/text";

const TOTAL = PROJECTS.length;
const N2 = (n: number) => String(n).padStart(2, "0");

/* deterministic, JS-only fake telemetry channels (no scramble-spam — a gentle
   tick). Seeded from the project title so values are stable per channel and
   never depend on Math.random for their identity. */
type Telem = { label: string; base: number; unit: string; pad: number; jitter: number };

function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function telemetryFor(p: Project): Telem[] {
  const s = seedFrom(p.title);
  return [
    { label: "GAIN", base: 40 + Math.floor(s * 40), unit: "dB", pad: 2, jitter: 3 },
    { label: "FREQ", base: 100 + Math.floor(s * 800), unit: "Hz", pad: 3, jitter: 6 },
    { label: "DRIFT", base: 4 + Math.floor(s * 30), unit: "ms", pad: 2, jitter: 2 },
    { label: "LOCK", base: 92 + Math.floor(s * 7), unit: "%", pad: 2, jitter: 1 },
  ];
}

/* short initials for the no-image placeholder watermark */
function initialsOf(title: string): string {
  return (
    title
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "0X"
  );
}

export default function ProjectsConsole() {
  const rootRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // persistent content refs (desktop, single viewport — content swaps in place)
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null); // CH 0X/0N small title region
  const contentRef = useRef<HTMLDivElement>(null); // right7 column (glitch target)
  const scopeImgWrapRef = useRef<HTMLDivElement>(null); // image cross-fade stack
  const rgbRef = useRef<HTMLDivElement>(null); // RGB-split flash overlay
  const wipeRef = useRef<HTMLDivElement>(null); // scope-line wipe
  const sweepRef = useRef<HTMLDivElement>(null); // sweeping reticle line
  const telemTrackRef = useRef<HTMLDivElement>(null); // scrolling telemetry text
  const telemValsRef = useRef<HTMLDivElement>(null); // live fake values row
  const signalDotRef = useRef<HTMLSpanElement>(null);

  // active channel as React state ONLY for rendering the inline detail text +
  // ladder active class. The animation is driven imperatively to avoid remounts.
  const [active, setActive] = useState(0);

  // expose the active index to the imperative layer without re-binding effects
  const activeRef = useRef(0);
  activeRef.current = active;

  // imperative handles shared between the main effect and the JSX handlers
  const tuneToRef = useRef<((i: number) => void) | null>(null);
  const consoleVisibleRef = useRef(false);

  /* -----------------------------------------------------------------------
     Desktop tune engine + scope sweep + telemetry tick + reduced-motion.
     mobile (<768) is pure CSS-flow stacked cards (rendered below) with a
     one-shot flicker handled by its own ScrollTriggers in the mm block.
  ----------------------------------------------------------------------- */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    const runway = runwayRef.current;
    const consoleEl = consoleRef.current;
    if (!root || !runway || !consoleEl) return;

    const mm = gsap.matchMedia();
    const teardown: Array<() => void> = [];

    /* ---------- DESKTOP (pinned console, scroll-tunes) ---------- */
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      let current = 0;
      let pending = -1;
      let tl: gsap.core.Timeline | null = null;

      const titleEl = titleRef.current;
      const taglineEl = taglineRef.current;
      const descEl = descRef.current;
      const contentEl = contentRef.current;
      const rgbEl = rgbRef.current;
      const wipeEl = wipeRef.current;
      const imgWrap = scopeImgWrapRef.current;
      const metaEl = metaRef.current;

      // image layers (one per project, pre-stacked); cross-fade between them
      const imgLayers = imgWrap
        ? Array.from(imgWrap.querySelectorAll<HTMLElement>(".pcn-imglayer"))
        : [];

      // JS-only initial state: show channel 0, hide the rest of the imagery.
      gsap.set(imgLayers, { autoAlpha: 0 });
      if (imgLayers[0]) gsap.set(imgLayers[0], { autoAlpha: 1 });
      if (rgbEl) gsap.set(rgbEl, { autoAlpha: 0 });
      if (wipeEl) gsap.set(wipeEl, { scaleY: 0, transformOrigin: "top" });
      if (contentEl) gsap.set(contentEl, { x: 0, autoAlpha: 1, filter: "none" });

      const updateInlineText = (i: number) => {
        const p = PROJECTS[i];
        // React owns the body copy (desc/bullets/stack) — flip state so the
        // correct record renders. Title/tagline are scramble-decoded below.
        setActive(i);
        if (metaEl) metaEl.textContent = `CH ${N2(i + 1)} / ${N2(TOTAL)}`;
        return p;
      };

      const cancels: Array<() => void> = [];
      const tuneTo = (i: number) => {
        if (i === current || i < 0 || i >= TOTAL) return;
        // last input wins — kill any in-flight tune and re-aim
        if (tl) {
          tl.kill();
          tl = null;
        }
        cancels.forEach((c) => c());
        cancels.length = 0;
        pending = i;
        const from = current;
        current = i;

        const p = PROJECTS[i];
        const dir = i > from ? 1 : -1;

        tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            tl = null;
            pending = -1;
          },
        });

        // --- OUTGOING: 2-frame horizontal sync-tear + RGB flash, IN PLACE ---
        if (contentEl) {
          tl.set(contentEl, { x: 0 })
            .to(contentEl, { x: dir * -6, duration: 0.04, ease: "none" })
            .to(contentEl, { x: dir * 5, autoAlpha: 0.15, duration: 0.05, ease: "none" })
            .set(contentEl, { x: dir * -3 })
            .to(contentEl, { autoAlpha: 0.05, duration: 0.04, ease: "none" });
        }
        if (rgbEl) {
          tl.set(rgbEl, { autoAlpha: 1 }, "<")
            .to(rgbEl, { autoAlpha: 0, duration: 0.12, ease: "power1.in" }, ">-0.02");
        }

        // --- swap inline record at the midpoint ---
        tl.add(() => {
          updateInlineText(i);
          // image cross-fade behind the scope-line wipe
          imgLayers.forEach((layer, k) =>
            gsap.set(layer, { autoAlpha: k === i ? 1 : 0 }),
          );
        });

        // --- scope-line wipe over the image ---
        if (wipeEl) {
          tl.fromTo(
            wipeEl,
            { scaleY: 0, transformOrigin: dir > 0 ? "top" : "bottom" },
            { scaleY: 1, duration: 0.16, ease: "power2.in" },
            "<",
          ).to(wipeEl, { scaleY: 0, transformOrigin: dir > 0 ? "bottom" : "top", duration: 0.2, ease: "power2.out" });
        }

        // --- INCOMING: content streaks back into place + title scramble ---
        if (contentEl) {
          tl.fromTo(
            contentEl,
            { x: dir * 8, autoAlpha: 0.05 },
            { x: 0, autoAlpha: 1, duration: 0.34, ease: "power3.out" },
            "<",
          );
        }
        tl.add(() => {
          if (titleEl) {
            titleEl.dataset.text = p.title;
            cancels.push(scramble(titleEl, { duration: 0.42 }));
          }
          if (taglineEl && p.tagline) {
            taglineEl.dataset.text = p.tagline;
            cancels.push(scramble(taglineEl, { duration: 0.5 }));
          }
        }, "<");

        if (descEl) {
          tl.fromTo(
            descEl,
            { y: 14, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" },
            "<0.04",
          );
        }
      };
      // expose for ladder clicks / keyboard within this scope
      tuneToRef.current = tuneTo;

      /* ---- scroll position → active channel (hysteresis) ---- */
      // Controller spans the runway. progress 0..1 maps to channel via centered
      // bands; hysteresis keeps a small dead-zone so it doesn't flutter on a
      // threshold.
      let lastProg = 0;
      const st = ScrollTrigger.create({
        trigger: runway,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const prog = self.progress;
          const moving = prog - lastProg;
          lastProg = prog;
          // each channel owns a 1/TOTAL band; pick the band the progress sits in
          const raw = prog * TOTAL;
          let idx = Math.floor(raw);
          // hysteresis: only flip when we're ~12% past the boundary in the
          // direction of travel, so re-crossings near a tick don't thrash.
          const frac = raw - idx;
          if (moving >= 0) {
            if (frac < 0.12 && idx > 0 && idx > current) idx = current; // hold
          } else {
            if (frac > 0.88 && idx < TOTAL - 1 && idx < current) idx = current;
          }
          idx = gsap.utils.clamp(0, TOTAL - 1, idx);
          if (idx !== current && idx !== pending) tuneTo(idx);
        },
      });
      teardown.push(() => st.kill());

      /* ---- console visibility gate for ↑/↓ key seek ---- */
      const onConsoleVisible = (v: boolean) => {
        consoleVisibleRef.current = v;
      };
      const visST = ScrollTrigger.create({
        trigger: consoleEl,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => onConsoleVisible(self.isActive),
      });
      teardown.push(() => visST.kill());

      return () => {
        tl?.kill();
        cancels.forEach((c) => c());
        tuneToRef.current = null;
        consoleVisibleRef.current = false;
      };
    });

    /* ---------- MOBILE (<768): stacked cards, one-shot flicker on scroll-in ---------- */
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".pcn-mcard"));
      const triggers: ScrollTrigger[] = [];
      cards.forEach((card) => {
        const flickEl = card.querySelector<HTMLElement>(".pcn-mflick");
        const titleEl = card.querySelector<HTMLElement>(".pcn-mtitle");
        gsap.set(card, { autoAlpha: 0, y: 24 });
        const stc = ScrollTrigger.create({
          trigger: card,
          start: "top 84%",
          once: true,
          onEnter: () => {
            const t = gsap.timeline();
            t.to(card, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" });
            // one-shot flicker (the "tune" arriving)
            if (flickEl) {
              t.set(flickEl, { autoAlpha: 0 }, 0);
              for (let s = 0; s < 4; s++) {
                t.set(flickEl, { autoAlpha: s % 2 === 0 ? 0.6 : 0 }, 0.04 + s * 0.06);
              }
              t.set(flickEl, { autoAlpha: 0 }, 0.32);
            }
            if (titleEl) {
              titleEl.dataset.text = titleEl.textContent ?? "";
              scramble(titleEl, { duration: 0.5 });
            }
          },
        });
        triggers.push(stc);
      });
      return () => triggers.forEach((t) => t.kill());
    });

    /* ---------- REDUCED MOTION (any width): everything static, readable ---------- */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      // desktop console is position: relative via CSS guard; just make sure the
      // first channel's imagery is visible and nothing is hidden.
      const imgWrap = scopeImgWrapRef.current;
      if (imgWrap) {
        const layers = Array.from(imgWrap.querySelectorAll<HTMLElement>(".pcn-imglayer"));
        layers.forEach((l, k) => gsap.set(l, { autoAlpha: k === 0 ? 1 : 0 }));
      }
      const mcards = Array.from(root.querySelectorAll<HTMLElement>(".pcn-mcard"));
      gsap.set(mcards, { autoAlpha: 1, y: 0 });
      // no scroll-tune; allow ladder clicks to swap instantly
      tuneToRef.current = (i: number) => {
        if (i < 0 || i >= TOTAL) return;
        setActive(i);
        if (metaRef.current) metaRef.current.textContent = `CH ${N2(i + 1)} / ${N2(TOTAL)}`;
        const w = scopeImgWrapRef.current;
        if (w) {
          const layers = Array.from(w.querySelectorAll<HTMLElement>(".pcn-imglayer"));
          layers.forEach((l, k) => gsap.set(l, { autoAlpha: k === i ? 1 : 0 }));
        }
      };
      return () => {
        tuneToRef.current = null;
      };
    });

    /* -----------------------------------------------------------------
       Single rAF: scope reticle sweep + blink dot + telemetry tick.
       Gated by IntersectionObserver visibility AND document.hidden.
    ----------------------------------------------------------------- */
    let visible = false;
    let raf = 0;
    let lastTick = 0;
    const reduced = prefersReduced();
    const sweepEl = sweepRef.current;
    const dotEl = signalDotRef.current;
    const valsEl = telemValsRef.current;

    // pre-format value cells once (deterministic per active channel; tick only
    // nudges the trailing digits — a gentle wobble, never a scramble spam)
    const renderTelem = (i: number, phase: number) => {
      if (!valsEl) return;
      const cells = telemetryFor(PROJECTS[i]);
      const wobble = Math.sin(phase * 0.9);
      valsEl.textContent = cells
        .map((c, k) => {
          const j = Math.round(wobble * c.jitter * (k % 2 === 0 ? 1 : -1));
          const v = Math.max(0, c.base + j);
          return `${c.label} ${String(v).padStart(c.pad, "0")}${c.unit}`;
        })
        .join("   ·   ");
    };
    renderTelem(0, 0);

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || reduced) return;
      // sweep reticle: 0..100% of the scope height, ~3.4s period
      if (sweepEl) {
        const p = (t / 3400) % 1;
        sweepEl.style.transform = `translateY(${p * 100}%)`;
        sweepEl.style.opacity = String(0.25 + 0.55 * Math.sin(p * Math.PI));
      }
      // blink dot ~1.1s
      if (dotEl) dotEl.style.opacity = (t % 1100) < 550 ? "1" : "0.18";
      // telemetry tick ~every 420ms
      if (t - lastTick > 420) {
        lastTick = t;
        renderTelem(activeRef.current, t / 1000);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(consoleEl);
    raf = requestAnimationFrame(loop);

    teardown.push(() => {
      cancelAnimationFrame(raf);
      io.disconnect();
    });

    return () => {
      teardown.forEach((fn) => fn());
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- ladder tick click / keyboard seek (vertical scroll only) ---- */
  const seekToChannel = (i: number) => {
    if (i < 0 || i >= TOTAL) return;
    const runway = runwayRef.current;
    if (!runway) return;
    const reduced = prefersReduced();
    const isDesktop =
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

    if (!isDesktop || reduced) {
      // mobile / reduced: tune in place (reduced motion installs an instant
      // swap in tuneToRef); on touch, also bring the matching card into view.
      tuneToRef.current?.(i);
      if (!reduced) {
        const card = rootRef.current?.querySelectorAll<HTMLElement>(".pcn-mcard")[i];
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // desktop: seek the runway so scroll position lands in channel i's band.
    const runwayTop = runway.getBoundingClientRect().top + window.scrollY;
    // aim at the centre of band i (+0.5) so we sit comfortably inside it
    const target = runwayTop + ((i + 0.5) / TOTAL) * (runway.offsetHeight - window.innerHeight);
    const lenis = getLenis();
    if (lenis?.scrollTo) lenis.scrollTo(target, { duration: 0.9 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  const onLadderKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      seekToChannel(Math.min(TOTAL - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      seekToChannel(Math.max(0, i - 1));
    }
  };

  /* global ↑/↓ seek when the console is ≥50% visible (desktop) */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!consoleVisibleRef.current) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        seekToChannel(Math.min(TOTAL - 1, activeRef.current + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        seekToChannel(Math.max(0, activeRef.current - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProject = PROJECTS[active];
  const telemStrip = `${activeProject.client ? `${activeProject.client} · ` : ""}${activeProject.year} · ${activeProject.highlight}`;

  return (
    <section
      ref={rootRef}
      id="projects"
      data-section-name="04 / CASE FILES"
      className="relative pad-x py-[clamp(5rem,12vh,11rem)]"
    >
      <SectionHeading
        index="04"
        title="CASE FILES"
        sub="4 channels · live readout"
        className="mb-[clamp(2.5rem,7vh,5.5rem)]"
      />

      {/* ===================== DESKTOP / TABLET: pinned console ===================== */}
      <div
        ref={runwayRef}
        className="pcn-runway relative hidden md:block"
        style={{ height: `${TOTAL * 100}vh` }}
      >
        <div
          ref={consoleRef}
          className="pcn-console sticky top-[7vh] h-[86vh] overflow-hidden rounded-lg border border-line bg-bg-soft/40 backdrop-blur-[2px]"
        >
          {/* corner brackets */}
          <span aria-hidden className="pcn-bracket pcn-bl-tl" />
          <span aria-hidden className="pcn-bracket pcn-bl-tr" />
          <span aria-hidden className="pcn-bracket pcn-bl-bl" />
          <span aria-hidden className="pcn-bracket pcn-bl-br" />

          {/* ---------- bezel top bar ---------- */}
          <div className="relative z-20 flex items-center justify-between gap-4 border-b border-line px-[clamp(1rem,2vw,1.75rem)] py-3 font-mono text-[.62rem] uppercase tracking-[.18em] text-muted">
            <span ref={metaRef} className="text-accent">
              CH {N2(active + 1)} / {N2(TOTAL)}
            </span>
            <span className="truncate text-center text-text/80" aria-hidden>
              {activeProject.title}
            </span>
            <span className="flex items-center gap-2">
              <span className="hidden lg:inline">
                SIGNAL <span className="text-accent">███</span>░ ·{" "}
              </span>
              <span className="text-text/70">{activeProject.role}</span>
              <span
                ref={signalDotRef}
                aria-hidden
                className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
            </span>
          </div>

          {/* ---------- main viewport: scope (left5) + record (right7) ---------- */}
          <div className="pcn-main relative grid h-[calc(100%-2.6rem-2.4rem)] grid-cols-12">
            {/* left vertical channel ladder */}
            <div className="pcn-ladder pointer-events-auto absolute left-0 top-0 z-20 flex h-full flex-col justify-center gap-1 px-2">
              {PROJECTS.map((p, i) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => seekToChannel(i)}
                  onKeyDown={(e) => onLadderKey(e, i)}
                  aria-label={`Tune to channel ${N2(i + 1)}: ${p.title}`}
                  aria-current={active === i ? "true" : undefined}
                  data-cursor="hover"
                  className={`pcn-tick rounded-[3px] px-1.5 py-1 text-left font-mono text-[.55rem] tracking-[.1em] outline-none transition-colors duration-300 focus-visible:ring-1 focus-visible:ring-accent ${
                    active === i ? "text-accent" : "text-faint hover:text-muted"
                  }`}
                >
                  C{N2(i + 1)}
                </button>
              ))}
            </div>

            {/* scope (image) */}
            <div className="pcn-scope relative col-span-5 overflow-hidden border-r border-line pl-8">
              <div aria-hidden className="pcn-scopegrid pointer-events-none absolute inset-0" />
              <div aria-hidden className="pcn-scanlines pointer-events-none absolute inset-0" />
              <div ref={scopeImgWrapRef} className="absolute inset-0">
                {PROJECTS.map((p, i) => (
                  <div
                    key={p.title}
                    className="pcn-imglayer absolute inset-0"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={`${p.title} signal scope`}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-90"
                      />
                    ) : (
                      <PlaceholderPanel title={p.title} />
                    )}
                  </div>
                ))}
              </div>
              {/* sweeping reticle line (rAF-driven) */}
              <div ref={sweepRef} aria-hidden className="pcn-sweep pointer-events-none absolute inset-x-0 top-0" />
              {/* scope-line wipe (tune transition) */}
              <div ref={wipeRef} aria-hidden className="pcn-wipe pointer-events-none absolute inset-0" />
              {/* faint center reticle */}
              <div aria-hidden className="pcn-reticle pointer-events-none absolute inset-0" />
            </div>

            {/* record (right7) — persistent, content swaps */}
            <div className="relative col-span-7 overflow-hidden">
              {/* RGB-split flash overlay (tune transition) */}
              <div ref={rgbRef} aria-hidden className="pcn-rgb pointer-events-none absolute inset-0 z-10" />
              <div
                ref={contentRef}
                className="pcn-content relative z-[1] flex h-full flex-col gap-4 overflow-y-auto px-[clamp(1.25rem,2.6vw,2.75rem)] py-[clamp(1rem,3vh,2.25rem)]"
              >
                <h3
                  ref={titleRef}
                  data-text={activeProject.title}
                  className="font-display font-bold leading-[.95] tracking-[-.03em] text-[clamp(2.2rem,4vw,4.4rem)]"
                >
                  {activeProject.title}
                </h3>

                {activeProject.tagline && (
                  <p
                    ref={taglineRef}
                    data-text={activeProject.tagline}
                    className="flex max-w-[40ch] gap-3 font-display text-[clamp(1rem,1.5vw,1.3rem)] leading-snug tracking-[-.01em] text-text before:mt-[.7em] before:h-px before:w-7 before:shrink-0 before:bg-accent before:content-['']"
                  >
                    {activeProject.tagline}
                  </p>
                )}

                <div ref={descRef} className="flex flex-col gap-4">
                  <p
                    className="max-w-[58ch] text-[clamp(.86rem,1.05vw,.98rem)] leading-[1.7] text-muted [&_strong]:font-medium [&_strong]:text-accent"
                    dangerouslySetInnerHTML={{ __html: activeProject.desc }}
                  />

                  {activeProject.bullets && (
                    <ul className="diamond-list flex max-w-[58ch] flex-col gap-[.5rem]">
                      {activeProject.bullets.map((b) => (
                        <li key={b} className="text-[.84rem] leading-relaxed text-muted">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeProject.stack.map((s) => (
                      <span
                        key={s}
                        className="rounded-[3px] border border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted transition-colors duration-300 hover:border-accent/60 hover:text-text"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- bottom telemetry rail ---------- */}
          <div className="pcn-rail relative z-20 flex items-center gap-6 overflow-hidden border-t border-line px-[clamp(1rem,2vw,1.75rem)] py-2.5 font-mono text-[.58rem] uppercase tracking-[.16em] text-faint">
            <div className="pcn-railmask relative flex-1 overflow-hidden">
              <div ref={telemTrackRef} className="pcn-railtrack flex w-max gap-10 whitespace-nowrap">
                {[0, 1].map((g) => (
                  <span key={g} className="shrink-0">
                    {telemStrip}
                  </span>
                ))}
              </div>
            </div>
            <div
              ref={telemValsRef}
              aria-hidden
              className="hidden shrink-0 tabular-nums text-muted/80 lg:block"
            >
              {telemetryFor(activeProject)
                .map((c) => `${c.label} ${String(c.base).padStart(c.pad, "0")}${c.unit}`)
                .join("   ·   ")}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE (<768): stacked cards ===================== */}
      <div className="flex flex-col gap-7 md:hidden">
        {/* compact channel ladder for tap-seek on mobile */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Channels">
          {PROJECTS.map((p, i) => (
            <button
              key={p.title}
              type="button"
              onClick={() => seekToChannel(i)}
              aria-label={`Jump to channel ${N2(i + 1)}: ${p.title}`}
              className="rounded-[3px] border border-line px-2.5 py-1.5 font-mono text-[.6rem] tracking-[.12em] text-muted active:border-accent/60"
            >
              C{N2(i + 1)}
            </button>
          ))}
        </div>

        {PROJECTS.map((p, i) => (
          <article
            key={p.title}
            className="pcn-mcard relative overflow-hidden rounded-lg border border-line bg-bg-soft/40"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 font-mono text-[.6rem] uppercase tracking-[.16em] text-muted">
              <span className="text-accent">CH {N2(i + 1)} / {N2(TOTAL)}</span>
              <span className="text-text/70">{p.role}</span>
            </div>

            <div className="pcn-mscope relative aspect-[16/10] overflow-hidden border-b border-line">
              <div aria-hidden className="pcn-scopegrid pointer-events-none absolute inset-0" />
              <div aria-hidden className="pcn-scanlines pointer-events-none absolute inset-0" />
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={`${p.title} signal scope`}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <PlaceholderPanel title={p.title} />
              )}
              <div aria-hidden className="pcn-mflick pointer-events-none absolute inset-0 bg-accent/10" style={{ opacity: 0 }} />
            </div>

            <div className="flex flex-col gap-3.5 p-4">
              <div className="font-mono text-[.6rem] uppercase tracking-[.16em] text-faint">
                {p.client ? `${p.client} · ${p.year}` : p.year}
              </div>
              <h3
                className="pcn-mtitle font-display text-[clamp(1.9rem,8vw,2.6rem)] font-bold leading-[.96] tracking-[-.03em]"
                data-text={p.title}
              >
                {p.title}
              </h3>
              {p.tagline && (
                <p className="flex gap-2.5 font-display text-[1.05rem] leading-snug text-text before:mt-[.65em] before:h-px before:w-6 before:shrink-0 before:bg-accent before:content-['']">
                  {p.tagline}
                </p>
              )}
              <p
                className="text-[.9rem] leading-[1.7] text-muted [&_strong]:font-medium [&_strong]:text-accent"
                dangerouslySetInnerHTML={{ __html: p.desc }}
              />
              {p.bullets && (
                <ul className="diamond-list flex flex-col gap-2">
                  {p.bullets.map((b) => (
                    <li key={b} className="text-[.86rem] leading-relaxed text-muted">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {p.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded-[3px] border border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-2 border-t border-line pt-3 font-mono text-[.58rem] uppercase tracking-[.16em] text-faint">
                <span className="text-accent">RESULT</span>
                <span className="text-muted">{p.highlight}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <style>{`
        /* ----- corner brackets ----- */
        .pcn-bracket { position: absolute; width: 14px; height: 14px; z-index: 25; pointer-events: none; opacity: .5; }
        .pcn-bl-tl { top: 8px; left: 8px; border-top: 1px solid var(--accent); border-left: 1px solid var(--accent); }
        .pcn-bl-tr { top: 8px; right: 8px; border-top: 1px solid var(--accent); border-right: 1px solid var(--accent); }
        .pcn-bl-bl { bottom: 8px; left: 8px; border-bottom: 1px solid var(--accent); border-left: 1px solid var(--accent); }
        .pcn-bl-br { bottom: 8px; right: 8px; border-bottom: 1px solid var(--accent); border-right: 1px solid var(--accent); }

        /* ----- scope grid + scanlines + reticle ----- */
        .pcn-scopegrid {
          background-image:
            repeating-linear-gradient(0deg, rgba(204,255,61,.05) 0, rgba(204,255,61,.05) 1px, transparent 1px, transparent 26px),
            repeating-linear-gradient(90deg, rgba(204,255,61,.05) 0, rgba(204,255,61,.05) 1px, transparent 1px, transparent 26px);
          opacity: .8;
        }
        .pcn-scanlines {
          background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0, rgba(0,0,0,.32) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: multiply;
        }
        .pcn-reticle::before, .pcn-reticle::after {
          content: ""; position: absolute; background: rgba(204,255,61,.14);
        }
        .pcn-reticle::before { left: 0; right: 0; top: 50%; height: 1px; }
        .pcn-reticle::after { top: 0; bottom: 0; left: 50%; width: 1px; }

        /* sweeping reticle line — moved by rAF (transform); base styling here */
        .pcn-sweep {
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(204,255,61,.85), transparent);
          box-shadow: 0 0 12px rgba(204,255,61,.5);
          will-change: transform, opacity;
        }

        /* scope-line wipe used during tune */
        .pcn-wipe {
          background: linear-gradient(180deg, transparent, rgba(204,255,61,.18) 48%, rgba(204,255,61,.32) 50%, rgba(204,255,61,.18) 52%, transparent);
          transform: scaleY(0);
          will-change: transform;
        }

        /* RGB-split flash overlay */
        .pcn-rgb {
          opacity: 0;
          background:
            linear-gradient(90deg, rgba(255,92,124,.10), transparent 30%),
            linear-gradient(270deg, rgba(124,92,255,.10), transparent 30%);
          mix-blend-mode: screen;
          will-change: opacity;
        }

        .pcn-content { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
        .pcn-content::-webkit-scrollbar { width: 6px; }
        .pcn-content::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }

        /* bottom rail marquee */
        .pcn-railtrack { animation: pcn-rail 26s linear infinite; }
        @keyframes pcn-rail { to { transform: translateX(-50%); } }

        /* reduced motion: unpin, static, no loops */
        @media (prefers-reduced-motion: reduce) {
          .pcn-console { position: relative; top: 0; height: auto; }
          .pcn-main { height: auto; min-height: 60vh; }
          .pcn-content { overflow: visible; }
          .pcn-runway { height: auto !important; }
          .pcn-sweep, .pcn-wipe, .pcn-rgb { display: none; }
          .pcn-railtrack { animation: none; }
          .pcn-mcard { opacity: 1 !important; }
        }
        @media (max-width: 767px) {
          .pcn-railtrack { animation: none; }
        }
      `}</style>
    </section>
  );
}

/* shared missing-image placeholder (§0.4) */
function PlaceholderPanel({ title }: { title: string }) {
  const tag = `${initialsOf(title)} 0x //`;
  return (
    <div className="pcn-ph relative h-full w-full overflow-hidden bg-bg-soft">
      <div
        aria-hidden
        className="absolute inset-0"
        style={
          {
            backgroundImage:
              "repeating-linear-gradient(-12deg, rgba(255,255,255,.10) 0, rgba(255,255,255,.10) 0, transparent 0)",
          } as CSSProperties
        }
      />
      <div
        aria-hidden
        className="pcn-ph-tile absolute inset-0 font-mono text-[10px] leading-[48px] tracking-[.2em] text-white/10"
        style={{ transform: "rotate(-12deg) scale(1.4)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
      >
        {`${tag} `.repeat(220)}
      </div>
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] bg-accent/40"
      />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[.62rem] uppercase tracking-[.2em] text-muted">
        {title}
      </span>
    </div>
  );
}
