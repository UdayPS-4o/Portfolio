"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "@/components/mythic/SectionHeading";
import { GLYPHS, splitChars } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";
import { prefersReduced } from "@/lib/mythic/motion";

const EMAIL = "work@udayps.com";

const SOCIALS = [
  { label: "GITHUB", href: "https://github.com/UdayPS-4o", external: true },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/uday-ps/", external: true },
  { label: "RÉSUMÉ", href: "/Resume__Uday_PS.pdf", external: true },
  { label: "CALL", href: "tel:+918819923334", external: false },
];

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null);
  const wireRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLSpanElement>(null);
  const fxRef = useRef<{ scramble: () => void; toast: () => void } | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("--:--:--");

  /* live IST clock */
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* underline draw, proximity wave, magnetics, scramble + toast machinery */
  useEffect(() => {
    const root = rootRef.current;
    const wire = wireRef.current;
    const toast = toastRef.current;
    const emailEl = wire?.querySelector<HTMLElement>(".ct-email");
    if (!root || !wire || !toast || !emailEl) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReduced();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const manual: Array<() => void> = [];
    let scrambleTween: gsap.core.Tween | null = null;
    let toastTl: gsap.core.Timeline | null = null;
    let chars: HTMLElement[] = [];
    let originals: string[] = [];
    let yTo: Array<(value: number) => void> = [];

    const ctx = gsap.context(() => {
      chars = splitChars(emailEl);
      originals = chars.map((c) => c.textContent ?? "");

      gsap.set(toast, { autoAlpha: 0, y: reduced ? 0 : 10 });

      if (!reduced) {
        gsap.fromTo(
          ".ct-underline",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "expo.inOut",
            scrollTrigger: { trigger: wire, start: "top 82%", once: true },
          },
        );
      }

      if (!reduced && fine) {
        yTo = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.35, ease: "power3.out" }));
      }
    }, root);

    /* per-char proximity wave while the wire is hovered */
    if (!reduced && fine) {
      const RADIUS = 120;
      const tint = gsap.utils.interpolate("#ededf0", "#ccff3d");
      let px = 0;
      let py = 0;
      const wave = () => {
        for (let i = 0; i < chars.length; i++) {
          const r = chars[i].getBoundingClientRect();
          const dx = px - (r.left + r.width / 2);
          const dy = py - (r.top + r.height / 2);
          const f = Math.max(0, 1 - Math.hypot(dx, dy) / RADIUS);
          yTo[i](-8 * f);
          chars[i].style.color = f > 0.02 ? tint(Math.min(1, f * 1.35)) : "";
        }
      };
      const onMove = (e: PointerEvent) => {
        px = e.clientX;
        py = e.clientY;
      };
      const onEnter = (e: PointerEvent) => {
        onMove(e);
        gsap.ticker.add(wave);
      };
      const onLeave = () => {
        gsap.ticker.remove(wave);
        for (let i = 0; i < chars.length; i++) {
          yTo[i](0);
          chars[i].style.color = "";
        }
      };
      wire.addEventListener("pointerenter", onEnter);
      wire.addEventListener("pointermove", onMove);
      wire.addEventListener("pointerleave", onLeave);
      manual.push(() => {
        gsap.ticker.remove(wave);
        wire.removeEventListener("pointerenter", onEnter);
        wire.removeEventListener("pointermove", onMove);
        wire.removeEventListener("pointerleave", onLeave);
      });
    }

    /* magnetic social links */
    if (!reduced && fine) {
      gsap.utils.toArray<HTMLElement>(".ct-social", root).forEach((el) => {
        manual.push(magnetize(el, 0.35));
      });
    }

    /* imperative fx consumed by the copy handler */
    fxRef.current = {
      scramble: () => {
        if (reduced || chars.length === 0) return;
        scrambleTween?.kill();
        const state = { p: 0 };
        scrambleTween = gsap.to(state, {
          p: 1,
          duration: 0.65,
          ease: "power1.inOut",
          onUpdate: () => {
            const solved = Math.floor(state.p * chars.length);
            for (let i = 0; i < chars.length; i++) {
              chars[i].textContent =
                i < solved ? originals[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
          },
          onComplete: () => {
            for (let i = 0; i < chars.length; i++) chars[i].textContent = originals[i];
          },
        });
      },
      toast: () => {
        toastTl?.kill();
        toastTl = gsap
          .timeline()
          .to(toast, { autoAlpha: 1, y: 0, duration: reduced ? 0.2 : 0.35, ease: "power4.out" })
          .to(
            toast,
            { autoAlpha: 0, y: reduced ? 0 : -8, duration: 0.45, ease: "power2.in" },
            "+=1.5",
          );
      },
    };

    return () => {
      fxRef.current = null;
      scrambleTween?.kill();
      toastTl?.kill();
      /* restore the real address if a scramble was cut short */
      for (let i = 0; i < chars.length; i++) {
        chars[i].textContent = originals[i];
      }
      manual.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable — the address stays readable on screen */
      }
      ta.remove();
    }
    setCopied(true);
    fxRef.current?.scramble();
    fxRef.current?.toast();
    if (wireRef.current) wireRef.current.dataset.cursorLabel = "COPIED";
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopied(false);
      if (wireRef.current) wireRef.current.dataset.cursorLabel = "COPY";
    }, 1700);
  };

  return (
    <section
      ref={rootRef}
      id="contact"
      data-section-name="06 / CONTACT"
      className="pad-x relative flex min-h-[90vh] flex-col justify-center overflow-hidden py-[clamp(5rem,12vh,9rem)]"
    >
      {/* ghost watermark */}
      <div
        aria-hidden
        data-parallax="0.25"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="text-stroke select-none whitespace-nowrap font-display text-[clamp(6rem,24vw,24rem)] font-bold uppercase leading-none tracking-[-.04em] opacity-[.05]">
          CONTACT
        </span>
      </div>

      <div className="relative z-[1]">
        <SectionHeading index="06" title="CONTACT" sub="response time: fast" />

        {/* the email wire */}
        <div data-reveal className="relative mt-[clamp(2.5rem,7vh,5rem)] w-fit">
          <p className="mb-4 font-mono text-[.65rem] uppercase tracking-[.18em] text-muted">
            PRIMARY CHANNEL — CLICK TO COPY
          </p>
          <button
            ref={wireRef}
            type="button"
            onClick={handleCopy}
            data-cursor="hover"
            data-cursor-label="COPY"
            aria-label={`Copy email address ${EMAIL} to clipboard`}
            className="ct-wire block w-fit text-left font-display text-[clamp(1.6rem,5.5vw,5rem)] font-bold leading-[1.08] tracking-[-.03em] text-text focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-accent"
          >
            <span className="ct-email block">{EMAIL}</span>
            <span
              aria-hidden
              className="ct-underline mt-[clamp(.6rem,1.2vw,1rem)] block h-[2px] w-full origin-left bg-gradient-to-r from-accent via-accent to-transparent"
            />
          </button>
          <span
            ref={toastRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-[-.6rem] border border-accent/40 bg-bg px-2.5 py-1.5 font-mono text-[.6rem] uppercase tracking-[.25em] text-accent opacity-0"
          >
            EMAIL COPIED TO CLIPBOARD
          </span>
          <span className="sr-only" role="status">
            {copied ? "Email copied to clipboard" : ""}
          </span>
        </div>

        {/* availability */}
        <div
          data-reveal
          data-reveal-delay="0.1"
          className="mt-[clamp(2.5rem,6vh,4rem)] flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[.65rem] uppercase tracking-[.18em] text-muted"
        >
          <span aria-hidden className="h-2 w-2 animate-pulse2 rounded-full bg-accent" />
          <span>STATUS: OPEN FOR SELECT OPERATIONS</span>
          <span className="text-faint">/</span>
          <span className="text-text">
            IST <span className="tabular-nums">{clock}</span>
          </span>
        </div>

        {/* socials */}
        <div
          data-reveal
          data-reveal-delay="0.2"
          className="mt-[clamp(1.8rem,4vh,2.8rem)] flex flex-wrap gap-x-9 gap-y-4"
        >
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.external ? "_blank" : undefined}
              rel={s.external ? "noopener noreferrer" : undefined}
              data-cursor="hover"
              className="ct-social group inline-flex items-center gap-2 font-mono text-[.7rem] uppercase tracking-[.2em] text-muted transition-colors duration-300 hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span>{s.label}</span>
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 ease-ease group-hover:translate-x-1.5"
              >
                -&gt;
              </span>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        .ct-wire .mchar { display: inline-block; will-change: transform; }
      `}</style>
    </section>
  );
}
