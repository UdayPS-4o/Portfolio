"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO } from "./shared";

const LINES: { text: string; kind: "cmd" | "out" | "name" }[] = [
  { text: "$ whoami", kind: "cmd" },
  { text: "uday pratap singh parihar", kind: "name" },
  { text: "// full-stack · rpa & automation · reverse engineering", kind: "out" },
  { text: "$ cat mission.txt", kind: "cmd" },
  { text: INTRO, kind: "out" },
  { text: "$ ./join --live-room", kind: "cmd" },
  { text: "> room open. say hi in the chat ↘", kind: "out" },
];

/** 05 — Terminal: monospace boot sequence typed out line by line. */
export default function V05Terminal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      gsap.utils.toArray<HTMLElement>(".term-line").forEach((el) => {
        const full = el.dataset.text || "";
        const obj = { n: 0 };
        tl.set(el, { opacity: 1 }).to(
          obj,
          {
            n: full.length,
            duration: Math.max(0.35, full.length * 0.016),
            ease: "none",
            onUpdate: () => {
              el.textContent = full.slice(0, Math.round(obj.n));
            },
          },
          ">"
        );
      });
      tl.set(".term-cursor", { opacity: 1 });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden px-6">
      <div className="w-full max-w-[820px] rounded-xl border border-line bg-[#0b0b0f]/80 font-mono shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-accent3/80" />
          <span className="h-3 w-3 rounded-full bg-accent/80" />
          <span className="h-3 w-3 rounded-full bg-accent2/80" />
          <span className="ml-3 text-[.72rem] text-faint">visitors@udayps:~</span>
        </div>
        <div className="space-y-2 p-6 text-[clamp(.8rem,1.6vw,1.05rem)] leading-relaxed">
          {LINES.map((l, i) => (
            <p
              key={i}
              data-text={l.text}
              className={`term-line min-h-[1.2em] opacity-0 ${
                l.kind === "cmd" ? "text-accent" : l.kind === "name" ? "text-text font-bold" : "text-muted"
              }`}
            />
          ))}
          <span className="term-cursor inline-block h-[1.1em] w-[.6ch] translate-y-[.15em] animate-blink bg-accent opacity-0" />
        </div>
      </div>
    </section>
  );
}
