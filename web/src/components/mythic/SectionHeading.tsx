"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitChars } from "@/lib/mythic/text";
import { prefersReduced } from "@/lib/mythic/motion";

type Props = {
  index: string;
  /** big display heading */
  title: string;
  /** small category in the meta row ("index / label"); defaults to title */
  label?: string;
  sub?: string;
  className?: string;
};

export default function SectionHeading({ index, title, label, sub, className = "" }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const diamondRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      if (prefersReduced()) {
        gsap.fromTo(
          root,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: root, start: "top 88%", once: true },
          }
        );
        return;
      }

      const chars = titleRef.current ? splitChars(titleRef.current) : [];
      gsap.set(chars, { yPercent: 110 });

      const tl = gsap.timeline({
        defaults: { ease: "power4.out" },
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
      });

      if (metaRef.current) {
        tl.fromTo(
          metaRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0
        );
      }
      if (diamondRef.current) {
        tl.fromTo(
          diamondRef.current,
          { scale: 0 },
          { scale: 1, duration: 0.5, ease: "back.out(2.5)" },
          0.08
        );
      }
      tl.to(chars, { yPercent: 0, duration: 1.1, stagger: 0.02 }, 0.1);
      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.5
        );
      }
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <header ref={rootRef} className={`mxsh ${className}`}>
      <div
        ref={metaRef}
        className="flex items-baseline gap-4 border-t border-line pt-5 font-mono text-[.65rem] uppercase tracking-[.18em] text-muted"
      >
        <span className="flex items-center gap-3">
          <i
            ref={diamondRef}
            className="inline-block h-2 w-2 shrink-0 rotate-45 bg-accent"
            aria-hidden="true"
          />
          {index} / {label ?? title}
        </span>
      </div>

      <div className="-mb-[.12em] mt-5 overflow-hidden pb-[.12em]">
        <h2
          ref={titleRef}
          className="font-display text-[clamp(2.8rem,8vw,7.5rem)] font-bold leading-[.92] tracking-[-.03em]"
        >
          {title}
        </h2>
      </div>

      {sub ? (
        <p
          ref={subRef}
          className="mt-4 text-right font-mono text-[.65rem] uppercase tracking-[.18em] text-faint"
        >
          {sub}
        </p>
      ) : null}
    </header>
  );
}
