"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS, type Project } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";

/* ------------------------------------------------------------------ *
 * VARIANT B — "LEDGER"
 * A vertical engineering spec-directory. Full-width rows; the row in
 * focus expands inline to its full record (image + desc + all bullets +
 * stack). Single-open, driven by scroll position AND click. Vertical
 * only. Neutral instrument/editorial tone (an engineering spec sheet).
 * Unique style prefix: pld-
 * ------------------------------------------------------------------ */

const TOTAL = String(PROJECTS.length).padStart(2, "0");

/* derive 2–3 mono "initials" for the no-image placeholder watermark */
function initialsOf(title: string): string {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
  const letters = words.map((w) => w[0]).join("");
  return (letters || title.slice(0, 2)).toUpperCase().slice(0, 3);
}

export default function ProjectsLedger() {
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* per-row element refs */
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const riserRefs = useRef<Array<HTMLElement[]>>([]);

  const [openIndex, setOpenIndex] = useState(0);

  /* refs that the imperative layers read without re-subscribing */
  const openIndexRef = useRef(0);
  const reducedRef = useRef(false);
  const refreshTimer = useRef<number | null>(null);
  const userLockUntil = useRef(0); // brief suppression of scroll-drive after a click
  const didMount = useRef(false); // skip the open/close tween on first paint (setup owns it)

  /* keep the imperative mirror of openIndex current */
  useEffect(() => {
    openIndexRef.current = openIndex;
  }, [openIndex]);

  const registerRiser = useCallback(
    (rowIndex: number) => (el: HTMLElement | null) => {
      if (!riserRefs.current[rowIndex]) riserRefs.current[rowIndex] = [];
      const arr = riserRefs.current[rowIndex];
      if (el && !arr.includes(el)) arr.push(el);
    },
    [],
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      ScrollTrigger.refresh();
      refreshTimer.current = null;
    }, 280);
  }, []);

  /* ---- imperative open/close animation, runs whenever openIndex changes ---- */
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return; // first paint handled by the setup effect's gsap.set initial states
    }
    const reduced = reducedRef.current;
    const next = openIndex;

    bodyRefs.current.forEach((body, i) => {
      if (!body) return;
      const inner = innerRefs.current[i];
      const risers = riserRefs.current[i] ?? [];
      const isOpen = i === next;

      gsap.killTweensOf(body);
      if (inner) gsap.killTweensOf(inner);
      if (risers.length) gsap.killTweensOf(risers);

      if (isOpen) {
        if (reduced) {
          gsap.set(body, { height: "auto", opacity: 1 });
          if (inner) gsap.set(inner, { opacity: 1 });
          if (risers.length) gsap.set(risers, { y: 0, opacity: 1 });
          return;
        }
        if (inner) gsap.set(inner, { opacity: 1 });
        if (risers.length) gsap.set(risers, { y: 18, opacity: 0 });
        gsap.set(body, { opacity: 1 });
        gsap.to(body, {
          height: "auto",
          duration: 0.55,
          ease: "expo.out",
          onComplete: () => {
            gsap.set(body, { height: "auto" }); // resize-safe
            scheduleRefresh();
          },
        });
        if (risers.length) {
          gsap.to(risers, {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.05,
            delay: 0.16,
          });
        }
      } else {
        if (reduced) {
          gsap.set(body, { height: 0, opacity: 0 });
          if (risers.length) gsap.set(risers, { y: 18, opacity: 0 });
          return;
        }
        gsap.to(body, {
          height: 0,
          duration: 0.45,
          ease: "expo.out",
          onComplete: scheduleRefresh,
        });
        if (risers.length) {
          gsap.to(risers, { y: 10, opacity: 0, duration: 0.2, ease: "power2.out" });
        }
      }
    });
  }, [openIndex, scheduleRefresh]);

  /* ---- one-time setup: initial states, scroll-drive, scanline loop ---- */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const reduced = prefersReduced();
    reducedRef.current = reduced;

    /* set collapsed/open initial states from JS only (readable w/o JS) */
    bodyRefs.current.forEach((body, i) => {
      if (!body) return;
      const open = i === openIndexRef.current;
      gsap.set(body, { height: open ? "auto" : 0, opacity: open ? 1 : 0 });
      const risers = riserRefs.current[i] ?? [];
      if (risers.length) gsap.set(risers, open ? { y: 0, opacity: 1 } : { y: 18, opacity: 0 });
      const inner = innerRefs.current[i];
      if (inner) gsap.set(inner, { opacity: open ? 1 : 0 });
    });

    const cleanups: Array<() => void> = [];
    const mm = gsap.matchMedia();

    /* ===== desktop, motion-ok: scroll-driven selection + scanline ===== */
    mm.add(
      "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        /* cache row rects on refresh; recompute nearest-to-center on scroll */
        let rects: Array<{ top: number; bottom: number }> = [];
        const measure = () => {
          rects = rowRefs.current.map((el) => {
            if (!el) return { top: 0, bottom: 0 };
            const r = el.getBoundingClientRect();
            const top = r.top + window.scrollY;
            return { top, bottom: top + r.height };
          });
        };

        let ticking = false;
        const HYST = 0.18; // fraction-of-viewport hysteresis band

        const evaluate = () => {
          ticking = false;
          if (performance.now() < userLockUntil.current) return;
          if (!rects.length) return;
          const center = window.scrollY + window.innerHeight / 2;

          /* row whose vertical span contains center, else nearest by distance */
          let candidate = openIndexRef.current;
          let best = Infinity;
          for (let i = 0; i < rects.length; i++) {
            const { top, bottom } = rects[i];
            const mid = (top + bottom) / 2;
            const d = Math.abs(mid - center);
            if (center >= top && center <= bottom) {
              candidate = i;
              best = -1;
              break;
            }
            if (d < best) {
              best = d;
              candidate = i;
            }
          }
          if (candidate === openIndexRef.current) return;

          /* hysteresis: only switch if the candidate's mid is meaningfully
             closer than the currently-open row's mid */
          const cur = rects[openIndexRef.current];
          if (cur && best >= 0) {
            const curMid = (cur.top + cur.bottom) / 2;
            const curD = Math.abs(curMid - center);
            if (curD - best < window.innerHeight * HYST) return;
          }
          setOpenIndex(candidate);
        };

        const onScroll = () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(evaluate);
        };

        measure();
        window.addEventListener("scroll", onScroll, { passive: true });
        ScrollTrigger.addEventListener("refreshInit", measure);
        ScrollTrigger.addEventListener("refresh", measure);
        const onResize = () => measure();
        window.addEventListener("resize", onResize);

        cleanups.push(() => {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
          ScrollTrigger.removeEventListener("refreshInit", measure);
          ScrollTrigger.removeEventListener("refresh", measure);
        });
      },
    );

    /* ===== scanline sweep on the OPEN row's image (IO + hidden gated) =====
       runs on all non-reduced viewports (desktop + mobile) */
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let visible = false;
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
        },
        { threshold: 0.05 },
      );
      io.observe(list);

      let raf = 0;
      const tick = (t: number) => {
        raf = requestAnimationFrame(tick);
        const scan = rowRefs.current[openIndexRef.current]
          ? bodyRefs.current[openIndexRef.current]?.querySelector<HTMLElement>(".pld-scan")
          : null;
        if (!scan) return;
        if (!visible || document.hidden) {
          scan.style.opacity = "0";
          return;
        }
        const cycle = 2600; // ms per sweep
        const p = (t % cycle) / cycle;
        scan.style.opacity = "1";
        scan.style.transform = `translateY(${(-20 + p * 140).toFixed(2)}%)`;
      };
      raf = requestAnimationFrame(tick);

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        io.disconnect();
      });
    });

    return () => {
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current);
      cleanups.forEach((fn) => fn());
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- interaction handlers ---- */
  const toggle = useCallback((i: number) => {
    userLockUntil.current = performance.now() + 900; // let click win over scroll-drive briefly
    setOpenIndex((cur) => (cur === i ? cur : i)); // single-open; row stays open when re-clicked
  }, []);

  const onRowKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(i);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        rowRefs.current[Math.min(PROJECTS.length - 1, i + 1)]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        rowRefs.current[Math.max(0, i - 1)]?.focus();
      }
    },
    [toggle],
  );

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
        sub="4 records · expand to read"
        className="mb-[clamp(2.5rem,7vh,5.5rem)]"
      />

      <div ref={listRef} className="pld-list">
        {PROJECTS.map((p, i) => {
          const num = String(i + 1).padStart(2, "0");
          const isOpen = i === openIndex;
          const bodyId = `pld-body-${i}`;
          const meta = p.client ? `${p.client} · ${p.year}` : p.year;
          return (
            <article
              key={p.title}
              className={`pld-row${isOpen ? " is-open" : ""}`}
              data-index={num}
            >
              <button
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                aria-label={`${p.title}. ${meta}. ${p.role}. ${isOpen ? "Collapse" : "Expand"} record.`}
                data-cursor="hover"
                data-cursor-label={isOpen ? "CLOSE" : "READ"}
                onClick={() => toggle(i)}
                onKeyDown={(e) => onRowKeyDown(e, i)}
                className="pld-head group"
              >
                {/* ghost title drifting behind (decorative) */}
                <span aria-hidden className="pld-ghost text-stroke">
                  {p.title}
                </span>

                <span className="pld-idx font-mono">{num}</span>

                <span className="pld-title font-display">{p.title}</span>

                <span className="pld-meta font-mono">
                  <span className="pld-meta-top">{meta}</span>
                  <span className="pld-meta-sub">{p.role}</span>
                </span>

                <span aria-hidden className="pld-toggle">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                    <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.4" />
                    <line
                      className="pld-toggle-v"
                      x1="10"
                      y1="3"
                      x2="10"
                      y2="17"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </span>
              </button>

              {/* expanded body (gsap height-auto) */}
              <div
                ref={(el) => {
                  bodyRefs.current[i] = el;
                }}
                id={bodyId}
                role="region"
                aria-label={`${p.title} full record`}
                className="pld-body"
              >
                <div
                  ref={(el) => {
                    innerRefs.current[i] = el;
                  }}
                  className="pld-inner"
                >
                  {/* cols 1–7: text record */}
                  <div className="pld-record">
                    {p.tagline && (
                      <p ref={registerRiser(i)} className="pld-tagline font-display">
                        {p.tagline}
                      </p>
                    )}

                    <p
                      ref={registerRiser(i)}
                      className="pld-desc [&_strong]:text-accent [&_strong]:font-medium"
                      dangerouslySetInnerHTML={{ __html: p.desc }}
                    />

                    {p.bullets && p.bullets.length > 0 && (
                      <ul ref={registerRiser(i)} className="pld-bullets diamond-list">
                        {p.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}

                    <div ref={registerRiser(i)} className="pld-stack">
                      {p.stack.map((s) => (
                        <span key={s} className="pld-chip font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* cols 8–12: image viewport + RESULT caption */}
                  <div ref={registerRiser(i)} className="pld-aside">
                    <div className="pld-viewport">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt={`${p.title} reference panel`}
                          loading="lazy"
                          className="pld-img"
                        />
                      ) : (
                        <div className="pld-placeholder" aria-hidden>
                          <span
                            className="pld-watermark font-mono"
                            style={{
                              ["--pld-wm" as string]: `"${initialsOf(p.title)} 0x // "`,
                            }}
                          />
                          <span className="pld-ph-diag" />
                          <span className="pld-ph-title font-mono">{p.title}</span>
                        </div>
                      )}
                      <span aria-hidden className="pld-scan" />
                      <span aria-hidden className="pld-corner pld-corner-tl" />
                      <span aria-hidden className="pld-corner pld-corner-br" />
                    </div>
                    <div className="pld-result font-mono">
                      <span className="pld-result-key">RESULT</span>
                      <span className="pld-result-val">{p.highlight}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="pld-foot font-mono" aria-hidden>
        {TOTAL} records · ledger reads itself as you scroll
      </p>

      <style>{`
        .pld-list {
          --pld-row-h: clamp(5.5rem, 11vh, 8rem);
          border-top: 1px solid var(--line, rgba(255,255,255,.10));
        }
        .pld-row {
          border-bottom: 1px solid var(--line, rgba(255,255,255,.10));
        }

        /* ---- collapsed head ---- */
        .pld-head {
          position: relative;
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) auto 40px;
          align-items: center;
          gap: clamp(1rem, 2.4vw, 2.4rem);
          width: 100%;
          min-height: var(--pld-row-h);
          padding: 1rem 0;
          text-align: left;
          background: transparent;
          color: inherit;
          border: 0;
          cursor: pointer;
          outline: none;
          isolation: isolate;
          transition: background-color .4s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-row.is-open .pld-head { background: #0e0e12; }
        .pld-head:focus-visible {
          box-shadow: inset 0 0 0 2px var(--accent, #ccff3d);
          border-radius: 4px;
        }

        .pld-ghost {
          position: absolute;
          left: 56px;
          top: 50%;
          transform: translate(0, -50%);
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          letter-spacing: -.03em;
          line-height: .9;
          font-size: clamp(2.4rem, 7vw, 5.5rem);
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          z-index: 0;
          transition: opacity .5s var(--ease, cubic-bezier(.22,1,.36,1)),
                      transform .9s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-row.is-open .pld-ghost {
          opacity: .12;
          transform: translate(clamp(.6rem, 2vw, 2rem), -50%);
        }

        .pld-idx {
          position: relative;
          z-index: 1;
          font-size: .72rem;
          letter-spacing: .18em;
          color: var(--faint, #54545c);
          transition: color .35s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-row.is-open .pld-idx { color: var(--accent, #ccff3d); }

        .pld-title {
          position: relative;
          z-index: 1;
          min-width: 0;
          font-weight: 700;
          letter-spacing: -.03em;
          line-height: .98;
          font-size: clamp(1.6rem, 3.4vw, 3rem);
          color: var(--text, #ededf0);
          overflow-wrap: break-word;
          transition: transform .5s var(--ease, cubic-bezier(.22,1,.36,1)),
                      color .35s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-row.is-open .pld-title { transform: translateX(.5rem); }
        .pld-head:hover .pld-title { color: #fff; }

        .pld-meta {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: .25rem;
          text-align: right;
          font-size: .6rem;
          letter-spacing: .16em;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .pld-meta-top { color: var(--muted, #8a8a93); }
        .pld-meta-sub { color: var(--faint, #54545c); }

        .pld-toggle {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          color: var(--muted, #8a8a93);
          border: 1px solid var(--line, rgba(255,255,255,.10));
          border-radius: 999px;
          transition: transform .5s var(--ease, cubic-bezier(.22,1,.36,1)),
                      color .35s var(--ease, cubic-bezier(.22,1,.36,1)),
                      border-color .35s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-head:hover .pld-toggle { border-color: rgba(255,255,255,.25); color: var(--text,#ededf0); }
        .pld-row.is-open .pld-toggle {
          transform: rotate(180deg);
          color: var(--accent, #ccff3d);
          border-color: rgba(204,255,61,.5);
        }
        .pld-toggle-v {
          transform-origin: 10px 10px;
          transition: opacity .4s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-row.is-open .pld-toggle-v { opacity: 0; }

        /* ---- expanded body ---- */
        .pld-body {
          height: 0;
          overflow: hidden;
          will-change: height;
        }
        .pld-inner {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: clamp(1.5rem, 4vw, 4rem);
          padding: 0 0 clamp(2.4rem, 5vh, 4rem) 56px;
        }
        .pld-record {
          grid-column: 1 / span 7;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          min-width: 0;
        }
        .pld-aside {
          grid-column: 8 / span 5;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pld-tagline {
          position: relative;
          padding-left: 2.2rem;
          max-width: 40ch;
          font-weight: 500;
          letter-spacing: -.01em;
          line-height: 1.3;
          font-size: clamp(1.1rem, 1.7vw, 1.45rem);
          color: var(--text, #ededf0);
        }
        .pld-tagline::before {
          content: "";
          position: absolute;
          left: 0;
          top: .72em;
          width: 1.5rem;
          height: 1px;
          background: var(--accent, #ccff3d);
        }

        .pld-desc {
          max-width: 58ch;
          font-size: clamp(.9rem, 1.1vw, 1rem);
          line-height: 1.7;
          color: var(--muted, #8a8a93);
        }

        .pld-bullets {
          display: flex;
          flex-direction: column;
          gap: .55rem;
          max-width: 58ch;
        }
        .pld-bullets li {
          font-size: .88rem;
          line-height: 1.55;
          color: var(--muted, #8a8a93);
        }

        .pld-stack { display: flex; flex-wrap: wrap; gap: .5rem; }
        .pld-chip {
          font-size: .6rem;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--muted, #8a8a93);
          border: 1px solid var(--line, rgba(255,255,255,.10));
          border-radius: 4px;
          padding: .375rem .75rem;
          transition: border-color .3s var(--ease, cubic-bezier(.22,1,.36,1)),
                      color .3s var(--ease, cubic-bezier(.22,1,.36,1));
        }
        .pld-chip:hover { border-color: rgba(204,255,61,.6); color: var(--text, #ededf0); }

        /* ---- image viewport ---- */
        .pld-viewport {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border: 1px solid var(--line, rgba(255,255,255,.10));
          background: #0e0e12;
        }
        .pld-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pld-scan {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 30%;
          opacity: 0;
          pointer-events: none;
          z-index: 4;
          will-change: transform, opacity;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(204,255,61,.04) 38%,
            rgba(204,255,61,.16) 50%,
            rgba(204,255,61,.04) 62%,
            transparent 100%
          );
        }
        .pld-corner {
          position: absolute;
          width: 12px;
          height: 12px;
          z-index: 5;
          pointer-events: none;
          border: 1px solid rgba(204,255,61,.55);
        }
        .pld-corner-tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
        .pld-corner-br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }

        /* ---- no-image placeholder ---- */
        .pld-placeholder { position: absolute; inset: 0; background: #0e0e12; overflow: hidden; }
        .pld-watermark {
          position: absolute;
          inset: -30%;
          transform: rotate(-12deg);
          font-size: 13px;
          letter-spacing: .12em;
          line-height: 48px;
          color: rgba(255,255,255,.10);
          white-space: pre-wrap;
          word-break: break-all;
        }
        .pld-watermark::after {
          content: var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm)
                   var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm) var(--pld-wm);
        }
        .pld-ph-diag {
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent calc(50% - .5px), rgba(204,255,61,.4) 50%, transparent calc(50% + .5px));
        }
        .pld-ph-title {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 1rem;
          text-align: center;
          font-size: .65rem;
          text-transform: uppercase;
          letter-spacing: .2em;
          color: var(--muted, #8a8a93);
        }

        /* ---- RESULT caption strip ---- */
        .pld-result {
          display: flex;
          align-items: baseline;
          gap: .75rem;
          margin-top: -1px;
          padding: .7rem .9rem;
          border: 1px solid var(--line, rgba(255,255,255,.10));
          font-size: .6rem;
          text-transform: uppercase;
          letter-spacing: .16em;
          line-height: 1.4;
        }
        .pld-result-key { color: var(--accent, #ccff3d); flex-shrink: 0; }
        .pld-result-val { color: var(--muted, #8a8a93); }

        .pld-foot {
          margin-top: 2.5rem;
          font-size: .6rem;
          text-transform: uppercase;
          letter-spacing: .22em;
          color: var(--faint, #54545c);
        }

        /* ---- mobile (<768): tap-only, stacked body ---- */
        @media (max-width: 767px) {
          .pld-list { --pld-row-h: clamp(5rem, 16vw, 7rem); }
          .pld-head {
            grid-template-columns: 38px minmax(0, 1fr) 32px;
            gap: 1rem;
            padding: .9rem 0;
          }
          .pld-meta { display: none; }
          .pld-ghost { display: none; }
          .pld-idx { font-size: .65rem; }
          .pld-title { font-size: clamp(1.4rem, 6.4vw, 2rem); }
          .pld-toggle { width: 32px; height: 32px; }
          .pld-inner {
            grid-template-columns: 1fr;
            gap: 1.6rem;
            padding: 0 0 2.4rem 0;
          }
          .pld-record, .pld-aside { grid-column: 1 / -1; }
          .pld-aside { order: -1; }
          .pld-viewport { aspect-ratio: 16 / 10; }
          .pld-tagline { padding-left: 1.8rem; }
        }

        /* ---- reduced motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .pld-ghost,
          .pld-idx,
          .pld-title,
          .pld-toggle,
          .pld-toggle-v,
          .pld-head { transition: none; }
          .pld-scan { display: none; }
        }
      `}</style>
    </section>
  );
}
