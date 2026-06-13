"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { PROJECTS, type Project } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import VelocityMarquee from "@/components/mythic/VelocityMarquee";
import { splitWords } from "@/lib/mythic/text";
import { prefersReduced } from "@/lib/mythic/motion";

/* ============================================================================
   VARIANT D — "ATLAS" · flowing editorial spreads
   Continuous vertical scroll. Each project = an asymmetric full-bleed spread,
   alternating left/right by index, with massive type, parallax imagery, a
   clip-reveal wipe, and the `highlight` as a clean stamped RESULT pull-quote.
   No pins. No horizontal traverse. Tone = engineering / instrument / editorial.
   All motion self-driven via own gsap.context + ScrollTriggers (works in the
   Chrome-less /projects-lab). Readable with JS off (hidden states set from JS).
   ========================================================================== */

const TOTAL = String(PROJECTS.length).padStart(2, "0");

/* deterministic initials for the no-image placeholder watermark */
function initials(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  const letters = words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || "PR";
}

export default function ProjectsAtlas() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    const root = rootRef.current;
    if (!root) return;

    /* signature wipe ease for the clip-reveal (expo-out feel, a touch sharper) */
    CustomEase.create("patWipe", "M0,0 C0.16,1 0.3,1 1,1");

    const removers: Array<() => void> = [];
    const mm = gsap.matchMedia();

    /* ---------- REDUCED MOTION: fades only, fully readable, no scrubs --------- */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const spreads = gsap.utils.toArray<HTMLElement>(".pat-spread", root);
      spreads.forEach((spread) => {
        gsap.set(spread.querySelectorAll<HTMLElement>(".pat-reveal"), { opacity: 0 });
        gsap.set(spread.querySelectorAll<HTMLElement>(".pat-frame"), { clipPath: "inset(0 0 0 0)" });
        gsap.fromTo(
          spread.querySelectorAll<HTMLElement>(".pat-reveal"),
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.04,
            scrollTrigger: { trigger: spread, start: "top 85%", once: true },
          },
        );
      });
    });

    /* ---------- DESKTOP: full editorial choreography ------------------------- */
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const spreads = gsap.utils.toArray<HTMLElement>(".pat-spread", root);

      spreads.forEach((spread) => {
        const numeral = spread.querySelector<HTMLElement>(".pat-numeral");
        const titleEl = spread.querySelector<HTMLElement>(".pat-title");
        const frame = spread.querySelector<HTMLElement>(".pat-frame");
        const media = spread.querySelector<HTMLElement>(".pat-media");
        const reveals = gsap.utils.toArray<HTMLElement>(".pat-reveal", spread);

        /* --- giant index numeral: parallax scrub, slower than scroll --- */
        if (numeral) {
          gsap.fromTo(
            numeral,
            { yPercent: -14 },
            {
              yPercent: 14,
              ease: "none",
              scrollTrigger: { trigger: spread, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        /* --- image parallax inside the overflow-hidden frame (−8% → 8%) --- */
        if (media) {
          gsap.fromTo(
            media,
            { yPercent: -8 },
            {
              yPercent: 8,
              ease: "none",
              scrollTrigger: { trigger: frame ?? spread, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        /* --- title: mask-rise per word, top 82% --- */
        if (titleEl) {
          const words = splitWords(titleEl);
          gsap.set(words, { yPercent: 115 });
          gsap.to(words, {
            yPercent: 0,
            duration: 1.05,
            ease: "expo.out",
            stagger: 0.07,
            scrollTrigger: { trigger: spread, start: "top 82%", once: true },
          });
        }

        /* --- frame clip-reveal wipe + counter-scaling image on enter --- */
        if (frame) {
          gsap.set(frame, { clipPath: "inset(0 0 100% 0)" });
          const tl = gsap.timeline({
            scrollTrigger: { trigger: frame, start: "top 80%", once: true },
          });
          tl.to(frame, { clipPath: "inset(0 0 0% 0)", duration: 1.15, ease: "patWipe" }, 0);
          if (media) tl.fromTo(media, { scale: 1.18 }, { scale: 1, duration: 1.25, ease: "expo.out" }, 0);
        }

        /* --- text column stagger (y 24 → 0) --- */
        if (reveals.length) {
          gsap.set(reveals, { y: 24, opacity: 0 });
          gsap.to(reveals, {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            stagger: 0.06,
            scrollTrigger: { trigger: spread, start: "top 72%", once: true },
          });
        }
      });

      /* --- scroll-velocity skewY on each image frame (clamp ±3deg, lerp back) --- */
      const frames = gsap.utils.toArray<HTMLElement>(".pat-frame", root);
      const setters = frames.map((f) => gsap.quickTo(f, "skewY", { duration: 0.5, ease: "power3" }));
      let skew = 0;
      const velTrigger = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const target = gsap.utils.clamp(-3, 3, self.getVelocity() / -360);
          if (Math.abs(target) > Math.abs(skew)) skew = target;
        },
      });
      const skewTick = () => {
        skew = gsap.utils.interpolate(skew, 0, 0.1);
        if (Math.abs(skew) < 0.001) skew = 0;
        setters.forEach((s) => s(skew));
      };
      gsap.ticker.add(skewTick);
      removers.push(() => {
        gsap.ticker.remove(skewTick);
        velTrigger.kill();
        setters.forEach((s) => s(0));
      });

      /* --- hover: slow color/scale lift + one-pass diagonal sheen (desktop) --- */
      frames.forEach((frame) => {
        const media = frame.querySelector<HTMLElement>(".pat-media");
        const sheen = frame.querySelector<HTMLElement>(".pat-sheen");
        let sheenTween: gsap.core.Tween | null = null;
        const onEnter = () => {
          if (media) gsap.to(media, { scale: 1.045, filter: "saturate(1.12) brightness(1.06)", duration: 0.7, ease: "power3.out" });
          if (sheen) {
            sheenTween?.kill();
            sheenTween = gsap.fromTo(
              sheen,
              { xPercent: -140, opacity: 0 },
              { xPercent: 140, opacity: 1, duration: 0.85, ease: "power2.inOut", onComplete: () => gsap.set(sheen, { opacity: 0 }) },
            );
          }
        };
        const onLeave = () => {
          if (media) gsap.to(media, { scale: 1, filter: "saturate(1) brightness(1)", duration: 0.9, ease: "power3.out" });
        };
        frame.addEventListener("mouseenter", onEnter);
        frame.addEventListener("mouseleave", onLeave);
        removers.push(() => {
          sheenTween?.kill();
          frame.removeEventListener("mouseenter", onEnter);
          frame.removeEventListener("mouseleave", onLeave);
        });
      });
    });

    /* ---------- MOBILE: single-col, image-on-top, light parallax ------------ */
    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const spreads = gsap.utils.toArray<HTMLElement>(".pat-spread", root);

      spreads.forEach((spread) => {
        const titleEl = spread.querySelector<HTMLElement>(".pat-title");
        const frame = spread.querySelector<HTMLElement>(".pat-frame");
        const media = spread.querySelector<HTMLElement>(".pat-media");
        const reveals = gsap.utils.toArray<HTMLElement>(".pat-reveal", spread);

        /* very light image parallax only (no skew, no numeral scrub) */
        if (media) {
          gsap.fromTo(
            media,
            { yPercent: -4 },
            {
              yPercent: 4,
              ease: "none",
              scrollTrigger: { trigger: frame ?? spread, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        if (titleEl) {
          const words = splitWords(titleEl);
          gsap.set(words, { yPercent: 115 });
          gsap.to(words, {
            yPercent: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.05,
            scrollTrigger: { trigger: spread, start: "top 84%", once: true },
          });
        }

        if (frame) {
          gsap.set(frame, { clipPath: "inset(0 0 100% 0)" });
          const tl = gsap.timeline({
            scrollTrigger: { trigger: frame, start: "top 86%", once: true },
          });
          tl.to(frame, { clipPath: "inset(0 0 0% 0)", duration: 1, ease: "patWipe" }, 0);
          if (media) tl.fromTo(media, { scale: 1.14 }, { scale: 1, duration: 1.1, ease: "expo.out" }, 0);
        }

        if (reveals.length) {
          gsap.set(reveals, { y: 20, opacity: 0 });
          gsap.to(reveals, {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.05,
            scrollTrigger: { trigger: spread, start: "top 78%", once: true },
          });
        }
      });
    });

    return () => {
      removers.forEach((fn) => fn());
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="projects"
      data-section-name="04 / CASE FILES"
      className="pat-root relative pad-x py-[clamp(5rem,12vh,11rem)]"
    >
      <SectionHeading
        index="04"
        title="CASE FILES"
        sub="selected work · 04 entries"
        className="mb-[clamp(3rem,9vh,7rem)]"
      />

      <div className="pat-spreads flex flex-col">
        {PROJECTS.map((p, i) => (
          <Spread key={p.title} project={p} index={i} total={PROJECTS.length} />
        ))}
      </div>

      <style>{`
        .pat-root { --pat-rule: rgba(255,255,255,.12); }

        .pat-numeral {
          font-variant-numeric: tabular-nums;
          will-change: transform;
        }
        .pat-frame {
          will-change: clip-path, transform;
          transform-origin: center center;
        }
        .pat-media { will-change: transform; }
        .pat-sheen {
          position: absolute;
          top: -25%;
          bottom: -25%;
          left: 0;
          width: 42%;
          opacity: 0;
          pointer-events: none;
          transform: skewX(-14deg);
          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(255,255,255,.04) 38%,
            rgba(255,255,255,.16) 50%,
            rgba(255,255,255,.04) 62%,
            transparent 100%
          );
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        .pat-placeholder {
          background-color: var(--bg-soft, #0e0e12);
          background-image: repeating-linear-gradient(
            -12deg,
            transparent 0 36px,
            rgba(255,255,255,.018) 36px 48px
          );
        }
        .pat-tagline::before {
          content: "";
          display: inline-block;
          width: 2rem;
          height: 1px;
          margin-bottom: .42em;
          margin-right: .9rem;
          background: var(--accent, #ccff3d);
          vertical-align: middle;
        }
        @media (prefers-reduced-motion: reduce) {
          .pat-numeral, .pat-media { transform: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ============================================================================
   One editorial spread. Alternates composition by index parity.
   ========================================================================== */
function Spread({ project, index, total }: { project: Project; index: number; total: number }) {
  const num = String(index + 1).padStart(2, "0");
  const left = index % 2 === 0; // even → image-left, odd → image-right (desktop)
  const isLast = index === total - 1;

  /* between-spread connector: marquee of THIS project's stack, except after the
     last spread where we drop a hairline with a mono terminal marker. */
  const stackItems = project.stack;

  return (
    <article
      className="pat-spread relative isolate flex min-h-[110vh] flex-col justify-center md:py-[clamp(3rem,8vh,7rem)]"
      aria-labelledby={`pat-title-${index}`}
    >
      {/* giant outlined index numeral — parallax, behind everything */}
      <span
        aria-hidden
        className={`pat-numeral pointer-events-none absolute top-[6%] z-0 select-none font-display font-bold leading-none text-stroke text-[30vw] opacity-[.05] md:text-[22vw] md:opacity-[.06] ${
          left ? "right-[2%] md:left-[2%] md:right-auto" : "right-[2%]"
        }`}
      >
        {num}
      </span>

      <div
        className={`relative z-10 grid grid-cols-1 items-center gap-[clamp(2rem,4vw,4rem)] md:grid-cols-12 ${
          left ? "" : "md:[direction:rtl]"
        }`}
      >
        {/* ----- IMAGE (≈58vw / 46vw alternating on desktop; on-top on mobile) ----- */}
        <div
          className={`order-1 md:[direction:ltr] ${
            left ? "md:order-1 md:col-span-7" : "md:order-2 md:col-span-6"
          }`}
        >
          <Figure project={project} index={index} />
          <p
            className={`pat-reveal mt-3 flex items-center justify-between font-mono text-[.6rem] uppercase tracking-[.18em] text-faint ${
              left ? "" : "md:flex-row-reverse md:text-right"
            }`}
          >
            <span aria-hidden>FIG. {num}</span>
            <span aria-hidden>SHEET {num} / {TOTAL}</span>
          </p>
        </div>

        {/* ----- TEXT COLUMN ----- */}
        <div
          className={`order-2 flex flex-col gap-[clamp(1.1rem,2vh,1.7rem)] md:[direction:ltr] ${
            left ? "md:order-2 md:col-span-5" : "md:order-1 md:col-span-6"
          }`}
        >
          {/* client / year / role mono row */}
          <div className="pat-reveal flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.62rem] uppercase tracking-[.18em] text-muted">
            {project.client && <span className="text-accent">{project.client}</span>}
            {project.client && <span aria-hidden className="text-faint">/</span>}
            <span>{project.year}</span>
            <span aria-hidden className="text-faint">/</span>
            <span>{project.role}</span>
          </div>

          {/* title — split into words, mask-rise from JS */}
          <h3
            id={`pat-title-${index}`}
            className="pat-title break-words font-display font-bold leading-[.92] tracking-[-.03em] text-[clamp(2.8rem,7vw,7rem)]"
          >
            {project.title}
          </h3>

          {/* tagline (display, accent rule) */}
          {project.tagline && (
            <p className="pat-reveal pat-tagline max-w-[34ch] font-display text-[clamp(1.1rem,1.7vw,1.5rem)] leading-snug tracking-[-.01em] text-text">
              {project.tagline}
            </p>
          )}

          {/* full desc */}
          <p
            className="pat-reveal max-w-[52ch] text-[clamp(.9rem,1.1vw,1.02rem)] leading-[1.75] text-muted [&_strong]:text-accent [&_strong]:font-medium"
            dangerouslySetInnerHTML={{ __html: project.desc }}
          />

          {/* all bullets (diamond) */}
          {project.bullets && project.bullets.length > 0 && (
            <ul className="pat-reveal diamond-list flex max-w-[52ch] flex-col gap-[.55rem]">
              {project.bullets.map((b) => (
                <li key={b} className="text-[.88rem] leading-relaxed text-muted">
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* stack chips */}
          <ul className="pat-reveal flex flex-wrap gap-2" aria-label="Stack">
            {project.stack.map((s) => (
              <li
                key={s}
                className="rounded border border-line px-3 py-1.5 font-mono text-[.6rem] uppercase tracking-[.12em] text-muted transition-colors duration-300 hover:border-accent/60 hover:text-text"
              >
                {s}
              </li>
            ))}
          </ul>

          {/* PULL-QUOTE — the highlight as a stamped RESULT statement */}
          <figure className="pat-reveal mt-1 border-l-2 border-accent pl-[clamp(1rem,1.4vw,1.4rem)]">
            <figcaption className="mb-2 font-mono text-[.6rem] uppercase tracking-[.3em] text-faint">
              RESULT
            </figcaption>
            <blockquote className="font-display font-medium leading-[1.15] tracking-[-.01em] text-text text-[clamp(1.4rem,2.4vw,2.2rem)]">
              {project.highlight}
            </blockquote>
          </figure>
        </div>
      </div>

      {/* ----- between-spread connector ----- */}
      {isLast ? (
        <div className="relative z-10 mt-[clamp(3rem,7vh,6rem)] flex items-center gap-4 border-t border-line pt-5">
          <span className="font-mono text-[.6rem] uppercase tracking-[.24em] text-faint">// end of file</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-accent/70" />
        </div>
      ) : (
        <div className="relative z-10 mt-[clamp(3rem,7vh,6rem)] flex items-center gap-4 border-t border-line pt-4">
          <span className="shrink-0 font-mono text-[.6rem] uppercase tracking-[.24em] text-faint">// next</span>
          <VelocityMarquee
            items={stackItems}
            baseSpeed={60}
            separator="◆"
            className="min-w-0 flex-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-faint [&_.text-accent]:text-accent/70"
          />
        </div>
      )}
    </article>
  );
}

/* ============================================================================
   The framed image (or §0.4 glyph placeholder). overflow-hidden frame that the
   clip-reveal + parallax + skew + sheen target. Aspect ratios differ by side
   on desktop; mobile is a single 4/3.
   ========================================================================== */
function Figure({ project, index }: { project: Project; index: number }) {
  const left = index % 2 === 0;
  const init = initials(project.title);

  /* alternating aspect: image-left spreads run a touch wider/landscape, image-right
     a touch taller — sells the asymmetric magazine grid within fixed columns. */
  const aspectClass = left ? "md:aspect-[16/11]" : "md:aspect-[5/4]";

  return (
    <div
      className={`pat-frame relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-bg-soft ${aspectClass}`}
      data-cursor="hover"
    >
      <div className="pat-media absolute inset-0">
        {project.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.image}
            alt={`${project.title} — project visual`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="pat-placeholder relative flex h-full w-full items-center justify-center"
            role="img"
            aria-label={`${project.title} — no image`}
          >
            {/* repeating mono glyph watermark, −12° tile */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-20%] flex flex-wrap content-start gap-x-6 gap-y-5 overflow-hidden font-mono text-[.7rem] uppercase tracking-[.2em] text-white/[.08]"
              style={{ transform: "rotate(-12deg)" } as CSSProperties}
            >
              {Array.from({ length: 80 }).map((_, k) => (
                <span key={k} className="whitespace-nowrap">
                  {init} 0x //
                </span>
              ))}
            </div>
            {/* one accent diagonal hairline */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-[-10%] top-1/2 h-px w-[120%] origin-center bg-accent/40"
              style={{ transform: "rotate(-12deg)" } as CSSProperties}
            />
            <span className="relative z-10 font-mono text-[.62rem] uppercase tracking-[.28em] text-muted">
              {project.title}
            </span>
          </div>
        )}
      </div>

      {/* one-pass diagonal sheen on hover (desktop) */}
      <span aria-hidden className="pat-sheen" />
    </div>
  );
}
