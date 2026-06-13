"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { splitWords, scramble } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";
import { prefersReduced, onBooted, setLenis } from "@/lib/mythic/motion";

/* log the console banner once per page lifetime (survives StrictMode remounts) */
let bannerLogged = false;

const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Chrome — global orchestrator, mounted once.
 * Owns: Lenis smooth scroll, custom cursor, grain + scanline, scroll progress
 * bar, HUD readouts, all declarative data-* effects, Konami listener.
 */
export default function Chrome() {
  const progressRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const pillTextRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = prefersReduced();
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---------- bookkeeping for full teardown ---------- */
    const listeners: Array<[EventTarget, string, EventListener, AddEventListenerOptions?]> = [];
    const on = (t: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn, opts);
      listeners.push([t, type, fn, opts]);
    };
    const tickers: Array<gsap.TickerCallback> = [];
    const addTicker = (fn: gsap.TickerCallback) => {
      gsap.ticker.add(fn);
      tickers.push(fn);
    };
    const intervals: number[] = [];
    const observers: IntersectionObserver[] = [];
    const cancels: Array<() => void> = [];
    let fxCtx: gsap.Context | null = null;

    /* ================= Lenis smooth scroll ================= */
    let lenis: Lenis | null = null;
    if (!reduced) {
      lenis = new Lenis({ duration: 1.1, easing: easeOutExpo });
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      addTicker((time) => lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* anchor-click interception -> smooth scrollTo */
    on(document, "click", ((e: MouseEvent) => {
      if (e.defaultPrevented || !lenis) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const a = (e.target instanceof Element ? e.target : null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute("href") || "#";
      if (hash === "#") {
        e.preventDefault();
        lenis.scrollTo(0, { duration: 1.2, easing: easeOutExpo });
        return;
      }
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.2, easing: easeOutExpo });
      history.replaceState(null, "", hash);
    }) as EventListener);

    /* ================= progress bar + scroll % ================= */
    const setProgress = progressRef.current
      ? gsap.quickSetter(progressRef.current, "scaleX")
      : null;
    let lastPct = -1;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress?.(p);
      const pct = Math.round(p * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        if (pctRef.current) pctRef.current.textContent = `${String(pct).padStart(3, "0")}%`;
      }
    };
    on(window, "scroll", onScroll, { passive: true });
    on(window, "resize", onScroll, { passive: true });
    onScroll();

    /* ================= HUD: IST clock ================= */
    if (clockRef.current) {
      const clockEl = clockRef.current;
      const fmt = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false, timeZone: "Asia/Kolkata",
      });
      const tickClock = () => { clockEl.textContent = `${fmt.format(new Date())} IST`; };
      tickClock();
      intervals.push(window.setInterval(tickClock, 1000));
    }

    /* ================= HUD: current section readout ================= */
    if (sectionRef.current) {
      const readout = sectionRef.current;
      let current = "";
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const name = (entry.target as HTMLElement).dataset.sectionName || "";
            if (!name || name === current) continue;
            current = name;
            readout.dataset.text = name;
            if (reduced) readout.textContent = name;
            else cancels.push(scramble(readout, { duration: 0.5 }));
          }
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      document.querySelectorAll("[data-section-name]").forEach((s) => io.observe(s));
      observers.push(io);
    }

    /* ================= custom cursor (fine pointers only) ================= */
    if (finePointer && ringRef.current && dotRef.current && pillRef.current) {
      const ring = ringRef.current;
      const dot = dotRef.current;
      const pill = pillRef.current;

      let seen = false;
      let inWindow = true;
      let labelOn = false;
      let labelHostEl: HTMLElement | null = null;
      let stickEl: HTMLElement | null = null;
      let mx = -200, my = -200, rx = -200, ry = -200;
      let scale = 1, scaleTarget = 1;
      const lerpK = reduced ? 1 : 0.18;

      const sync = () => {
        const base = seen && inWindow;
        ring.style.opacity = base && !labelOn ? "1" : "0";
        dot.style.opacity = base ? "1" : "0";
        pill.classList.toggle("is-on", base && labelOn);
      };

      const applyState = (el: Element | null) => {
        const labelHost = el?.closest<HTMLElement>("[data-cursor-label]") ?? null;
        const stickHost = el?.closest<HTMLElement>("[data-cursor-stick]") ?? null;
        const hoverHost = labelHost
          ? null
          : el?.closest('[data-cursor="hover"], a[href], button, [role="button"], summary') ?? null;
        stickEl = stickHost;
        labelOn = !!labelHost;
        labelHostEl = labelHost;
        if (labelHost && pillTextRef.current) {
          pillTextRef.current.textContent = labelHost.getAttribute("data-cursor-label") || "";
        }
        ring.classList.toggle("is-hover", !!hoverHost || !!stickHost);
        sync();
      };

      on(window, "pointermove", ((e: PointerEvent) => {
        if (!seen) {
          seen = true;
          rx = e.clientX;
          ry = e.clientY;
          sync();
        }
        mx = e.clientX;
        my = e.clientY;
        // live re-read so mid-hover label swaps (COPY -> COPIED) show immediately
        if (labelHostEl && pillTextRef.current) {
          const t = labelHostEl.getAttribute("data-cursor-label") || "";
          if (pillTextRef.current.textContent !== t) pillTextRef.current.textContent = t;
        }
      }) as EventListener);

      on(document, "pointerover", ((e: PointerEvent) => {
        applyState(e.target instanceof Element ? e.target : null);
      }) as EventListener);
      on(document, "pointerout", ((e: PointerEvent) => {
        applyState(e.relatedTarget instanceof Element ? e.relatedTarget : null);
      }) as EventListener);

      on(document.documentElement, "mouseleave", () => { inWindow = false; sync(); });
      on(document.documentElement, "mouseenter", () => { inWindow = true; sync(); });
      on(window, "pointerdown", () => { scaleTarget = 0.8; });
      on(window, "pointerup", () => { scaleTarget = 1; });

      addTicker(() => {
        let tx = mx, ty = my, k = lerpK;
        if (stickEl) {
          if (stickEl.isConnected) {
            const r = stickEl.getBoundingClientRect();
            tx = r.left + r.width / 2;
            ty = r.top + r.height / 2;
            k = Math.max(k, 0.26);
          } else {
            stickEl = null;
          }
        }
        rx += (tx - rx) * k;
        ry += (ty - ry) * k;
        scale += (scaleTarget - scale) * 0.22;
        ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%) scale(${scale})`;
        dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
        pill.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      });
    }

    /* ================= Konami code -> glitch flash + event ================= */
    let konamiPos = 0;
    const runGlitch = () => {
      const g = glitchRef.current;
      if (!g || reduced) return;
      const layers = Array.from(g.querySelectorAll<HTMLElement>(".mxc-glitch-layer"));
      gsap.killTweensOf([g, ...layers]);
      g.style.display = "block";
      gsap.timeline({
        onComplete: () => {
          g.style.display = "none";
          gsap.set(layers, { xPercent: 0, yPercent: 0 });
        },
      })
        .fromTo(
          g,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.05,
            repeat: 9,
            yoyo: true,
            ease: "steps(1)",
            onRepeat: () => {
              layers.forEach((l) =>
                gsap.set(l, {
                  xPercent: gsap.utils.random(-2.5, 2.5),
                  yPercent: gsap.utils.random(-1, 1),
                })
              );
            },
          }
        )
        .set(g, { opacity: 0 });
    };
    on(window, "keydown", ((e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : k === KONAMI[0] ? 1 : 0;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        window.dispatchEvent(new CustomEvent("mythic:konami"));
        runGlitch();
      }
    }) as EventListener);

    /* ================= console banner ================= */
    if (!bannerLogged) {
      bannerLogged = true;
      console.log(
        "%c\n█ █ █▀▄ ▄▀█ █▄█   █▀▀ ▀▄▀ █▀▀\n█▄█ █▄▀ █▀█ ░█░ ▄ ██▄ █░█ ██▄\n\n%cyou found the console. press ~ or try the Konami code.\n",
        "color:#ccff3d;font-family:monospace;font-size:12px;line-height:1.25",
        "color:#8a8a93;font-family:monospace;font-size:11px"
      );
    }

    /* ================= declarative effects (after boot) ================= */
    const offBoot = onBooted(() => {
      fxCtx = gsap.context(() => {
        /* data-reveal — fade-up in view */
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          if (el.closest("#hero")) return;
          const delay = parseFloat(el.dataset.revealDelay || "0") || 0;
          gsap.fromTo(
            el,
            reduced ? { opacity: 0 } : { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              delay,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });

        /* data-split-words — word-mask stagger */
        gsap.utils.toArray<HTMLElement>("[data-split-words]").forEach((el) => {
          if (el.closest("#hero")) return;
          if (reduced) {
            gsap.fromTo(
              el,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 85%", once: true },
              }
            );
            return;
          }
          const words = splitWords(el);
          gsap.set(words, { yPercent: 110 });
          gsap.to(words, {
            yPercent: 0,
            duration: 0.9,
            ease: "power4.out",
            stagger: 0.045,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        /* data-scramble — decode once in view */
        if (!reduced) {
          gsap.utils.toArray<HTMLElement>("[data-scramble]").forEach((el) => {
            ScrollTrigger.create({
              trigger: el,
              start: "top 88%",
              once: true,
              onEnter: () => cancels.push(scramble(el)),
            });
          });
        }

        /* data-scramble-hover — re-armable on mouseenter */
        if (!reduced && finePointer) {
          gsap.utils.toArray<HTMLElement>("[data-scramble-hover]").forEach((el) => {
            on(el, "mouseenter", () => cancels.push(scramble(el, { duration: 0.55 })));
          });
        }

        /* data-parallax — scrubbed y drift (positive = moves slower) */
        if (!reduced) {
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
            const s = parseFloat(el.dataset.parallax || "0.2") || 0.2;
            gsap.fromTo(
              el,
              { y: s * 90 },
              {
                y: -s * 90,
                ease: "none",
                scrollTrigger: {
                  trigger: el.parentElement ?? el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
          });
        }

        /* data-skew — scroll-velocity skewY, clamped, lerped back */
        if (!reduced) {
          const skewEls = gsap.utils.toArray<HTMLElement>("[data-skew]");
          if (skewEls.length) {
            const setters = skewEls.map((el) => gsap.quickSetter(el, "skewY", "deg"));
            let cur = 0;
            let lastY = window.scrollY;
            addTicker((_time, deltaMs) => {
              const dt = Math.min(deltaMs, 100) / 1000;
              if (dt <= 0) return;
              const y = window.scrollY;
              const vel = (y - lastY) / dt;
              lastY = y;
              const target = gsap.utils.clamp(-4, 4, vel * 0.0045);
              cur += (target - cur) * Math.min(1, dt * 8);
              if (Math.abs(cur) < 0.005) cur = 0;
              setters.forEach((set) => set(cur));
            });
          }
        }

        /* data-count — numeric counter on enter */
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = parseFloat(el.dataset.count || "0");
          const suffix = el.dataset.suffix || "";
          const fmt = (v: number) =>
            `${target % 1 === 0 ? Math.round(v) : v.toFixed(1)}${suffix ? `<span>${suffix}</span>` : ""}`;
          ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () => {
              if (reduced) {
                el.innerHTML = fmt(target);
                return;
              }
              const obj = { v: 0 };
              gsap.to(obj, {
                v: target,
                duration: 1.6,
                ease: "power2.out",
                onUpdate: () => { el.innerHTML = fmt(obj.v); },
              });
            },
          });
        });

        /* data-magnetic — pull toward pointer */
        gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
          const s = parseFloat(el.dataset.magnetic || "") || 0.3;
          cancels.push(magnetize(el, s));
        });

        ScrollTrigger.refresh();
      });
    });

    /* ================= teardown ================= */
    return () => {
      offBoot();
      listeners.forEach(([t, type, fn, opts]) => t.removeEventListener(type, fn, opts));
      tickers.forEach((fn) => gsap.ticker.remove(fn));
      intervals.forEach((id) => clearInterval(id));
      observers.forEach((o) => o.disconnect());
      cancels.forEach((fn) => fn());
      if (glitchRef.current) gsap.killTweensOf(glitchRef.current);
      fxCtx?.revert();
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <>
      {/* scroll progress — 2px accent line */}
      <div
        ref={progressRef}
        className="fixed left-0 top-0 z-[700] h-[2px] w-full origin-left bg-accent"
        style={{ transform: "scaleX(0)" }}
        aria-hidden="true"
      />

      {/* film grain + scanline sweep */}
      <div className="grain" aria-hidden="true" />
      <div className="mxc-scan" aria-hidden="true" />

      {/* HUD — hidden below md */}
      <div className="pointer-events-none fixed inset-0 z-[700] hidden md:block" aria-hidden="true">
        <i className="mxc-corner mxc-tl" />
        <i className="mxc-corner mxc-tr" />
        <i className="mxc-corner mxc-bl" />
        <i className="mxc-corner mxc-br" />
        <div className="absolute bottom-4 left-8 flex items-center gap-2 font-mono text-[.6rem] uppercase tracking-widest text-faint">
          <span className="text-[.5rem] text-accent">◆</span>
          <span ref={sectionRef}>00 / SIGNAL</span>
        </div>
        <div className="absolute bottom-4 right-8 flex items-center gap-4 font-mono text-[.6rem] tracking-widest text-faint">
          <span ref={pctRef}>000%</span>
          <span ref={clockRef}>--:--:-- IST</span>
        </div>
      </div>

      {/* custom cursor: ring + dot + label pill */}
      <div ref={ringRef} className="cursor" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={pillRef} className="mxc-pill font-mono" aria-hidden="true">
        <span ref={pillTextRef} className="mxc-pill-in" />
      </div>

      {/* konami glitch overlay */}
      <div ref={glitchRef} className="mxc-glitch" aria-hidden="true">
        <div className="mxc-glitch-layer" />
        <div className="mxc-glitch-layer" />
        <div className="mxc-glitch-layer" />
      </div>

      <style>{`
        .mxc-scan {
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 2px;
          z-index: 9000;
          pointer-events: none;
          opacity: .04;
          background: linear-gradient(90deg, transparent, #fff 18%, #fff 82%, transparent);
          animation: mxc-scan-drift 9s linear infinite;
          will-change: transform;
        }
        @keyframes mxc-scan-drift {
          0% { transform: translateY(-4px); }
          100% { transform: translateY(100vh); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mxc-scan { display: none; }
        }

        .mxc-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 1px solid rgba(255, 255, 255, .16);
        }
        .mxc-tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
        .mxc-tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
        .mxc-bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
        .mxc-br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

        .mxc-pill {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          pointer-events: none;
          white-space: nowrap;
        }
        .mxc-pill-in {
          display: inline-block;
          background: var(--accent);
          color: #070709;
          font-size: .6rem;
          letter-spacing: .18em;
          text-transform: uppercase;
          padding: .55em 1.15em;
          border-radius: 999px;
          opacity: 0;
          transform: scale(.4);
          transition: transform .3s var(--ease), opacity .25s var(--ease);
        }
        .mxc-pill.is-on .mxc-pill-in {
          opacity: 1;
          transform: scale(1);
        }
        @media (hover: none) {
          .mxc-pill { display: none; }
        }

        .mxc-glitch {
          position: fixed;
          inset: 0;
          z-index: 9500;
          pointer-events: none;
          display: none;
          opacity: 0;
          background: rgba(204, 255, 61, .05);
        }
        .mxc-glitch-layer {
          position: absolute;
          inset: -2%;
        }
        .mxc-glitch-layer:nth-child(1) {
          background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(255, 255, 255, .07) 2px 3px);
        }
        .mxc-glitch-layer:nth-child(2) {
          background: linear-gradient(90deg, transparent 30%, rgba(124, 92, 255, .2) 50%, transparent 70%);
          mix-blend-mode: screen;
        }
        .mxc-glitch-layer:nth-child(3) {
          background: linear-gradient(90deg, transparent 20%, rgba(255, 92, 124, .18) 45%, transparent 80%);
          mix-blend-mode: screen;
        }
      `}</style>
    </>
  );
}
