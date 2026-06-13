"use client";

import { useEffect, useRef, type ReactNode } from "react";
import SectionHeading from "@/components/mythic/SectionHeading";
import { prefersReduced } from "@/lib/mythic/motion";

/* ------------------------------------------------------------------ copy --- */

const PARAGRAPHS: Array<{ note: string; body: ReactNode }> = [
  {
    note: "//: verified",
    body: (
      <>
        Full-stack developer drawn to the <em className="not-italic text-accent">hard, undocumented edges</em> of
        software. The work splits two ways: shipping clean product features people actually use, and building
        automation that runs at a scale the original system{" "}
        <em className="not-italic text-accent">was never designed to expect</em>.
      </>
    ),
  },
  {
    note: "//: cross-ref 03",
    body: (
      <>
        On record: <em className="not-italic text-accent">founding engineer</em> who owned an entire logistics
        platform end to end, software engineer wiring <em className="not-italic text-accent">LLM agents</em> into a
        production chatbot, freelancer <em className="not-italic text-accent">reverse-engineering encrypted APIs</em>{" "}
        — bypassing industrial queue systems and holding hundreds of concurrent sessions steady without anything
        falling over.
      </>
    ),
  },
  {
    note: "//: motive",
    body: (
      <>
        The through-line: a stubborn curiosity about{" "}
        <em className="not-italic text-accent">how things actually work</em> under the hood, and the patience to turn
        that understanding into something dependable. Currently scanning for a team that ships fast and isn&apos;t
        afraid of the messy problems.
      </>
    ),
  },
];

const STATS = [
  { value: 7, suffix: "+", label: "products shipped end-to-end" },
  { value: 4, suffix: "+", label: "platforms reverse-engineered" },
  { value: 1, suffix: "M+", label: "users out-queued in one drop" },
  { value: 3, suffix: "+", label: "years in production systems" },
];

/* -------------------------------------------------- ascii portrait engine --- */

const LIT_GLYPHS = "UPSX80@#%&▒";
const DIM_GLYPHS = " ·:+-=/\\*.";
const LETTER_W = 5;
const LETTER_H = 7;

const GLYPH_FONT: Record<string, string[]> = {
  U: ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  S: [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
};

/* "UPS" as a diagonal monogram staircase — fills a 3:4 portrait nicely. */
const PLACEMENT: Array<{ ch: string; x: number; y: number }> = [
  { ch: "U", x: 0, y: 0 },
  { ch: "P", x: 4, y: 8 },
  { ch: "S", x: 8, y: 16 },
];
const MONO_W = 13;
const MONO_H = 23;

const MONOGRAM: Uint8Array = (() => {
  const m = new Uint8Array(MONO_W * MONO_H);
  for (const { ch, x, y } of PLACEMENT) {
    const rows = GLYPH_FONT[ch];
    for (let r = 0; r < LETTER_H; r++) {
      for (let c = 0; c < LETTER_W; c++) {
        if (rows[r][c] === "X") m[(y + r) * MONO_W + (x + c)] = 1;
      }
    }
  }
  return m;
})();

function buildMask(cols: number, rows: number): Uint8Array {
  const mask = new Uint8Array(cols * rows);
  const scale = Math.min((cols * 0.86) / MONO_W, (rows * 0.86) / MONO_H);
  const offX = (cols - MONO_W * scale) / 2;
  const offY = (rows - MONO_H * scale) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = Math.floor((c - offX) / scale);
      const by = Math.floor((r - offY) / scale);
      if (bx >= 0 && bx < MONO_W && by >= 0 && by < MONO_H && MONOGRAM[by * MONO_W + bx]) {
        mask[r * cols + c] = 1;
      }
    }
  }
  return mask;
}

/* ------------------------------------------------------------- component --- */

export default function About() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const reduced = prefersReduced();

    let cols = 0;
    let rows = 0;
    let cell = 0;
    let w = 0;
    let h = 0;
    let mask: Uint8Array = new Uint8Array(0);
    let glyphs: string[] = [];
    let bright = new Float32Array(0);
    let flare = new Float32Array(0);
    let raf = 0;
    let running = false;
    let inView = false;
    let last = 0;
    const pointer = { x: 0, y: 0, active: false };

    const rollGlyph = (i: number) => {
      const set = mask[i] ? LIT_GLYPHS : DIM_GLYPHS;
      glyphs[i] = set[(Math.random() * set.length) | 0];
      bright[i] = Math.random();
    };

    const draw = () => {
      ctx2d.clearRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) {
        const cy = (r + 0.5) * cell;
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const f = flare[i];
          let cr: number;
          let cg: number;
          let cb: number;
          let a: number;
          if (mask[i]) {
            // letterform: acid accent, flaring toward white near the pointer
            a = 0.5 + bright[i] * 0.4 + f * 0.3;
            cr = 204 + 51 * f;
            cg = 255;
            cb = 61 + 194 * f;
          } else {
            // ambient noise: barely-there static
            a = 0.05 + bright[i] * 0.08 + f * 0.8;
            cr = 130 + 125 * f;
            cg = 130 + 125 * f;
            cb = 140 + 115 * f;
          }
          if (a > 1) a = 1;
          ctx2d.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${a.toFixed(3)})`;
          ctx2d.fillText(glyphs[i], c * cell + cell / 2, cy);
        }
      }
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 10) return;
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.max(24, Math.min(44, Math.round(w / 9)));
      cell = w / cols;
      rows = Math.max(1, Math.round(h / cell));
      mask = buildMask(cols, rows);

      const n = cols * rows;
      glyphs = new Array<string>(n);
      bright = new Float32Array(n);
      flare = new Float32Array(n);
      for (let i = 0; i < n; i++) rollGlyph(i);

      const fam = getComputedStyle(canvas).fontFamily || "monospace";
      ctx2d.font = `${Math.max(7, cell * 0.95)}px ${fam}`;
      ctx2d.textAlign = "center";
      ctx2d.textBaseline = "middle";
      draw();
    };

    const step = () => {
      const n = cols * rows;
      if (n === 0) return;

      // ambient churn: a few random cells re-roll their glyph every frame
      const churn = Math.max(2, (n * 0.005) | 0);
      for (let k = 0; k < churn; k++) rollGlyph((Math.random() * n) | 0);

      // pointer proximity raises flare on nearby cells
      if (pointer.active) {
        const R = cell * 7.5;
        const cMin = Math.max(0, Math.floor((pointer.x - R) / cell));
        const cMax = Math.min(cols - 1, Math.ceil((pointer.x + R) / cell));
        const rMin = Math.max(0, Math.floor((pointer.y - R) / cell));
        const rMax = Math.min(rows - 1, Math.ceil((pointer.y + R) / cell));
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            const dx = (c + 0.5) * cell - pointer.x;
            const dy = (r + 0.5) * cell - pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < R) {
              const t = 1 - d / R;
              const i = r * cols + c;
              if (t > flare[i]) flare[i] = t;
            }
          }
        }
      }

      // decay + faster shuffle for flared cells
      for (let i = 0; i < n; i++) {
        const f = flare[i];
        if (f > 0) {
          if (f > 0.12 && Math.random() < f * 0.3) rollGlyph(i);
          flare[i] = f < 0.012 ? 0 : f * 0.9;
        }
      }
      draw();
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return; // ~30fps is plenty for terminal static
      last = t;
      step();
    };
    const start = () => {
      if (!running && !reduced) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const sync = () => {
      if (inView && !document.hidden) start();
      else stop();
    };

    build(); // static first frame — this is all reduced-motion users see

    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { rootMargin: "80px 0px" }
    );
    io.observe(canvas);

    const onVis = () => sync();
    document.addEventListener("visibilitychange", onVis);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    if (!reduced) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section
      id="about"
      data-section-name="01 / ABOUT"
      className="relative pad-x py-[clamp(5rem,14vh,11rem)]"
    >
      <SectionHeading index="01" title="ABOUT" sub="background & focus" />

      <div className="mt-[clamp(3rem,7vh,5.5rem)] grid grid-cols-1 gap-[clamp(2.5rem,6vw,6rem)] lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* -------- portrait panel (sticky on desktop) -------- */}
        <div className="lg:sticky lg:top-[15vh] lg:self-start">
          <figure data-reveal className="relative w-full max-w-[240px] lg:max-w-[380px]">
            <div className="relative">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="ASCII glyph portrait spelling the initials U P S"
                className="block aspect-[3/4] w-full border border-line bg-bg-soft font-mono"
              />
              {/* corner ticks */}
              <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l border-t border-accent/60" />
              <span aria-hidden="true" className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r border-t border-accent/60" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-accent/60" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-accent/60" />
            </div>
            <figcaption className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[.62rem] uppercase tracking-[.16em]">
              <span className="text-faint">subject</span>
              <span className="text-muted">UdayPS</span>
              <span className="text-faint">location</span>
              <span className="text-muted">22.7196&deg;N 75.8577&deg;E</span>
              <span className="text-faint">status</span>
              <span className="text-accent">
                Operational
                <span aria-hidden="true" className="ml-2 inline-block h-[6px] w-[6px] animate-blink rounded-full bg-accent align-middle" />
              </span>
            </figcaption>
          </figure>
        </div>

        {/* -------- record -------- */}
        <div className="relative">
          <div className="space-y-[1.6rem]">
            {PARAGRAPHS.map((p) => (
              <div key={p.note} className="relative lg:pr-12">
                <p
                  data-split-words
                  className="max-w-[58ch] text-[clamp(1.05rem,1.6vw,1.45rem)] leading-[1.65] text-text/90"
                >
                  {p.body}
                </p>
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 hidden font-mono text-[.6rem] tracking-[.18em] text-faint [writing-mode:vertical-rl] lg:block"
                  data-reveal
                  data-reveal-delay="0.25"
                >
                  {p.note}
                </span>
              </div>
            ))}
          </div>

          {/* -------- verified figures -------- */}
          <div className="mt-[clamp(3rem,6vh,4.5rem)] grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="border-t border-line pt-4"
                data-reveal
                data-reveal-delay={(i * 0.08).toFixed(2)}
              >
                <div
                  className="font-display text-[clamp(2rem,3.2vw,3rem)] font-bold leading-none tracking-[-.03em] [&_span]:text-accent"
                  data-count={s.value}
                  data-suffix={s.suffix}
                >
                  {s.value}
                  {s.suffix}
                </div>
                <div className="mt-2.5 font-mono text-[.6rem] uppercase tracking-[.18em] text-faint">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
