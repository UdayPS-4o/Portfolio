"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import HeroShader from "./HeroShader";
import { GLYPHS, splitChars, scramble } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";

const ROLES = ["Full-Stack", "RPA & Automation", "Reverse Engineering"];

const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

const NAME_CLS =
  "font-display font-bold leading-[.92] tracking-[-.04em] text-[2.8rem] md:text-[clamp(3rem,11.5vw,11.5rem)]";

const toHex = (n: number) =>
  "0x" + Math.max(0, Math.round(n)).toString(16).toUpperCase().padStart(3, "0");

/**
 * Hero — 00 / SIGNAL.
 * GPU particle field behind a masked-stagger name reveal, scramble-decoded
 * roles, idle micro-glitch with RGB-split echoes, magnetic CTAs and a HUD
 * frame (coords readout, IST clock, scroll cue). All entrance choreography
 * is gated on the preloader's "mythic:booted" signal.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const fg = useRef<HTMLDivElement>(null);
  const line1 = useRef<HTMLSpanElement>(null);
  const line2 = useRef<HTMLSpanElement>(null);
  const echoA = useRef<HTMLDivElement>(null);
  const echoB = useRef<HTMLDivElement>(null);
  const divider = useRef<HTMLDivElement>(null);
  const para = useRef<HTMLParagraphElement>(null);
  const ctaRow = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const coordsEl = useRef<HTMLSpanElement>(null);
  const clockEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    const reduced = prefersReduced();
    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {}, rootEl);

    /* ── IST clock (independent of boot) ── */
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const tickClock = () => {
      if (clockEl.current) clockEl.current.textContent = fmt.format(new Date());
    };
    tickClock();
    const clockId = window.setInterval(tickClock, 1000);
    cleanups.push(() => window.clearInterval(clockId));

    /* ── live mouse-coords hex readout (rAF-throttled) ── */
    let mx = 0;
    let my = 0;
    let pending = false;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (coordsEl.current)
          coordsEl.current.textContent = `X:${toHex(mx)} Y:${toHex(my)}`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onMove));

    /* ── magnetic CTAs (fine pointers only) ── */
    if (
      !reduced &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      rootEl
        .querySelectorAll<HTMLElement>(".mhero-cta")
        .forEach((el) => cleanups.push(magnetize(el, 0.3)));
    }

    /* ── split the name now (visually identical pre-boot) ── */
    const chars = [
      ...splitChars(line1.current!),
      ...splitChars(line2.current!),
    ];
    const glyphTargets = chars.filter(
      (c) => c.textContent !== " " && c.textContent !== String.fromCharCode(160)
    );

    /* ── idle micro-glitch: one char swaps to a glyph for 90ms every 4–7s,
          echo layers flicker on for ~120ms with an RGB-split offset ── */
    let glitchTimer = 0;
    let charTimer = 0;
    let stopped = false;
    const scheduleGlitch = () => {
      if (stopped || reduced) return;
      glitchTimer = window.setTimeout(() => {
        if (stopped) return;
        const span = glyphTargets[(Math.random() * glyphTargets.length) | 0];
        if (span) {
          const orig = span.textContent;
          span.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          charTimer = window.setTimeout(() => {
            if (!stopped) span.textContent = orig;
          }, 90);
        }
        ctx.add(() => {
          [echoA.current, echoB.current].forEach((echo, i) => {
            if (!echo) return;
            gsap.fromTo(
              echo,
              { opacity: 0, x: 0 },
              {
                opacity: 0.45,
                x: (i === 0 ? 1 : -1) * gsap.utils.random(2, 4),
                y: i === 0 ? -1.5 : 1.5,
                duration: 0.06,
                ease: "none",
                yoyo: true,
                repeat: 1,
                onComplete: () => gsap.set(echo, { opacity: 0, x: 0, y: 0 }),
              }
            );
          });
        });
        scheduleGlitch();
      }, gsap.utils.random(4000, 7000));
    };
    cleanups.push(() => {
      stopped = true;
      window.clearTimeout(glitchTimer);
      window.clearTimeout(charTimer);
    });

    /* ── entrance choreography, gated on boot ── */
    cleanups.push(
      onBooted(() => {
        ctx.add(() => {
          if (reduced) {
            gsap.fromTo(
              [fg.current, hud.current],
              { opacity: 0 },
              { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.15 }
            );
            return;
          }

          // roles scramble-decode in sequence
          rootEl
            .querySelectorAll<HTMLElement>(".mhero-role")
            .forEach((el, i) => {
              gsap.delayedCall(0.1 + 0.14 * i, () => {
                cleanups.push(scramble(el, { duration: 0.8 }));
              });
            });

          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
          tl.fromTo(
            chars,
            { yPercent: 112 },
            { yPercent: 0, duration: 1.05, stagger: 0.016 },
            0.05
          );
          if (divider.current)
            tl.fromTo(
              divider.current,
              { scaleX: 0, transformOrigin: "0 50%" },
              { scaleX: 1, duration: 0.7 },
              0.5
            );
          tl.fromTo(
            [para.current, ctaRow.current],
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.85, stagger: 0.1 },
            0.55
          );
          if (hud.current)
            tl.fromTo(
              Array.from(hud.current.children),
              { opacity: 0 },
              { opacity: 1, duration: 0.6, stagger: 0.07, ease: "power2.out" },
              0.85
            );
          tl.call(scheduleGlitch);
        });
      })
    );

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / SIGNAL"
      className="relative h-[100svh] min-h-[640px] overflow-hidden"
    >
      {/* the page's only WebGL context */}
      <HeroShader className="pointer-events-none absolute inset-0 z-0" />

      {/* mobile legibility gradient over the shader */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[72%] bg-gradient-to-b from-transparent via-bg/60 to-bg md:hidden" />

      {/* ── foreground ── */}
      <div
        ref={fg}
        className="relative z-10 flex h-full flex-col pad-x pt-24 max-md:justify-end max-md:pb-20 md:pb-24 md:pt-28"
      >
        {/* roles row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:text-[.65rem]">
          {ROLES.map((r, i) => (
            <Fragment key={r}>
              {i > 0 && (
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
              )}
              <span className="mhero-role">{r}</span>
            </Fragment>
          ))}
        </div>

        <div className="md:my-auto">
          {/* name + RGB-split echo layers */}
          <div className="relative mt-6 md:mt-0">
            <h1 className={`${NAME_CLS} relative z-[2]`}>
              <span className="hero-line">
                <span ref={line1} className="block">
                  UDAY PRATAP
                </span>
              </span>
              <span className="hero-line">
                <span ref={line2} className="text-stroke block">
                  SINGH PARIHAR
                </span>
              </span>
            </h1>
            <div
              ref={echoA}
              aria-hidden="true"
              className={`${NAME_CLS} pointer-events-none absolute inset-0 z-[1] text-accent2 opacity-0 mix-blend-screen`}
            >
              UDAY PRATAP
              <br />
              SINGH PARIHAR
            </div>
            <div
              ref={echoB}
              aria-hidden="true"
              className={`${NAME_CLS} pointer-events-none absolute inset-0 z-[1] text-accent3 opacity-0 mix-blend-screen`}
            >
              UDAY PRATAP
              <br />
              SINGH PARIHAR
            </div>
          </div>

          {/* mobile divider */}
          <div
            ref={divider}
            className="mt-5 h-[2px] w-10 bg-accent md:hidden"
          />

          <p
            ref={para}
            className="mt-6 max-w-[46ch] text-[.9rem] leading-[1.6] text-muted md:mt-8 md:text-[clamp(.9rem,1.3vw,1.05rem)]"
          >
            {COPY}
          </p>

          {/* CTAs */}
          <div
            ref={ctaRow}
            className="mt-8 flex gap-4 max-md:flex-col md:mt-10 md:items-center"
          >
            <a
              href="#projects"
              data-cursor="hover"
              className="mhero-cta mhero-cta--fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-text max-md:w-full"
            >
              <span aria-hidden="true" className="mhero-cta-bg absolute inset-0 bg-accent" />
              <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
                View case files
              </span>
            </a>
            <a
              href="#contact"
              data-cursor="hover"
              className="mhero-cta inline-flex items-center justify-center border border-line px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
            >
              Transmit
            </a>
          </div>
        </div>
      </div>

      {/* ── HUD frame (desktop only) ── */}
      <div
        ref={hud}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] hidden md:block"
      >
        {/* corner brackets */}
        <div className="absolute left-[18px] top-[18px] h-5 w-5 border-l border-t border-white/15" />
        <div className="absolute right-[18px] top-[18px] h-5 w-5 border-r border-t border-white/15" />
        <div className="absolute bottom-[18px] left-[18px] h-5 w-5 border-b border-l border-white/15" />
        <div className="absolute bottom-[18px] right-[18px] h-5 w-5 border-b border-r border-white/15" />

        {/* live mouse coords (hex) */}
        <div className="absolute right-[26px] top-[5.5rem] font-mono text-[.6rem] tracking-[.18em] text-faint">
          <span ref={coordsEl}>X:0x000 Y:0x000</span>
        </div>

        {/* IST clock */}
        <div className="absolute bottom-[24px] left-[26px] font-mono text-[.6rem] tracking-[.18em] text-muted">
          <span ref={clockEl}>--:--:--</span>{" "}
          <span className="text-accent">IST</span>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-[24px] right-[26px] flex flex-col items-center gap-2">
          <span className="font-mono text-[.55rem] uppercase tracking-[.3em] text-faint">
            Scroll
          </span>
          <span className="relative block h-12 w-px overflow-hidden bg-white/10">
            <span className="absolute left-0 h-1/2 w-px animate-scrolldn bg-accent motion-reduce:animate-none" />
          </span>
        </div>
      </div>

      <style>{`
        .mhero-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .mhero-cta--fill:hover .mhero-cta-bg,
        .mhero-cta--fill:focus-visible .mhero-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        @media (prefers-reduced-motion: reduce) {
          .mhero-dot { animation: none; }
        }
      `}</style>
    </section>
  );
}
