"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { PROJECTS, type Project } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import { scramble } from "@/lib/mythic/text";

/* ------------------------------------------------------------------ *
 * VARIANT A — "SCHEMATIC" · self-drafting engineering sheets
 * Each project plots itself like a technical drawing as it scrolls in:
 * construction hairlines sweep, the title is revealed by an accent
 * plotter-head dot racing the baseline (clip-path wipe in its wake),
 * dimension lines + mono measurements annotate real project metrics,
 * the image draws a "detail view" frame with one leader-line callout.
 * Vertical scroll only. No modal. Hairline discipline; accent surgical.
 * Component prefix: psc-
 * ------------------------------------------------------------------ */

const SHEET_TOTAL = String(PROJECTS.length).padStart(2, "0");

/** A derived dimension: a short mono label + the real measured value. */
type Dim = { label: string; value: string };

/** zero-pad to 4 for the live coord chip. */
const pad4 = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, "0");

/**
 * Derive 2–3 real measurements per project from its actual data — never
 * invented facts. Pulls a headline figure out of the highlight/desc and
 * adds role + stack-depth as instrument readouts.
 */
function deriveDims(p: Project): Dim[] {
  const dims: Dim[] = [];
  const hay = `${p.highlight} ${p.tagline ?? ""} ${p.desc}`;

  // 1) headline figure mined from the project's own copy
  if (/1M\+|million/i.test(hay)) dims.push({ label: "QUEUED", value: "1M+" });
  else if (/sub-500|500\b/i.test(p.highlight)) dims.push({ label: "POSITION", value: "<500" });
  else if (/2s|two seconds|≈2s|~2s/i.test(hay)) dims.push({ label: "LATENCY", value: "≈2s" });
  else if (/next block/i.test(hay)) dims.push({ label: "SETTLE", value: "1 BLK" });
  else if (/no public api|ui-?free|ui-only|without a browser/i.test(hay))
    dims.push({ label: "SURFACE", value: "UI-FREE" });
  else dims.push({ label: "RESULT", value: "SHIPPED" });

  // 2) secondary figure if a concurrency/scale number is present
  const conc = /(\d{2,4})\s*(?:parallel|concurren|sessions|accounts)/i.exec(hay);
  if (conc) dims.push({ label: "PARALLEL", value: `${conc[1]}×` });
  else if (/500\+/i.test(hay)) dims.push({ label: "SCALE", value: "500+" });
  else dims.push({ label: "VERIFIED", value: "PASS" });

  // 3) instrument readout — stack depth (always real)
  dims.push({ label: "STACK", value: `0${p.stack.length}`.slice(-2) });

  return dims.slice(0, 3);
}

/** initials for the missing-image glyph placeholder. */
function initialsOf(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export default function ProjectsSchematic() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, CustomEase);
    const root = rootRef.current;
    if (!root) return;
    // @ts-expect-error debug
    window.__PSC = { gsap, ScrollTrigger };

    // signature easings — mechanical settle for plotting, hard wipe for the head
    CustomEase.create("pscPlot", "M0,0 C0.18,0 0.28,1 1,1");
    CustomEase.create("pscSweep", "M0,0 C0.12,1 0.3,1 1,1");

    const mm = gsap.matchMedia();

    /* --- REDUCED MOTION: everything pre-drawn + static, fully readable --- */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const sheets = root.querySelectorAll<HTMLElement>(".psc-sheet");
      sheets.forEach((sheet) => {
        sheet.querySelectorAll<SVGElement>("[data-draw]").forEach((el) => {
          gsap.set(el, { drawSVG: "100%", opacity: 1 });
        });
        gsap.set(sheet.querySelectorAll<HTMLElement>(".psc-rise, .psc-dims"), { opacity: 1, y: 0 });
        gsap.set(sheet.querySelectorAll<HTMLElement>(".psc-title-wipe"), {
          clipPath: "inset(-2% -2% -2% -2%)",
        });
        gsap.set(sheet.querySelectorAll<HTMLElement>(".psc-detail-img"), {
          opacity: 1,
          scale: 1,
        });
      });
    });

    /* --- MOTION (desktop + mobile share the plot; desktop adds life) ---
       One callback for both; `desktop`/`mobile` conditions select the extras
       (parallax + crosshair are desktop-only). The callback re-runs when the
       breakpoint crosses 768, and matchMedia reverts the prior run cleanly. */
    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
      const isDesktop = (ctx.conditions as { desktop: boolean } | undefined)?.desktop ?? false;
      const sheets = Array.from(root.querySelectorAll<HTMLElement>(".psc-sheet"));
      // per-run cleanups — returned so matchMedia tears them down on a
      // breakpoint flip (desktop<->mobile), not just on unmount.
      const localCleanups: Array<() => void> = [];

      sheets.forEach((sheet) => {
        const svg = sheet.querySelector<SVGSVGElement>(".psc-svg");
        const construction = sheet.querySelectorAll<SVGElement>("[data-draw='construction']");
        const dimLines = sheet.querySelectorAll<SVGElement>("[data-draw='dim']");
        const frame = sheet.querySelectorAll<SVGElement>("[data-draw='frame']");
        const leader = sheet.querySelector<SVGElement>("[data-draw='leader']");
        const titleWipe = sheet.querySelector<HTMLElement>(".psc-title-wipe");
        const head = sheet.querySelector<SVGElement>(".psc-head");
        const detailImg = sheet.querySelector<HTMLElement>(".psc-detail-img");
        const detailLabel = sheet.querySelector<HTMLElement>(".psc-detail-label");
        const callout = sheet.querySelector<HTMLElement>(".psc-callout");
        const rises = sheet.querySelectorAll<HTMLElement>(".psc-rise");

        // INITIAL hidden/offset states — JS only, so JS-off stays readable
        gsap.set([construction, dimLines, frame], { drawSVG: "0%" });
        if (leader) gsap.set(leader, { drawSVG: "0%" });
        if (titleWipe) gsap.set(titleWipe, { clipPath: "inset(-2% 102% -2% -2%)" });
        if (head) gsap.set(head, { opacity: 0 });
        if (detailImg) gsap.set(detailImg, { opacity: 0, scale: 1.04 });
        if (detailLabel) gsap.set(detailLabel, { opacity: 0 });
        if (callout) gsap.set(callout, { opacity: 0, y: 10 });
        gsap.set(rises, { opacity: 0, y: 20 });
        const dimReadoutInit = sheet.querySelector<HTMLElement>(".psc-dims");
        if (dimReadoutInit) gsap.set(dimReadoutInit, { opacity: 0, y: 12 });

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: sheet, start: "top 78%", once: true },
        });

        // 1) construction hairlines sweep in
        tl.to(construction, { drawSVG: "100%", duration: 0.55, ease: "pscSweep" }, 0);

        // 2) title plot — plotter head races the baseline, wipe in its wake.
        // head cx 40 -> 600 across the title region while the clip-path inset
        // peels open left->right, so letters appear in the dot's wake.
        if (titleWipe && head) {
          tl.set(head, { opacity: 1 }, 0.28);
          tl.fromTo(
            head,
            { attr: { cx: 40 } },
            { attr: { cx: 600 }, duration: 0.7, ease: "pscPlot" },
            0.3,
          );
          tl.to(
            titleWipe,
            { clipPath: "inset(-2% -2% -2% -2%)", duration: 0.7, ease: "pscPlot" },
            0.3,
          );
          tl.to(head, { opacity: 0, duration: 0.2 }, 0.98);
        }

        // 3) dimension lines + measurements (mono readouts annotate in sync)
        const dimReadout = sheet.querySelector<HTMLElement>(".psc-dims");
        tl.to(dimLines, { drawSVG: "100%", duration: 0.5, stagger: 0.08, ease: "power2.out" }, 0.6);
        if (dimReadout) tl.to(dimReadout, { opacity: 1, y: 0, duration: 0.45 }, 0.78);

        // 4) detail view — frame border draws, image scales in, label + leader
        tl.to(frame, { drawSVG: "100%", duration: 0.55, ease: "power2.out" }, 0.7);
        if (detailImg) tl.to(detailImg, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, 0.78);
        if (detailLabel) tl.to(detailLabel, { opacity: 1, duration: 0.4 }, 1.0);
        if (leader) tl.to(leader, { drawSVG: "100%", duration: 0.4, ease: "power2.out" }, 1.02);
        if (callout) tl.to(callout, { opacity: 1, y: 0, duration: 0.5 }, 1.1);

        // 5) tagline + desc + bullets + stack rise in
        tl.to(rises, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 }, 1.0);

        // --- IDLE LIFE (IO + document.hidden gated) ---
        const reticle = sheet.querySelector<SVGElement>(".psc-reticle");
        const scrambleTarget = sheet.querySelector<HTMLElement>(".psc-dim-scramble");
        let inView = false;
        let reticleId = 0;
        let scrambleId = 0;
        let reticleTimer: number | undefined;
        let scrambleTimer: number | undefined;
        let quarter = 0;
        let cancelScramble: (() => void) | null = null;

        const stopLoops = () => {
          if (reticleTimer !== undefined) window.clearTimeout(reticleTimer);
          if (scrambleTimer !== undefined) window.clearTimeout(scrambleTimer);
          reticleTimer = undefined;
          scrambleTimer = undefined;
          reticleId += 1;
          scrambleId += 1;
        };

        const tickReticle = (myId: number) => {
          if (myId !== reticleId || !inView || document.hidden) return;
          reticleTimer = window.setTimeout(() => {
            if (myId !== reticleId || !inView || document.hidden) return;
            quarter += 90;
            if (reticle) gsap.to(reticle, { rotation: quarter, duration: 0.6, ease: "power3.inOut", svgOrigin: "40 40" });
            tickReticle(myId);
          }, 7000);
        };
        const tickScramble = (myId: number) => {
          if (myId !== scrambleId || !inView || document.hidden) return;
          scrambleTimer = window.setTimeout(() => {
            if (myId !== scrambleId || !inView || document.hidden) return;
            if (scrambleTarget) cancelScramble = scramble(scrambleTarget, { duration: 0.7 });
            tickScramble(myId);
          }, 8000);
        };
        const startLoops = () => {
          stopLoops();
          reticleId += 1;
          scrambleId += 1;
          tickReticle(reticleId);
          tickScramble(scrambleId);
        };

        const io = new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting;
            if (inView && !document.hidden) startLoops();
            else stopLoops();
          },
          { threshold: 0.18 },
        );
        io.observe(sheet);

        const onVis = () => {
          if (document.hidden) stopLoops();
          else if (inView) startLoops();
        };
        document.addEventListener("visibilitychange", onVis);

        // --- DESKTOP-ONLY: blueprint parallax + crosshair + coord chip ---
        let onMove: ((e: PointerEvent) => void) | null = null;
        let onLeave: (() => void) | null = null;
        if (isDesktop && svg) {
          const grid = sheet.querySelector<HTMLElement>(".psc-grid");
          const crossV = sheet.querySelector<SVGLineElement>(".psc-cross-v");
          const crossH = sheet.querySelector<SVGLineElement>(".psc-cross-h");
          const coord = sheet.querySelector<HTMLElement>(".psc-coord");
          const setGridX = grid ? (gsap.quickTo(grid, "x", { duration: 0.6, ease: "power3.out" })) : null;
          const setGridY = grid ? (gsap.quickTo(grid, "y", { duration: 0.6, ease: "power3.out" })) : null;
          let rect: DOMRect | null = null;

          onMove = (e: PointerEvent) => {
            if (!rect) rect = sheet.getBoundingClientRect();
            const r = rect;
            const px = (e.clientX - r.left) / r.width; // 0..1
            const py = (e.clientY - r.top) / r.height;
            if (setGridX) setGridX((px - 0.5) * 12);
            if (setGridY) setGridY((py - 0.5) * 12);
            // crosshair in the 0..1000 / 0..640 SVG viewBox
            const vx = px * 1000;
            const vy = py * 640;
            if (crossV) gsap.set(crossV, { attr: { x1: vx, x2: vx }, opacity: 0.5 });
            if (crossH) gsap.set(crossH, { attr: { y1: vy, y2: vy }, opacity: 0.5 });
            if (coord) {
              coord.textContent = `X ${pad4(px * 1000)} / Y ${pad4(py * 640)}`;
              gsap.set(coord, { opacity: 1 });
            }
          };
          onLeave = () => {
            rect = null;
            if (setGridX) setGridX(0);
            if (setGridY) setGridY(0);
            if (crossV) gsap.to(crossV, { opacity: 0, duration: 0.25 });
            if (crossH) gsap.to(crossH, { opacity: 0, duration: 0.25 });
            if (coord) gsap.to(coord, { opacity: 0, duration: 0.25 });
          };
          const onResize = () => { rect = null; };
          sheet.addEventListener("pointermove", onMove);
          sheet.addEventListener("pointerleave", onLeave);
          window.addEventListener("resize", onResize);
          localCleanups.push(() => {
            if (onMove) sheet.removeEventListener("pointermove", onMove);
            if (onLeave) sheet.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("resize", onResize);
          });
        }

        localCleanups.push(() => {
          stopLoops();
          cancelScramble?.();
          io.disconnect();
          document.removeEventListener("visibilitychange", onVis);
        });
      });

      return () => localCleanups.forEach((fn) => fn());
    },
    );

    /* Self-driving section: this component is mounted lazily (next/dynamic,
       ssr:false) and the audition lab only refreshes ScrollTrigger on *switch*,
       not on first mount — so triggers are born before layout is final and
       come up with start:0/end:null, never firing. Refresh on the next frame
       (and again after images load, which grow the sheets) so every trigger
       gets real pixel positions and a live scroll position. */
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    const onImgLoad = () => ScrollTrigger.refresh();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onImgLoad, { once: true });
    });

    return () => {
      cancelAnimationFrame(rafId);
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="projects"
      data-section-name="04 / CASE FILES"
      className="psc-root relative pad-x py-[clamp(5rem,12vh,11rem)]"
    >
      <SectionHeading
        index="04"
        title="CASE FILES"
        sub="engineering sheets · 04 drawings"
        className="mb-[clamp(2.5rem,7vh,5.5rem)]"
      />

      <div className="flex flex-col">
        {PROJECTS.map((p, i) => (
          <Sheet
            key={p.title}
            project={p}
            sheetNo={String(i + 1).padStart(2, "0")}
            total={SHEET_TOTAL}
            dims={deriveDims(p)}
          />
        ))}
      </div>

      <style>{`
        .psc-sheet {
          position: relative;
          isolation: isolate;
          border-top: 1px solid var(--line, rgba(255,255,255,.10));
          overflow: hidden;
        }
        .psc-sheet:last-child { border-bottom: 1px solid var(--line, rgba(255,255,255,.10)); }
        /* corner registration ticks */
        .psc-corner {
          position: absolute;
          width: 14px; height: 14px;
          pointer-events: none;
          opacity: .5;
        }
        .psc-corner::before, .psc-corner::after {
          content: ""; position: absolute; background: rgba(255,255,255,.22);
        }
        .psc-corner::before { width: 14px; height: 1px; top: 0; left: 0; }
        .psc-corner::after { width: 1px; height: 14px; top: 0; left: 0; }
        .psc-corner.tr { top: 10px; right: 10px; transform: scaleX(-1); }
        .psc-corner.tl { top: 10px; left: 10px; }
        .psc-corner.bl { bottom: 10px; left: 10px; transform: scaleY(-1); }
        .psc-corner.br { bottom: 10px; right: 10px; transform: scale(-1,-1); }

        .psc-grid {
          position: absolute; inset: -16px;
          pointer-events: none;
          will-change: transform;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 8px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 8px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 80px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 1px, transparent 1px 80px);
        }
        .psc-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
        .psc-svg [data-draw] { will-change: stroke-dashoffset; }

        .psc-title-wipe { will-change: clip-path; }

        .psc-detail-img { will-change: transform, opacity; }

        .psc-reticle { transform-box: fill-box; transform-origin: 50% 50%; }

        .psc-coord {
          opacity: 0;
          will-change: opacity;
        }

        /* missing-image glyph placeholder */
        .psc-ph {
          background-color: var(--bg-soft, #0e0e12);
          background-image: repeating-linear-gradient(-12deg,
            rgba(255,255,255,.10) 0 1px, transparent 1px 4px);
        }
        .psc-ph-watermark {
          position: absolute; inset: -20%;
          display: grid; place-content: start;
          font-family: var(--font-mono, "JetBrains Mono", monospace);
          font-size: 13px; line-height: 48px; letter-spacing: .2em;
          color: rgba(255,255,255,.10);
          transform: rotate(-12deg);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
        }

        /* Mobile: reduced SVG density — keep construction + ONE dimension line;
           drop the right-region frame/leader (image is its own block now) and
           the second arrowhead + crosshair. Image-on-top is handled by order-1. */
        @media (max-width: 767px) {
          .psc-svg-detail { display: none; }
          .psc-grid {
            background-image:
              repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 10px),
              repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 10px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .psc-grid { transform: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Single sheet — a self-plotting engineering drawing for one project.
 * SVG overlay carries the construction/dimension/leader hairlines so
 * DrawSVG can plot them; HTML carries the readable content on top.
 * ------------------------------------------------------------------ */
function Sheet({
  project: p,
  sheetNo,
  total,
  dims,
}: {
  project: Project;
  sheetNo: string;
  total: string;
  dims: Dim[];
}) {
  const initials = initialsOf(p.title);
  const titleblock: Array<[string, string]> = [
    ["PROJECT", p.title],
    ["CLIENT", p.client ?? "—"],
    ["ROLE", p.role],
    ["YEAR", p.year],
    ["SHEET", `${sheetNo} OF ${total}`],
    ["SCALE", "1:1"],
    ["REV", "2.0"],
  ];

  return (
    <article
      className="psc-sheet group flex min-h-[96vh] flex-col justify-center px-1 py-[clamp(2.5rem,8vh,5rem)] md:px-4"
      aria-label={`Engineering sheet ${sheetNo} of ${total}: ${p.title}`}
      data-cursor="hover"
    >
      {/* blueprint grid backdrop */}
      <div aria-hidden className="psc-grid" />
      {/* corner registration ticks */}
      <span aria-hidden className="psc-corner tl" />
      <span aria-hidden className="psc-corner tr" />
      <span aria-hidden className="psc-corner bl" />
      <span aria-hidden className="psc-corner br" />

      {/* SVG hairline overlay (construction / dimension / leader / crosshair / reticle).
          preserveAspectRatio=none stretches the viewBox to fill the sheet; strokes
          therefore scale ~uniformly (sheet ≈ viewBox aspect) and stay hairline.
          NOTE: DrawSVG cannot measure non-scaling-stroke under non-proportional
          scaling, so we deliberately let strokes scale (no vector-effect). */}
      <svg
        className="psc-svg"
        viewBox="0 0 1000 640"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* construction lines — horizontal title baseline + vertical gutter */}
        <line
          data-draw="construction"
          x1="0" y1="206" x2="640" y2="206"
          stroke="rgba(255,255,255,.16)" strokeWidth="1"
        />
        <line
          data-draw="construction"
          x1="600" y1="40" x2="600" y2="600"
          stroke="rgba(255,255,255,.12)" strokeWidth="1"
        />

        {/* dimension line + arrowheads (left drawing region), drawn after title.
            Mobile keeps just one dimension line (reduced density, spec §A.4). */}
        <g>
          <line
            data-draw="dim"
            x1="40" y1="250" x2="430" y2="250"
            stroke="var(--accent, #ccff3d)" strokeWidth="1" strokeOpacity=".7"
          />
          <path data-draw="dim" d="M40 250 L52 245 M40 250 L52 255"
            stroke="var(--accent, #ccff3d)" strokeWidth="1" fill="none" />
          <path data-draw="dim" className="psc-svg-detail" d="M430 250 L418 245 M430 250 L418 255"
            stroke="var(--accent, #ccff3d)" strokeWidth="1" fill="none" />
        </g>

        {/* image detail-view frame border (right region) — desktop only */}
        <rect
          data-draw="frame" className="psc-svg-detail"
          x="640" y="120" width="320" height="300"
          fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1"
        />

        {/* leader line from the callout note to a point on the image — desktop only */}
        <polyline
          data-draw="leader" className="psc-svg-detail"
          points="560,470 660,470 720,330"
          fill="none" stroke="var(--accent, #ccff3d)" strokeWidth="1" strokeOpacity=".75"
        />
        <circle data-draw="leader" className="psc-svg-detail" cx="720" cy="330" r="3"
          fill="none" stroke="var(--accent, #ccff3d)" strokeWidth="1" />

        {/* plotter-head dot (races the title baseline left->right) */}
        <circle className="psc-head" cx="40" cy="206" r="4"
          fill="var(--accent, #ccff3d)" />

        {/* desktop crosshair */}
        <line className="psc-cross-v psc-svg-detail" x1="0" y1="0" x2="0" y2="640"
          stroke="var(--accent, #ccff3d)" strokeWidth="1"
          style={{ opacity: 0 }} />
        <line className="psc-cross-h psc-svg-detail" x1="0" y1="0" x2="1000" y2="0"
          stroke="var(--accent, #ccff3d)" strokeWidth="1"
          style={{ opacity: 0 }} />
      </svg>

      {/* ===== CONTENT LAYER ===== */}
      <div className="relative z-[2] grid grid-cols-1 items-center gap-[clamp(2rem,5vh,4rem)] md:grid-cols-12 md:gap-8">
        {/* LEFT 7 — the drawing (title + annotations). Mobile: text below the
            detail view (spec §A.4 — image full-width above the text). */}
        <div className="order-2 flex flex-col gap-[clamp(1.1rem,2.6vh,1.8rem)] md:order-1 md:col-span-7">
          {/* mono header (acts as compact titleblock on mobile) */}
          <div className="psc-rise flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.18em] text-muted">
            <span className="text-accent">SHEET {sheetNo} / {total}</span>
            <span>{p.client ? `${p.client} · ${p.year}` : p.year}</span>
            <span>{p.role}</span>
          </div>

          {/* title — clip-wipe revealed by the plotter head */}
          <h3 className="psc-title-wipe break-words font-display font-bold leading-[.92] tracking-[-.03em] text-[clamp(2.6rem,5.5vw,6rem)]">
            {p.title}
          </h3>

          {/* dimension measurements (mirror the SVG dimension lines) */}
          <ul className="psc-dims flex flex-wrap gap-x-6 gap-y-2 font-mono text-[.62rem] uppercase tracking-[.16em]">
            {dims.map((d, di) => (
              <li key={d.label} className="flex items-center gap-2">
                <span className="text-faint">{d.label}</span>
                <span
                  className={`text-accent ${di === 0 ? "psc-dim-scramble" : ""}`}
                >
                  {d.value}
                </span>
              </li>
            ))}
          </ul>

          {/* tagline */}
          {p.tagline && (
            <p className="psc-rise flex max-w-[40ch] gap-3 font-display text-[clamp(1.05rem,1.7vw,1.4rem)] leading-snug tracking-[-.01em] text-text before:mt-[.7em] before:h-px before:w-7 before:shrink-0 before:bg-accent before:content-['']">
              {p.tagline}
            </p>
          )}

          {/* full description */}
          <p
            className="psc-rise max-w-[56ch] text-[clamp(.9rem,1.15vw,1rem)] leading-[1.7] text-muted [&_strong]:font-medium [&_strong]:text-accent"
            dangerouslySetInnerHTML={{ __html: p.desc }}
          />

          {/* ALL bullets — mono annotation notes */}
          {p.bullets && p.bullets.length > 0 && (
            <ul className="psc-rise diamond-list flex max-w-[58ch] flex-col gap-[.5rem]">
              {p.bullets.map((b) => (
                <li key={b} className="text-[.86rem] leading-relaxed text-muted">
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* stack chips */}
          <div className="psc-rise flex flex-wrap gap-2">
            {p.stack.map((s) => (
              <span
                key={s}
                className="rounded border border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted transition-colors duration-300 hover:border-accent/60 hover:text-text"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT 5 — the "detail view" (framed image) + callout note.
            order-1 on mobile so the image sits above the text. */}
        <div className="relative order-1 md:order-2 md:col-span-5">
          <div className="relative">
            {/* DETAIL label */}
            <span className="psc-detail-label absolute -top-6 left-0 z-[3] font-mono text-[.58rem] uppercase tracking-[.2em] text-accent">
              DETAIL A · SCALE 2:1
            </span>

            <div className="relative aspect-[4/3] overflow-hidden border border-line bg-bg-soft md:aspect-[16/14]">
              {p.image ? (
                <img
                  src={p.image}
                  alt={`${p.title} schematic detail view`}
                  loading="lazy"
                  className="psc-detail-img absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="psc-detail-img psc-ph absolute inset-0 h-full w-full overflow-hidden">
                  <span aria-hidden className="psc-ph-watermark">
                    {Array.from({ length: 8 })
                      .map(() => `${initials} 0x // `)
                      .join("")}
                  </span>
                  {/* one accent diagonal hairline */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-px w-[160%] origin-top-left bg-accent/40"
                    style={{ transform: "rotate(36deg)" }}
                  />
                  <span className="absolute inset-0 grid place-content-center font-mono text-[.7rem] uppercase tracking-[.24em] text-muted">
                    {p.title}
                  </span>
                </div>
              )}
              {/* detail-view inner corner ticks */}
              <span aria-hidden className="psc-corner tl" />
              <span aria-hidden className="psc-corner br" />
            </div>

            {/* leader callout note — bullet #1 */}
            {p.bullets && p.bullets[0] && (
              <div className="psc-callout mt-3 max-w-[34ch] border border-line bg-bg-soft/70 px-3 py-2 font-mono text-[.6rem] leading-relaxed tracking-[.04em] text-muted md:absolute md:-bottom-4 md:left-[-2rem] md:mt-0 md:bg-bg/85">
                <span className="mr-2 text-accent">A ▸</span>
                {p.bullets[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== TITLEBLOCK (bottom-left, mono bordered cells) ===== */}
      <div className="relative z-[2] mt-[clamp(2rem,5vh,4rem)] hidden w-full max-w-[640px] grid-cols-[auto_1fr] border border-line md:grid">
        {titleblock.map(([k, v]) => (
          <div key={k} className="contents">
            <div className="border-b border-r border-line px-3 py-1.5 font-mono text-[.56rem] uppercase tracking-[.22em] text-faint last:border-b-0">
              {k}
            </div>
            <div className="truncate border-b border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.14em] text-muted">
              {v}
            </div>
          </div>
        ))}
        {/* coord chip lives in the titleblock footer (desktop crosshair readout) */}
        <div className="col-span-2 border-t border-line px-3 py-1.5">
          <span className="psc-coord font-mono text-[.58rem] tracking-[.14em] text-accent">
            X 0000 / Y 0000
          </span>
        </div>
      </div>

      {/* top-right reticle — outer group drifts (continuous CSS spin),
          inner .psc-reticle takes the GSAP 90° idle snap */}
      <svg
        aria-hidden
        className="pointer-events-none absolute right-[clamp(.75rem,3vw,2.5rem)] top-[clamp(2rem,6vh,4rem)] z-[2] h-12 w-12 md:h-16 md:w-16"
        viewBox="0 0 80 80"
      >
        <g className="psc-spin-slow" style={{ transformOrigin: "40px 40px" }}>
          <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
          <circle cx="40" cy="40" r="20" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
        </g>
        <g className="psc-reticle" style={{ transformOrigin: "40px 40px" }}>
          <line x1="40" y1="4" x2="40" y2="16" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
          <line x1="40" y1="64" x2="40" y2="76" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
          <line x1="4" y1="40" x2="16" y2="40" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
          <line x1="64" y1="40" x2="76" y2="40" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
          <circle cx="40" cy="40" r="2.5" fill="none" stroke="var(--accent, #ccff3d)" strokeWidth="1" />
        </g>
        <style>{`
          .psc-spin-slow { animation: psc-spin 60s linear infinite; }
          @keyframes psc-spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) {
            .psc-spin-slow { animation: none !important; }
          }
        `}</style>
      </svg>
    </article>
  );
}
