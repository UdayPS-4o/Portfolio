"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { Project } from "@/lib/projects";
import { magnetize } from "@/lib/mythic/magnetic";
import { lockScroll, unlockScroll, prefersReduced } from "@/lib/mythic/motion";

type Props = {
  project: Project;
  index: number;
  total: number;
  onClose: () => void;
};

export default function ProjectOverlay({ project, index, total, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const rootEl = rootRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!rootEl || !panel || !backdrop) {
      onCloseRef.current();
      return;
    }
    if (prefersReduced()) {
      gsap.to(rootEl, { opacity: 0, duration: 0.2, ease: "power2.in", onComplete: () => onCloseRef.current() });
      return;
    }
    gsap
      .timeline({ onComplete: () => onCloseRef.current() })
      .to(panel, { y: 56, opacity: 0, duration: 0.4, ease: "power3.in" }, 0)
      .to(backdrop, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.08);
  }, []);

  /* entrance + scroll lock (layout effect: initial states set before first paint) */
  useLayoutEffect(() => {
    lockScroll();
    const ctx = gsap.context(() => {
      if (prefersReduced()) {
        gsap.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
        return;
      }
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(
        panelRef.current,
        { y: 90, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: "expo.out", delay: 0.05 },
      );
      gsap.fromTo(
        ".mpo-stagger",
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power4.out", stagger: 0.07, delay: 0.18 },
      );
    }, rootRef);
    return () => {
      ctx.revert();
      unlockScroll();
    };
  }, []);

  /* focus trap, ESC, magnetic close button */
  useEffect(() => {
    const rootEl = rootRef.current;
    closeRef.current?.focus();
    const unmagnetize = closeRef.current ? magnetize(closeRef.current, 0.35) : undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !rootEl) return;
      const focusables = Array.from(
        rootEl.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first || !rootEl.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !rootEl.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unmagnetize?.();
    };
  }, [requestClose]);

  const num = String(index + 1).padStart(2, "0");
  const tot = String(total).padStart(2, "0");

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Case file ${num} of ${tot}: ${project.title}`}
      className="fixed inset-0 z-[850]"
    >
      <div ref={backdropRef} aria-hidden className="absolute inset-0 bg-bg/95 backdrop-blur-md" />

      <button
        ref={closeRef}
        type="button"
        onClick={requestClose}
        data-cursor="hover"
        aria-label="Close case file"
        className="absolute right-[clamp(1rem,3vw,2.25rem)] top-[clamp(1rem,3vw,2rem)] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg-soft/90 text-muted outline-none transition-colors duration-300 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
      >
        <span aria-hidden className="font-mono text-base leading-none">
          ✕
        </span>
      </button>

      <div
        data-lenis-prevent
        className="absolute inset-0 z-10 overflow-y-auto overscroll-contain"
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div
          ref={panelRef}
          className="mx-auto w-full max-w-4xl px-[clamp(1.25rem,5vw,3rem)] pb-[clamp(4rem,9vh,6rem)] pt-[clamp(4.5rem,11vh,7.5rem)]"
        >
          {/* header row */}
          <div className="mpo-stagger flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5 font-mono text-[.62rem] uppercase tracking-[.22em] text-muted">
            <span>
              <span className="text-accent">
                File {num}/{tot}
              </span>{" "}
              — case detail
            </span>
            <span
              aria-hidden
              className="-rotate-3 rounded-[2px] border border-accent3/50 px-2.5 py-1 text-[.58rem] tracking-[.3em] text-accent3/90"
            >
              Declassified
            </span>
          </div>

          <h2 className="mpo-stagger mt-[clamp(1.5rem,4vh,2.5rem)] break-words font-display text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[.95] tracking-[-.03em]">
            {project.title}
          </h2>

          {project.tagline && (
            <p className="mpo-stagger mt-4 flex max-w-[40ch] gap-3 font-display text-[clamp(1.1rem,2vw,1.5rem)] leading-snug tracking-[-.01em] text-text before:mt-[.7em] before:h-px before:w-8 before:shrink-0 before:bg-accent before:content-['']">
              {project.tagline}
            </p>
          )}

          {/* meta row */}
          <dl className="mpo-stagger mt-[clamp(2rem,5vh,3rem)] grid grid-cols-1 gap-y-4 border-y border-line py-5 sm:grid-cols-3">
            {(
              [
                ["Client", project.client ?? "Independent"],
                ["Year", project.year],
                ["Role", project.role],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt className="font-mono text-[.58rem] uppercase tracking-[.26em] text-faint">{k}</dt>
                <dd className="font-display text-[.95rem] text-text">{v}</dd>
              </div>
            ))}
          </dl>

          <p
            className="mpo-stagger mt-[clamp(2rem,5vh,3rem)] max-w-[62ch] text-[clamp(.95rem,1.2vw,1.05rem)] leading-[1.75] text-muted [&_strong]:font-medium [&_strong]:text-accent"
            dangerouslySetInnerHTML={{ __html: project.desc }}
          />

          {project.bullets && (
            <div className="mpo-stagger mt-[clamp(2rem,5vh,3rem)]">
              <h3 className="font-mono text-[.62rem] uppercase tracking-[.26em] text-faint">Operation notes</h3>
              <ul className="diamond-list mt-4 flex max-w-[62ch] flex-col gap-3">
                {project.bullets.map((b) => (
                  <li key={b} className="text-[.92rem] leading-relaxed text-muted">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* stamped pull-quote */}
          <figure className="mpo-stagger mt-[clamp(2.5rem,6vh,4rem)] max-w-xl -rotate-1 border-2 border-accent/50 px-6 py-5 outline outline-1 outline-offset-4 outline-accent/15 md:px-8 md:py-6">
            <figcaption className="font-mono text-[.58rem] uppercase tracking-[.3em] text-accent">Outcome</figcaption>
            <blockquote className="mt-2 font-display text-[clamp(1.25rem,2.6vw,1.9rem)] font-medium leading-[1.15] tracking-[-.02em] text-text">
              {project.highlight}
            </blockquote>
          </figure>

          <div className="mpo-stagger mt-[clamp(2.5rem,6vh,4rem)]">
            <h3 className="font-mono text-[.62rem] uppercase tracking-[.26em] text-faint">Toolchain</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded-[3px] border border-line px-[.7rem] py-[.4rem] font-mono text-[.62rem] uppercase tracking-[.14em] text-muted transition-colors duration-300 hover:border-accent/70 hover:text-text"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <p className="mpo-stagger mt-[clamp(3rem,7vh,4.5rem)] border-t border-line pt-5 font-mono text-[.58rem] uppercase tracking-[.26em] text-faint">
            Esc to close · file {num} of {tot}
          </p>
        </div>
      </div>
    </div>
  );
}
