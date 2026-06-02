"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Effects() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add("js-ready");

    const listeners: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];
    const on = (t: EventTarget, e: string, fn: EventListenerOrEventListenerObject) => {
      t.addEventListener(e, fn);
      listeners.push([t, e, fn]);
    };

    let booted = false;
    let cursorTick: ((t: number) => void) | null = null;
    const intervals: number[] = [];
    const rafs: number[] = [];

    /* ---------- brand variant: iterative rotation via localStorage ---------- */
    const variants = document.querySelectorAll<HTMLElement>(".nav__brand .brand-variant");
    if (variants.length) {
      let idx = 0;
      try {
        const prev = parseInt(localStorage.getItem("brandIdx") ?? "-1", 10);
        idx = (Number.isFinite(prev) ? prev + 1 : 0) % variants.length;
        localStorage.setItem("brandIdx", String(idx));
      } catch {
        idx = 0;
      }
      variants[idx].classList.add("is-active");
    }

    /* ---------- cursor — init immediately so it tracks before preloader ends ---------- */
    const initCursor = () => {
      const ring = document.getElementById("cursor");
      const dot = document.getElementById("cursorDot");
      if (!ring || !dot || window.matchMedia("(hover: none)").matches) return;

      // Park off-screen until first mouse move (avoids the top-left flash)
      let seenMouse = false;
      let mx = -200, my = -200, rx = -200, ry = -200;

      on(window, "pointermove", ((e: PointerEvent) => {
        if (!seenMouse) {
          seenMouse = true;
          ring.style.opacity = "1";
          dot.style.opacity = "1";
          rx = e.clientX; ry = e.clientY;
        }
        mx = e.clientX;
        my = e.clientY;
      }) as EventListener);

      // Start hidden; reveal on first move
      ring.style.opacity = "0";
      dot.style.opacity = "0";

      cursorTick = () => {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
        dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      };
      gsap.ticker.add(cursorTick);

      document.querySelectorAll("[data-cursor='hover']").forEach((el) => {
        on(el, "mouseenter", () => ring.classList.add("is-hover"));
        on(el, "mouseleave", () => ring.classList.remove("is-hover"));
      });
    };

    /* ---------- preloader — pure rAF, zero GSAP dependency ---------- */
    const preloader = document.getElementById("preloader");
    const counterEl = document.getElementById("counter");
    const barFill = document.getElementById("barFill");

    const runPreloader = () =>
      new Promise<void>((resolve) => {
        if (!preloader || !counterEl || !barFill) { resolve(); return; }

        // Animate the name lines via CSS class (no GSAP needed)
        document.querySelectorAll<HTMLElement>(".preloader__label .reveal-line > span")
          .forEach((el, i) => {
            el.style.transition = `transform 0.9s cubic-bezier(.22,1,.36,1) ${0.3 + i * 0.12}s`;
            el.style.transform = "translateY(0%)";
          });

        // rAF-driven counter: eases from 0 → 100 over ~1.8s
        const DURATION = 1800;
        let start: number | null = null;
        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad

        const tick = (ts: number) => {
          if (!start) start = ts;
          const elapsed = ts - start;
          const progress = Math.min(elapsed / DURATION, 1);
          const v = Math.round(ease(progress) * 100);
          counterEl.textContent = String(v);
          barFill.style.width = v + "%";
          if (progress < 1) {
            rafs.push(requestAnimationFrame(tick));
          } else {
            // short pause at 100% before dismissing
            window.setTimeout(resolve, 200);
          }
        };
        rafs.push(requestAnimationFrame(tick));
      });

    /* ---------- text splitting ---------- */
    const splitChars = (el: HTMLElement) => {
      if (el.dataset.done !== "1") {
        const text = el.textContent || "";
        el.textContent = "";
        const frag = document.createDocumentFragment();
        [...text].forEach((ch) => {
          const s = document.createElement("span");
          s.className = "char";
          s.innerHTML = ch === " " ? "&nbsp;" : ch;
          frag.appendChild(s);
        });
        el.appendChild(frag);
        el.dataset.done = "1";
      }
      return el.querySelectorAll<HTMLElement>(".char");
    };

    const splitLine = (el: HTMLElement) => {
      if (el.dataset.done !== "1") {
        const span = document.createElement("span");
        span.textContent = el.textContent;
        el.textContent = "";
        const wrap = document.createElement("span");
        wrap.className = "split-line";
        wrap.appendChild(span);
        el.appendChild(wrap);
        el.dataset.done = "1";
      }
      return el.querySelector<HTMLElement>(".split-line > span")!;
    };

    /* ---------- magnetic ---------- */
    const initMagnetic = () => {
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        on(el, "pointermove", ((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, {
            x: (e.clientX - r.left - r.width / 2) * 0.3,
            y: (e.clientY - r.top - r.height / 2) * 0.4,
            duration: 0.6,
            ease: "power3.out",
          });
        }) as EventListener);
        on(el, "pointerleave", () =>
          gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" })
        );
      });
    };

    /* ---------- smooth scroll removed ---------- */

    /* ---------- hero intro ---------- */
    const heroIntro = () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      document.querySelectorAll<HTMLElement>("#hero .hero-line[data-split]").forEach((line) => {
        const chars = splitChars(line);
        gsap.set(chars, { yPercent: 120 });
        tl.to(chars, { yPercent: 0, duration: 1.1, stagger: 0.025 }, 0);
      });
      tl.fromTo(
        "#hero .reveal-fade",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 },
        0.4
      );
    };

    /* ---------- scroll animations ---------- */
    const initScroll = () => {
      gsap.utils.toArray<HTMLElement>(".reveal-fade").forEach((el) => {
        if (el.closest("#hero") || el.closest("#preloader")) return;
        gsap.fromTo(el,
          { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }
        );
      });

      document.querySelectorAll<HTMLElement>("[data-split-lines]").forEach((el) => {
        const inner = splitLine(el);
        gsap.set(inner, { yPercent: 110 });
        gsap.to(inner, {
          yPercent: 0, duration: 1.1, ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // counters
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = parseFloat(el.dataset.count || "0");
        const suffix = el.dataset.suffix || "";
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: "top 90%", once: true,
          onEnter() {
            gsap.to(obj, {
              v: target, duration: 1.6, ease: "power2.out",
              onUpdate() {
                const val = target % 1 === 0 ? Math.round(obj.v) : obj.v.toFixed(1);
                el.innerHTML = `${val}<span>${suffix}</span>`;
              },
            });
          },
        });
      });

      // timeline progress
      const prog = document.getElementById("timelineProgress");
      if (prog)
        gsap.to(prog, {
          height: "100%", ease: "none",
          scrollTrigger: { trigger: "#timeline", start: "top 60%", end: "bottom 80%", scrub: true },
        });

      // projects
      gsap.utils.toArray<HTMLElement>(".project-visual").forEach((visual) => {
        const inner = visual.querySelector<HTMLElement>(".project-visual-inner");
        if (inner)
          gsap.fromTo(inner,
            { scale: 1.06 },
            { scale: 1, ease: "none", scrollTrigger: { trigger: visual, start: "top bottom", end: "bottom top", scrub: true } }
          );
        ScrollTrigger.create({
          trigger: visual, start: "top 82%", once: true,
          onEnter: () => visual.classList.add("is-revealed"),
        });
        on(visual, "pointermove", ((e: PointerEvent) => {
          const r = visual.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(visual, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
        }) as EventListener);
        on(visual, "pointerleave", () =>
          gsap.to(visual, { rotateY: 0, rotateX: 0, duration: 0.7, ease: "power3.out" })
        );
      });

      // marquee
      const track = document.getElementById("marqueeTrack");
      if (track) gsap.to(track, { x: -track.scrollWidth / 2, duration: 24, ease: "none", repeat: -1 });

      // nav hide/show on scroll direction
      const nav = document.getElementById("nav");
      let lastY = 0;
      if (nav)
        ScrollTrigger.create({
          start: 0, end: "max",
          onUpdate(self) {
            const y = self.scroll();
            if (y > lastY && y > 200) gsap.to(nav, { yPercent: -120, duration: 0.4, ease: "power2.out" });
            else gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power2.out" });
            lastY = y;
          },
        });
    };

    /* ---------- clock ---------- */
    const initClock = () => {
      const el = document.getElementById("clock");
      const elMob = document.getElementById("clock-mobile");
      if (!el && !elMob) return;
      const fmt = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZone: "Asia/Kolkata", hour12: false,
      });
      const tick = () => {
        const t = fmt.format(new Date()) + " IST";
        if (el) el.textContent = t;
        if (elMob) elMob.textContent = t;
      };
      tick();
      intervals.push(window.setInterval(tick, 1000));
    };

    /* ---------- boot (called once preloader is gone) ---------- */
    let ctx: gsap.Context;
    const boot = () => {
      if (booted) return;
      booted = true;
      ctx = gsap.context(() => {
        initMagnetic();
        heroIntro();
        initScroll();
        ScrollTrigger.refresh();
      });
    };

    const dismiss = () => {
      if (!preloader || !preloader.isConnected) return boot();
      gsap.timeline()
        .to(".preloader__inner, .preloader__bar", { opacity: 0, duration: 0.4 })
        .to(preloader, {
          yPercent: -100, duration: 1, ease: "power4.inOut",
          onComplete: () => preloader.remove(),
        }, "-=0.1")
        .add(boot, "-=0.6");
    };

    // ---- run ----
    initClock();
    initCursor(); // start tracking mouse immediately (hides itself until first move)

    // Hard safety: dismiss no matter what after 5s
    const safety = window.setTimeout(() => {
      if (preloader && preloader.isConnected) preloader.remove();
      boot();
    }, 5000);

    runPreloader()
      .catch(() => {})
      .finally(() => {
        clearTimeout(safety);
        dismiss();
      });

    /* ---------- cleanup ---------- */
    return () => {
      clearTimeout(safety);
      rafs.forEach((id) => cancelAnimationFrame(id));
      intervals.forEach((id) => clearInterval(id));
      listeners.forEach(([t, e, fn]) => t.removeEventListener(e, fn));
      if (cursorTick) gsap.ticker.remove(cursorTick);
      ctx?.revert();
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return null;
}
