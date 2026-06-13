"use client";

import { useEffect, useRef } from "react";
import { magnetize } from "@/lib/mythic/magnetic";
import { getLenis, prefersReduced } from "@/lib/mythic/motion";

export default function Footer() {
  const topRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = topRef.current;
    if (!el || prefersReduced()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    return magnetize(el, 0.4);
  }, []);

  const backToTop = () => {
    const lenis = getLenis();
    if (lenis?.scrollTo) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    }
  };

  const openTerminal = () => {
    window.dispatchEvent(
      new CustomEvent("mythic:terminal", { detail: { open: true, cmd: "whoami" } }),
    );
  };

  return (
    <footer className="relative border-t border-line">
      <div className="pad-x grid grid-cols-1 items-center gap-y-5 py-8 text-center md:grid-cols-3 md:text-left">
        <p className="font-mono text-[.62rem] uppercase tracking-[.18em] text-faint">
          © 2026 UDAYPS — ALL SIGNALS MONITORED
        </p>

        <div className="md:text-center">
          <button
            type="button"
            onClick={openTerminal}
            title="?"
            aria-label="Run whoami in the terminal"
            data-cursor="hover"
            className="font-mono text-[.62rem] tracking-[.18em] text-faint transition-colors duration-300 hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            v2.0.0-mythic
          </button>
        </div>

        <div className="md:text-right">
          <button
            ref={topRef}
            type="button"
            onClick={backToTop}
            aria-label="Back to top"
            data-cursor="hover"
            className="group inline-flex items-center gap-2 font-mono text-[.62rem] uppercase tracking-[.18em] text-text transition-colors duration-300 hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            BACK TO TOP
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 ease-ease group-hover:-translate-y-[3px]"
            >
              ↑
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-accent to-transparent"
      />
    </footer>
  );
}
