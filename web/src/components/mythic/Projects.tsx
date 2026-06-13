"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS } from "@/lib/projects";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";

/**
 * Projects — the original main-branch design: clean alternating two-column
 * rows (the image flips side each row), a numbered accent badge, an accent
 * reveal-overlay wipe, a subtle scrubbed image parallax and a 3D tilt on hover.
 * Self-contained (own ScrollTriggers) so it works on the mythic homepage
 * without the legacy Effects.tsx that originally drove these classes.
 */
export default function Projects() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduced = prefersReduced();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const removers: Array<() => void> = [];

    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".project-visual").forEach((visual) => {
        const inner = visual.querySelector<HTMLElement>(".project-visual-inner");

        if (reduced) {
          visual.classList.add("is-revealed");
          return;
        }

        // scrubbed parallax on the image
        if (inner) {
          gsap.fromTo(
            inner,
            { scale: 1.06 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: visual, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }

        // accent reveal-overlay wipe once in view
        ScrollTrigger.create({
          trigger: visual,
          start: "top 82%",
          once: true,
          onEnter: () => visual.classList.add("is-revealed"),
        });

        // 3D tilt on hover (fine pointers only)
        if (fine) {
          const onMove = (e: PointerEvent) => {
            const r = visual.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(visual, {
              rotateY: px * 10,
              rotateX: -py * 10,
              transformPerspective: 900,
              duration: 0.5,
              ease: "power2.out",
            });
          };
          const onLeave = () =>
            gsap.to(visual, { rotateY: 0, rotateX: 0, duration: 0.7, ease: "power3.out" });
          visual.addEventListener("pointermove", onMove);
          visual.addEventListener("pointerleave", onLeave);
          removers.push(() => {
            visual.removeEventListener("pointermove", onMove);
            visual.removeEventListener("pointerleave", onLeave);
          });
        }
      });
    }, el);

    return () => {
      removers.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="projects"
      data-section-name="04 / SELECTED WORK"
      className="relative pad-x py-[clamp(5rem,12vh,11rem)]"
    >
      <SectionHeading
        index="04"
        label="SELECTED WORK"
        title="Things I’ve built"
        className="mb-[clamp(2.5rem,7vh,5.5rem)]"
      />

      <div className="flex flex-col">
        {PROJECTS.map((p, i) => {
          const num = String(i + 1).padStart(2, "0");
          const flip = i % 2 === 1;
          return (
            <article
              key={p.title}
              data-cursor="hover"
              className={`grid grid-cols-1 items-center gap-[clamp(2rem,5vw,5rem)] pb-[clamp(3rem,7vh,6rem)] md:grid-cols-2 ${
                i > 0 ? "border-t border-line pt-[clamp(3rem,7vh,6rem)]" : ""
              }`}
            >
              {/* visual */}
              <div
                className={`project-visual relative aspect-[16/10] overflow-hidden rounded bg-surface [transform-style:preserve-3d] ${
                  flip ? "md:order-2" : ""
                }`}
              >
                <span className="absolute left-4 top-4 z-[3] rounded-full bg-accent px-[.7rem] py-[.3rem] font-display text-[.8rem] tracking-[.15em] text-black">
                  {num}
                </span>
                {p.image ? (
                  <div
                    className="project-visual-inner absolute inset-0 bg-cover bg-center will-change-transform"
                    style={{ backgroundImage: `url('${p.image}')` }}
                  />
                ) : (
                  <div className="project-visual-inner absolute inset-0 bg-gradient-to-br from-bg-soft via-[#0b0b10] to-surface will-change-transform" />
                )}
                <div className="reveal-overlay" />
              </div>

              {/* body */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 font-display text-[.78rem] uppercase tracking-[.12em] text-muted">
                  <span>{p.role}</span>
                  <i className="not-italic text-accent">/</i>
                  {p.client && (
                    <>
                      <span>{p.client}</span>
                      <i className="not-italic text-accent">/</i>
                    </>
                  )}
                  <span>{p.year}</span>
                </div>

                <h3 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-medium leading-[1.02] tracking-[-.02em]">
                  {p.title}
                </h3>

                {p.tagline && (
                  <p className="max-w-[40ch] font-display text-[clamp(1.05rem,1.7vw,1.3rem)] tracking-[-.01em] text-text">
                    {p.tagline}
                  </p>
                )}

                <p
                  className="max-w-[56ch] text-[clamp(.92rem,1.35vw,1.04rem)] text-muted [&_strong]:whitespace-nowrap [&_strong]:font-semibold [&_strong]:text-accent"
                  dangerouslySetInnerHTML={{ __html: p.desc }}
                />

                {p.bullets && (
                  <ul className="diamond-list my-[.2rem] flex max-w-[56ch] flex-col gap-[.55rem]">
                    {p.bullets.map((b) => (
                      <li key={b} className="text-[clamp(.88rem,1.3vw,.98rem)] text-muted">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-[.4rem] inline-flex items-center gap-[.6rem] font-display text-[.9rem] text-accent before:h-px before:w-[22px] before:bg-accent before:content-['']">
                  {p.highlight}
                </div>

                <div className="mt-[.3rem] flex flex-wrap gap-[.55rem]">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-[.75rem] py-[.35rem] text-[.73rem] tracking-[.04em]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
