"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { scramble } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";
import {
  getPresenceSnapshot,
  subscribePresence,
  type PresenceSnapshot,
} from "@/lib/mythic/presence";

/* ── identity (shared contract — do not change) ── */
const ROLES = ["FULL-STACK", "RPA & AUTOMATION", "REVERSE ENGINEERING"];
const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

/* ── breach script ── */
const CMD = "inject uday.exe --target=viewport";
const RESP = "[OK] HANDLE ACQUIRED · PID 0x1F93";

/* rain alphabet — ASCII/hex/blocks only, safe in JetBrains Mono */
const RAIN_GLYPHS = "0123456789ABCDEF$#@%&*+=-<>/\\[]{}()!?;:^~_|░▒▓";
/* torch fragments — consecutive columns spell real stack names */
const FRAG =
  "node frida rpc 0x1F ghidra x64 asm hook dll ws llm agent rpa uia grpc sql jwt tcp adb apk burp regex bash next react three gsap smali ";

const BG = "#070709";
const FAR = "#1a1a20";
const MID = "#2c2c34";
const ACCENT = "#ccff3d";
const VIOLET = "#7c5cff";
const ROSE = "#ff5c7c";
const LAYER_COLOR: [string, string, string] = [FAR, MID, ACCENT];
/* depth parallax: px of horizontal shift per layer at full mouse deflection */
const PARALLAX: [number, number, number] = [4, 9, 16];

type Col = {
  x: number; // css px
  y: number; // head row (float)
  speed: number; // rows / sec
  layer: 0 | 1 | 2; // far / mid / near(accent)
  alpha: number; // current alpha multiplier
  target: number; // alpha target (drops post-breach)
  burst: boolean; // hit by the breach wipe
  burstAt: number; // state.t at burst
  glitchUntil: number; // state.t until which this column re-glitches
  hot: boolean; // a CTA directly below is hovered — accelerate + tint
  flareUntil: number; // presence join: flare accent + accelerate until state.t
};

const postAlpha = (layer: 0 | 1 | 2) =>
  layer === 2 ? 0.7 : layer === 1 ? 0.45 : 0.32;

/**
 * HeroBreach — 00 / SIGNAL. "BREACH": a live terminal intrusion.
 * Art-directed canvas-2D glyph rain (3 depth layers w/ mouse parallax,
 * 30fps cap), a typed inject command, then the rain violently parts in a
 * radial wipe — invert flash, horizontal tear band, ring shockwave — and the
 * wipe front PRINTS the name: each SplitText char cycles rain glyphs and
 * resolves the instant the front passes its x (chromatic split settles over
 * it). Mouse is a decryption torch (1px elastic ring + live DECRYPT chip)
 * that resolves rain into stack names; touch gets a slow auto-roaming torch
 * and tap shockwaves that part the field. Post-breach idle life: name chars
 * micro-glitch, burn-in ghosts linger. CTA hover accelerates the columns
 * above it. Mono OSD frame: breach timer, COLS/DROPS telemetry, ACCESS:
 * GRANTED stamp, roles / copy / CTAs bottom-left. No WebGL spent.
 *
 * Live presence (@/lib/mythic/presence) is woven into the fiction: a LINKED
 * node-count line under the telemetry (digits tick-scramble on change,
 * "LINKED: ---" while offline), joins flare 2–3 rain columns accent and type
 * "[ rx ] node acquired", leaves flicker a column rose ("[ tx ] node
 * dropped"), chat messages surface as "[ rx ] name: text" intercepts.
 * Event visuals run post-breach only, no-op while the loop is paused,
 * desktop-only (mobile keeps just the LINKED line), and reduced motion
 * gets a static LINKED line with no flares.
 */
export default function HeroBreach() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cmdTextRef = useRef<HTMLSpanElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const l2 = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const canvas = canvasRef.current;
    const ctx2d = canvas ? canvas.getContext("2d", { alpha: false }) : null;
    if (!rootEl || !canvas || !ctx2d) return;

    gsap.registerPlugin(SplitText, CustomEase);
    const reduced = prefersReduced();
    const cleanups: Array<() => void> = [];
    const gctx = gsap.context(() => {}, rootEl);
    const q = gsap.utils.selector(rootEl);
    const el = (sel: string) => q(sel)[0] as HTMLElement | undefined;

    /* ── element lookups ── */
    const cmdLine = el(".hbx-cmdline");
    const resp = el(".hbx-resp");
    const telem = el(".hbx-telem");
    const linked = el(".hbx-linked");
    const evtLine = el(".hbx-evt");
    const timerWrap = el(".hbx-timerwrap");
    const timerEl = el(".hbx-timer");
    const vignette = el(".hbx-vignette");
    const flash = el(".hbx-flash");
    const torchRing = el(".hbx-torchring");
    const chipEl = el(".hbx-chip");
    const nameEl = el(".hbx-name");
    const clusterEl = el(".hbx-cluster");
    const stamps = q(".hbx-stamp") as HTMLElement[];
    const roles = q(".hbx-role") as HTMLElement[];
    const ring1 = q(".hbx-ring1")[0] as unknown as SVGCircleElement | undefined;
    const ring2 = q(".hbx-ring2")[0] as unknown as SVGCircleElement | undefined;
    const clusterKids = clusterEl
      ? (Array.from(clusterEl.children) as HTMLElement[]).filter(
          (c) => !c.classList.contains("hbx-stamp")
        )
      : [];

    /* ── rain state ── */
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const state = {
      w: 1,
      h: 1,
      cell: 14,
      rows: 1,
      cols: [] as Col[],
      fontFam: '"JetBrains Mono", ui-monospace, monospace',
      phase: 0 as 0 | 1, // 0 = pristine rain, 1 = post-breach
      wipeR: -1, // breach wipe radius in px (-1 = inactive)
      flashUntil: -1,
      torchOn: false,
      pointerSeen: false,
      isMobile: false,
      t: 0,
      torch: { x: -9999, y: -9999, tx: -9999, ty: -9999 },
      /* depth parallax: -1..1 deflection, lerped */
      parX: 0,
      parTX: 0,
      /* OSD telemetry */
      drops: 0,
      /* breach tear band (2 frames @30fps) */
      tearY: 0,
      tearH: 0,
      tearDX: 0,
      tearUntil: -1,
      /* tap mini-shockwave (touch) */
      shock: null as { x: number; y: number; at: number } | null,
      /* idle burn-in ghost near the name */
      ghost: null as { x: number; y: number; ch: string; at: number } | null,
    };
    if (cmdLine) state.fontFam = getComputedStyle(cmdLine).fontFamily;
    /* columns currently tinted/accelerated by a hovered CTA */
    const hotCols: Col[] = [];
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const build = () => {
      const r = rootEl.getBoundingClientRect();
      state.w = Math.max(1, Math.round(r.width));
      state.h = Math.max(1, Math.round(r.height));
      state.isMobile = state.w < 768;
      state.cell = state.isMobile ? 11 : 14;
      state.rows = Math.ceil(state.h / state.cell);
      canvas.width = Math.round(state.w * dpr);
      canvas.height = Math.round(state.h * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.textBaseline = "top";
      ctx2d.fillStyle = BG;
      ctx2d.fillRect(0, 0, state.w, state.h);
      const n = Math.ceil(state.w / state.cell);
      const cols: Col[] = [];
      for (let i = 0; i < n; i++) {
        if (state.isMobile && i % 3 === 2) continue; // thinner field on mobile
        const rnd = Math.random();
        const layer: 0 | 1 | 2 = rnd < 0.5 ? 0 : rnd < 0.88 ? 1 : 2;
        const c: Col = {
          x: i * state.cell,
          y: Math.random() * state.rows,
          speed:
            layer === 0
              ? gsap.utils.random(3.5, 6)
              : layer === 1
              ? gsap.utils.random(7, 11)
              : gsap.utils.random(13, 19),
          layer,
          alpha: 1,
          target: 1,
          burst: false,
          burstAt: -10,
          glitchUntil: 0,
          hot: false,
          flareUntil: 0,
        };
        if (state.phase === 1) {
          c.burst = true;
          c.alpha = c.target = Math.random() < 0.42 ? 0 : postAlpha(layer);
        }
        cols.push(c);
      }
      state.cols = cols;
      hotCols.length = 0; // stale refs after rebuild
    };

    /* reduced motion: one painted sparse field, no loop */
    const paintStatic = () => {
      const { w, h, cell } = state;
      ctx2d.fillStyle = BG;
      ctx2d.fillRect(0, 0, w, h);
      const n = Math.round((w * h) / 7000);
      for (let i = 0; i < n; i++) {
        const col = (Math.random() * (w / cell)) | 0;
        const row = (Math.random() * (h / cell)) | 0;
        const r = Math.random();
        ctx2d.fillStyle = r < 0.72 ? FAR : r < 0.95 ? MID : ACCENT;
        ctx2d.globalAlpha = r < 0.95 ? 0.9 : 0.5;
        ctx2d.font = `${cell * (r < 0.72 ? 0.72 : 0.86)}px ${state.fontFam}`;
        ctx2d.fillText(
          RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0],
          col * cell,
          row * cell
        );
      }
      ctx2d.globalAlpha = 1;
    };

    /* decryption torch — accent glyphs resolve into readable stack names */
    const drawTorch = (dt: number) => {
      const { w, h, cell } = state;
      const R = state.isMobile ? 120 : 180;
      if (!state.pointerSeen) {
        // slow auto-roam (touch devices / before first mouse move)
        state.torch.tx = w * (0.5 + 0.36 * Math.sin(state.t * 0.42));
        state.torch.ty = h * (0.4 + 0.27 * Math.sin(state.t * 0.27 + 1.7));
        if (state.torch.x < -1000) {
          state.torch.x = state.torch.tx;
          state.torch.y = state.torch.ty;
        }
      }
      state.torch.x += (state.torch.tx - state.torch.x) * Math.min(1, dt * 7);
      state.torch.y += (state.torch.ty - state.torch.y) * Math.min(1, dt * 7);
      const { x, y } = state.torch;
      if (x < -R || y < -R || x > w + R || y > h + R) return;
      const c0 = Math.max(0, Math.floor((x - R) / cell));
      const c1 = Math.min(Math.ceil(w / cell), Math.ceil((x + R) / cell) + 1);
      const r0 = Math.max(0, Math.floor((y - R) / cell));
      const r1 = Math.min(state.rows, Math.ceil((y + R) / cell) + 1);
      ctx2d.font = `${cell * 0.86}px ${state.fontFam}`;
      ctx2d.fillStyle = ACCENT;
      for (let row = r0; row < r1; row++) {
        const py = row * cell;
        for (let col = c0; col < c1; col++) {
          const px = col * cell;
          const dx = px - x;
          const dy = py - y;
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const t = 1 - Math.sqrt(d2) / R;
          if (t < 0.38) {
            // shimmering undecoded edge
            if (Math.random() < 0.55) continue;
            ctx2d.globalAlpha = t * 0.45;
            ctx2d.fillText(
              RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0],
              px,
              py
            );
          } else {
            // decoded core — readable fragments, stable in space
            const ch = FRAG[(row * 29 + col) % FRAG.length];
            if (ch === " ") continue;
            ctx2d.globalAlpha = Math.min(0.95, (t - 0.2) * 1.2);
            ctx2d.fillText(ch, px, py);
          }
        }
      }
      ctx2d.globalAlpha = 1;
    };

    const draw = (dt: number) => {
      const { w, h, cell } = state;
      // trail fade
      ctx2d.fillStyle = "rgba(7,7,9,0.22)";
      ctx2d.fillRect(0, 0, w, h);
      // breach flash tint (fades out via the overlay)
      if (state.t < state.flashUntil) {
        ctx2d.fillStyle = "rgba(124,92,255,0.10)";
        ctx2d.fillRect(0, 0, w, h);
      }
      // depth parallax: mouse on desktop, slow sine drift on touch
      if (state.isMobile || !state.pointerSeen)
        state.parTX = Math.sin(state.t * 0.35) * 0.5;
      state.parX += (state.parTX - state.parX) * Math.min(1, dt * 3.5);
      // tap mini-shockwave envelope (touch)
      const sh = state.shock;
      let shp = 0;
      if (sh) {
        shp = (state.t - sh.at) / 0.55;
        if (shp >= 1) state.shock = null;
      }
      const cx = w / 2;
      for (const c of state.cols) {
        // the wipe front ignites columns as it passes
        if (state.wipeR >= 0 && !c.burst && Math.abs(c.x - cx) <= state.wipeR) {
          c.burst = true;
          c.burstAt = state.t;
          c.target = Math.random() < 0.42 ? 0 : postAlpha(c.layer);
        }
        // presence join flare: accent burst + acceleration for ~1s
        const flaring = state.t < c.flareUntil;
        // hot/flaring columns revive + brighten even culled drops
        const tgt =
          c.hot || flaring ? Math.max(c.target, postAlpha(c.layer)) : c.target;
        c.alpha += (tgt - c.alpha) * Math.min(1, dt * 5);
        if (tgt === 0 && c.alpha < 0.03) continue;
        const sinceBurst = state.t - c.burstAt;
        let boost = c.burst ? 1 + 4.5 * Math.exp(-sinceBurst / 0.3) : 1;
        if (c.hot) boost *= 2.2;
        if (flaring) boost *= 2.4;
        // shockwave: nearby columns kick + thin out, then recover
        let shockDim = 1;
        if (state.shock) {
          const fall = Math.max(0, 1 - Math.abs(c.x - state.shock.x) / 170);
          if (fall > 0) {
            boost *= 1 + 3.5 * fall * (1 - shp);
            shockDim = 1 - 0.85 * fall * (1 - shp);
          }
        }
        const glitching = state.t < c.glitchUntil;
        c.y += (glitching ? -1.4 : 1) * c.speed * boost * dt;
        if (c.y > state.rows + 3) c.y = -gsap.utils.random(0, state.rows * 0.6);
        else if (c.y < -6) c.y = state.rows + 2;
        const py = Math.floor(c.y) * cell;
        if (py < -cell || py > h) continue;
        const px = c.x - state.parX * PARALLAX[c.layer];
        const size =
          c.layer === 0 ? cell * 0.72 : c.layer === 1 ? cell * 0.86 : cell;
        ctx2d.font = `${size}px ${state.fontFam}`;
        const igniting = c.burst && sinceBurst < 0.22;
        ctx2d.fillStyle = glitching
          ? ROSE
          : igniting || c.hot || flaring
          ? ACCENT
          : LAYER_COLOR[c.layer];
        ctx2d.globalAlpha =
          Math.min(
            1,
            (c.layer === 2 ? 0.9 : 0.85) * c.alpha +
              (igniting ? 0.35 : 0) +
              (c.hot || flaring ? 0.15 : 0)
          ) * shockDim;
        ctx2d.fillText(
          RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0],
          px,
          py
        );
        state.drops++;
        if (c.layer === 2 && !glitching) {
          ctx2d.globalAlpha = 0.4 * c.alpha * shockDim;
          ctx2d.fillText(
            RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0],
            px,
            py - cell
          );
        }
      }
      ctx2d.globalAlpha = 1;
      // tap shockwave ring (canvas-local, cheap)
      if (state.shock) {
        ctx2d.strokeStyle = ACCENT;
        ctx2d.lineWidth = 1;
        ctx2d.globalAlpha = 0.55 * (1 - shp);
        ctx2d.beginPath();
        ctx2d.arc(state.shock.x, state.shock.y, 14 + shp * 170, 0, Math.PI * 2);
        ctx2d.stroke();
        ctx2d.globalAlpha = 1;
      }
      // idle burn-in ghost: a stray glyph lingers near the name, flickers out
      if (state.ghost) {
        const g = state.ghost;
        const p = (state.t - g.at) / 1.6;
        if (p >= 1) state.ghost = null;
        else {
          ctx2d.font = `${cell * 1.5}px ${state.fontFam}`;
          ctx2d.fillStyle = ACCENT;
          ctx2d.globalAlpha =
            0.38 * (1 - p) * (0.7 + 0.3 * Math.sin(state.t * 21));
          ctx2d.fillText(g.ch, g.x, g.y);
          ctx2d.globalAlpha = 1;
        }
      }
      if (state.torchOn) drawTorch(dt);
      // breach tear: one strip of the field rips sideways for ~2 frames
      if (state.t < state.tearUntil && state.tearH > 0) {
        ctx2d.drawImage(
          canvas,
          0,
          Math.round(state.tearY * dpr),
          canvas.width,
          Math.max(1, Math.round(state.tearH * dpr)),
          state.tearDX,
          state.tearY,
          w,
          state.tearH
        );
      }
    };

    build();

    /* ── magnetic CTAs (lib self-guards touch / reduced) ── */
    (q(".hbx-cta") as HTMLElement[]).forEach((cta) =>
      cleanups.push(magnetize(cta, 0.3))
    );

    /* ── debounced resize (rebuilds the grid, keeps post-breach density) ── */
    let rzId = 0;
    const onResize = () => {
      window.clearTimeout(rzId);
      rzId = window.setTimeout(() => {
        build();
        if (reduced) paintStatic();
      }, 150);
    };
    window.addEventListener("resize", onResize);
    cleanups.push(() => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(rzId);
    });

    /* ── presence OSD: LINKED line (shared by reduced + full paths) ── */
    const fmtLinked = (s: PresenceSnapshot) =>
      s.connected
        ? `LINKED: ${s.nodes} NODE${s.nodes === 1 ? "" : "S"} · ${s.pcs} PC / ${
            s.mobiles
          } MOB`
        : "LINKED: ---";
    let linkedText = "LINKED: ---"; // matches SSR markup
    let linkedTickId = 0;
    const renderLinked = (s: PresenceSnapshot, animate: boolean) => {
      if (!linked) return;
      const next = fmtLinked(s);
      if (next === linkedText) return;
      linkedText = next;
      window.clearInterval(linkedTickId);
      if (!animate) {
        linked.textContent = next;
        return;
      }
      // count digits tick-scramble into place over ~6 frames
      let ticks = 0;
      linkedTickId = window.setInterval(() => {
        if (++ticks >= 6) {
          window.clearInterval(linkedTickId);
          linked.textContent = linkedText;
          return;
        }
        linked.textContent = linkedText.replace(/\d/g, () =>
          String((Math.random() * 10) | 0)
        );
      }, 48);
    };
    cleanups.push(() => window.clearInterval(linkedTickId));

    if (reduced) {
      /* ── static but composed: everything visible, one painted frame ── */
      if (cmdTextRef.current) cmdTextRef.current.textContent = CMD;
      if (timerEl) timerEl.textContent = "BREACH // 00:00:00";
      if (telem)
        telem.textContent = `COLS: ${String(state.cols.length).padStart(
          3,
          "0"
        )} / DROPS: 0000 / LAYER: 3`;
      stamps.forEach((s) => s.classList.add("hbx-on")); // blink disabled via media query
      paintStatic();
      /* live LINKED telemetry, static — no tick-scramble, no event lines */
      renderLinked(getPresenceSnapshot(), false);
      cleanups.push(subscribePresence((s) => renderLinked(s, false)));
      gctx.add(() => {
        gsap.fromTo(
          [cmdLine, timerWrap, nameEl, clusterEl, ...stamps].filter(Boolean),
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.05 }
        );
      });
      return () => {
        cleanups.forEach((fn) => fn());
        gctx.revert();
      };
    }

    /* ── hidden initial states (JS only — page reads fine without JS) ── */
    if (cmdTextRef.current) cmdTextRef.current.textContent = "";
    gctx.add(() => {
      gsap.set(
        [cmdLine, timerWrap, vignette, resp, telem, linked].filter(Boolean),
        { opacity: 0 }
      );
      gsap.set(stamps, { opacity: 0 });
      gsap.set(clusterKids, { opacity: 0, y: 26 });
    });

    /* name: SplitText chars (line wrappers in markup are the masks) */
    let chars: HTMLElement[] = [];
    const splits: SplitText[] = [];
    if (l1.current && l2.current) {
      const sp = SplitText.create([l1.current, l2.current], { type: "chars" });
      splits.push(sp);
      chars = sp.chars as HTMLElement[];
      gsap.set(chars, { yPercent: 115 });
    }
    cleanups.push(() => splits.forEach((s) => s.revert()));

    /* ── decode-on-wipe: each char cycles rain glyphs and resolves the
       instant the wipe front passes its x — the wipe prints the name ── */
    type Decoder = { el: HTMLElement; final: string; thresh: number; done: boolean };
    let decoders: Decoder[] = [];
    let decodeDone = false;
    let decodeLastCycle = 0;

    const setupDecode = () => {
      if (!chars.length) return;
      const rr = rootEl.getBoundingClientRect();
      const cx = state.w / 2;
      // read every rect first, then write (no layout thrash)
      const rects = chars.map((c) => c.getBoundingClientRect());
      decoders = chars.map((c, i) => ({
        el: c,
        final: c.textContent ?? "",
        thresh:
          Math.abs(rects[i].left + rects[i].width / 2 - rr.left - cx) +
          gsap.utils.random(0, state.cell * 2.4),
        done: false,
      }));
      chars.forEach((c, i) => {
        // lock each char's width so glyph cycling can't shift its neighbours
        c.style.width = `${rects[i].width}px`;
        c.style.textAlign = "center";
      });
    };

    const stepDecode = () => {
      if (decodeDone) return;
      const now = performance.now();
      const cycle = now - decodeLastCycle >= 32; // glyph shuffle ~30fps
      if (cycle) decodeLastCycle = now;
      let open = 0;
      for (const d of decoders) {
        if (d.done) continue;
        if (state.wipeR >= d.thresh) {
          d.done = true;
          d.el.textContent = d.final;
        } else {
          open++;
          if (cycle)
            d.el.textContent =
              RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0];
        }
      }
      if (!open) decodeDone = true;
    };

    const finishDecode = () => {
      for (const d of decoders)
        if (!d.done) {
          d.done = true;
          d.el.textContent = d.final;
        }
      decodeDone = true;
    };

    /* ── idle life (post-breach): every 5–8s one name char flickers to a
       glyph with a 1-frame accent3 echo; sometimes a burn-in ghost spawns ── */
    let idleId = 0;
    let idleRevertId = 0;
    const scheduleIdle = () => {
      idleId = window.setTimeout(() => {
        if (running && decodeDone && decoders.length) {
          const d = decoders[(Math.random() * decoders.length) | 0];
          d.el.textContent =
            RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0];
          d.el.style.color = ROSE; // overrides .text-stroke transparent fill too
          d.el.style.textShadow = `2px 0 ${ROSE}b3`;
          window.clearTimeout(idleRevertId);
          idleRevertId = window.setTimeout(() => {
            d.el.textContent = d.final;
            d.el.style.color = "";
            d.el.style.textShadow = "";
          }, 80);
          if (Math.random() < 0.45)
            state.ghost = {
              x:
                state.w / 2 +
                gsap.utils.random(-state.w * 0.24, state.w * 0.24),
              y:
                state.h * 0.44 +
                gsap.utils.random(-state.h * 0.1, state.h * 0.13),
              ch: RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0],
              at: state.t,
            };
        }
        scheduleIdle();
      }, gsap.utils.random(5000, 8000));
    };
    cleanups.push(() => {
      window.clearTimeout(idleId);
      window.clearTimeout(idleRevertId);
    });

    /* signature eases */
    CustomEase.create("hbxWipe", "M0,0 C0.08,0.62 0.22,0.97 1,1");
    CustomEase.create(
      "hbxPop",
      "M0,0 C0.2,0.9 0.28,1.06 0.45,1.06 0.62,1.06 0.7,1 1,1"
    );

    /* ── rAF loop, capped ~30fps, pauses offscreen + hidden ── */
    let raf = 0;
    let running = false;
    let inView = true;
    let rainEnabled = false; // flips on at boot
    let disposed = false;
    let lastNow = 0;
    let acc = 0;
    const FRAME = 1 / 30;

    const loop = (nowMs: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const now = nowMs / 1000;
      if (!lastNow) lastNow = now;
      const dt = Math.min(now - lastNow, 0.1);
      lastNow = now;
      acc += dt;
      if (acc < FRAME) return;
      const step = Math.min(acc, FRAME * 2);
      acc = 0;
      state.t += step;
      draw(step);
    };

    const setRunning = () => {
      const should = rainEnabled && inView && !document.hidden && !disposed;
      if (should && !running) {
        running = true;
        lastNow = 0;
        raf = requestAnimationFrame(loop);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        setRunning();
      },
      { threshold: 0 }
    );
    io.observe(rootEl);
    const onVis = () => setRunning();
    document.addEventListener("visibilitychange", onVis);
    cleanups.push(() => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(raf);
    });

    /* ── torch ring HUD: 1px elastic ring + live DECRYPT chip (desktop) ── */
    let ringShown = false;
    let ringToX: ((v: number) => void) | null = null;
    let ringToY: ((v: number) => void) | null = null;
    if (finePointer && torchRing) {
      gctx.add(() => {
        ringToX = gsap.quickTo(torchRing, "x", {
          duration: 0.55,
          ease: "back.out(1.9)", // lerped with a touch of elastic overshoot
        });
        ringToY = gsap.quickTo(torchRing, "y", {
          duration: 0.55,
          ease: "back.out(1.9)",
        });
      });
    }
    const maybeShowRing = () => {
      if (ringShown || !torchRing || !finePointer) return;
      if (!state.torchOn || !state.pointerSeen) return;
      ringShown = true;
      gctx.add(() => {
        gsap.set(torchRing, { x: state.torch.tx, y: state.torch.ty });
        gsap.to(torchRing, { opacity: 1, duration: 0.5, ease: "power2.out" });
      });
    };
    if (finePointer && chipEl) {
      let pct = 38;
      const chipId = window.setInterval(() => {
        if (!ringShown || document.hidden) return;
        pct = gsap.utils.clamp(20, 90, pct + gsap.utils.random(-8, 9, 1));
        const hex = ((Math.random() * 256) | 0)
          .toString(16)
          .toUpperCase()
          .padStart(2, "0");
        chipEl.textContent = `DECRYPT 0x${hex}.. ${pct}%`;
      }, 260);
      cleanups.push(() => window.clearInterval(chipId));
    }

    /* ── torch follows fine pointers; otherwise it auto-roams ── */
    if (finePointer) {
      const onMove = (e: PointerEvent) => {
        const r2 = canvas.getBoundingClientRect();
        state.torch.tx = e.clientX - r2.left;
        state.torch.ty = e.clientY - r2.top;
        state.parTX = gsap.utils.clamp(
          -1,
          1,
          (state.torch.tx / state.w - 0.5) * 2
        );
        if (!state.pointerSeen) {
          state.pointerSeen = true;
          state.torch.x = state.torch.tx;
          state.torch.y = state.torch.ty;
        }
        maybeShowRing();
        ringToX?.(state.torch.tx);
        ringToY?.(state.torch.ty);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onMove));
    } else {
      /* touch: a tap throws a local mini-shockwave that parts the rain */
      const onTap = (e: PointerEvent) => {
        if (state.phase !== 1) return;
        const r2 = canvas.getBoundingClientRect();
        state.shock = {
          x: e.clientX - r2.left,
          y: e.clientY - r2.top,
          at: state.t,
        };
      };
      rootEl.addEventListener("pointerdown", onTap, { passive: true });
      cleanups.push(() => rootEl.removeEventListener("pointerdown", onTap));
    }

    /* ── UI ↔ field: hovering a CTA accelerates + tints the columns above ── */
    if (finePointer) {
      (q(".hbx-cta") as HTMLElement[]).forEach((cta) => {
        const enter = () => {
          if (state.phase !== 1) return;
          const rr = rootEl.getBoundingClientRect();
          const cr = cta.getBoundingClientRect();
          const x0 = cr.left - rr.left - state.cell;
          const x1 = cr.right - rr.left;
          for (const c of state.cols)
            if (c.x >= x0 && c.x <= x1 && !c.hot) {
              c.hot = true;
              hotCols.push(c);
            }
        };
        const leave = () => {
          hotCols.forEach((c) => (c.hot = false));
          hotCols.length = 0;
        };
        cta.addEventListener("mouseenter", enter);
        cta.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          cta.removeEventListener("mouseenter", enter);
          cta.removeEventListener("mouseleave", leave);
        });
      });
    }

    /* ── OSD telemetry: COLS / DROPS / LAYER counters tick post-breach ── */
    const telemId = window.setInterval(() => {
      if (!telem || state.phase !== 1 || document.hidden) return;
      let alive = 0;
      for (const c of state.cols) if (c.target > 0.05) alive++;
      telem.textContent = `COLS: ${String(alive).padStart(
        3,
        "0"
      )} / DROPS: ${String(state.drops % 10000).padStart(4, "0")} / LAYER: 3`;
    }, 400);
    cleanups.push(() => window.clearInterval(telemId));

    /* ── periodic re-glitch: one column turns rose + reverses for 0.5s ── */
    const glitchId = window.setInterval(() => {
      if (!running || state.phase !== 1) return;
      const alive = state.cols.filter((c) => c.target > 0.05);
      const c = alive[(Math.random() * alive.length) | 0];
      if (c) c.glitchUntil = state.t + 0.5;
    }, 8000);
    cleanups.push(() => window.clearInterval(glitchId));

    /* ── live presence: intrusion events typed into the OSD stack ──
       join = nodes++  → 2–3 columns flare accent + accelerate ~1s
       leave = nodes-- → one column flickers rose (reuses the glitch path)
       message         → "[ rx ] name: text" intercept, hold 5s
       Max 1 event line visible; mobile shows the LINKED line only. */
    let evtTypeId = 0;
    let evtHoldId = 0;
    const showEvt = (text: string, holdMs: number, color: string) => {
      if (!evtLine || state.isMobile) return; // mobile: LINKED line only
      window.clearInterval(evtTypeId);
      window.clearTimeout(evtHoldId);
      gsap.killTweensOf(evtLine);
      evtLine.style.color = color;
      gsap.set(evtLine, { opacity: 1 });
      evtLine.textContent = "";
      let n = 0;
      evtTypeId = window.setInterval(() => {
        n += 2;
        evtLine.textContent = text.slice(0, n);
        if (n >= text.length) window.clearInterval(evtTypeId);
      }, 24);
      evtHoldId = window.setTimeout(() => {
        window.clearInterval(evtTypeId);
        evtLine.textContent = text;
        gsap.to(evtLine, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => {
            if (!disposed) evtLine.textContent = "";
          },
        });
      }, holdMs);
    };
    cleanups.push(() => {
      window.clearInterval(evtTypeId);
      window.clearTimeout(evtHoldId);
      if (evtLine) gsap.killTweensOf(evtLine);
    });

    const flareJoin = () => {
      const alive = state.cols.filter((c) => c.target > 0.05);
      if (!alive.length) return;
      const n = 2 + ((Math.random() * 2) | 0); // 2–3 columns
      for (let i = 0; i < n; i++)
        alive[(Math.random() * alive.length) | 0].flareUntil = state.t + 1;
    };
    const flickerLeave = () => {
      const alive = state.cols.filter((c) => c.target > 0.05);
      const c = alive[(Math.random() * alive.length) | 0];
      if (c) c.glitchUntil = state.t + 0.5;
    };

    let prevSnap: PresenceSnapshot | null = null;
    const onPresence = (s: PresenceSnapshot) => {
      renderLinked(s, running && state.phase === 1);
      // event visuals: post-breach only; no-op while the loop is paused
      const live = running && state.phase === 1 && !document.hidden;
      if (live && prevSnap?.connected && s.connected) {
        if (s.nodes > prevSnap.nodes) {
          flareJoin();
          showEvt(`[ rx ] node acquired · total ${s.nodes}`, 4000, ACCENT);
        } else if (s.nodes < prevSnap.nodes) {
          flickerLeave();
          showEvt("[ tx ] node dropped", 4000, ROSE);
        }
      }
      const ev = s.lastEvent;
      if (
        live &&
        prevSnap && // first snapshot is a silent baseline
        ev &&
        ev.kind === "message" &&
        ev.at !== prevSnap.lastEvent?.at
      ) {
        const raw = `[ rx ] ${ev.name ?? "anon"}: ${ev.text ?? ""}`;
        showEvt(raw.length > 48 ? `${raw.slice(0, 47)}…` : raw, 5000, "");
      }
      prevSnap = s;
    };
    onPresence(getPresenceSnapshot());
    cleanups.push(subscribePresence(onPresence));

    /* ── breach timer OSD ── */
    let breachAt = 0;
    const timerId = window.setInterval(() => {
      if (!breachAt || !timerEl || document.hidden) return;
      const s = Math.max(0, Math.floor((performance.now() - breachAt) / 1000));
      const mm = String(Math.floor(s / 60) % 60).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      timerEl.textContent = `BREACH // 00:${mm}:${ss}`;
    }, 1000);
    cleanups.push(() => window.clearInterval(timerId));

    /* ── entrance choreography, gated on boot ── */
    let booted = false;
    cleanups.push(
      onBooted(() => {
        if (booted) return;
        booted = true;
        rainEnabled = true;
        setRunning();
        gctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

          // 1 — the inject command types across the upper-left
          if (cmdLine) tl.set(cmdLine, { opacity: 1 }, 0.25);
          const type = { n: 0 };
          tl.to(
            type,
            {
              n: CMD.length,
              duration: 1.15,
              ease: "none",
              onUpdate: () => {
                if (cmdTextRef.current)
                  cmdTextRef.current.textContent = CMD.slice(
                    0,
                    Math.round(type.n)
                  );
              },
            },
            0.4
          );

          // 2 — handle acquired
          if (resp) {
            tl.set(resp, { opacity: 1 }, "+=0.18");
            tl.call(() => {
              cleanups.push(scramble(resp, { duration: 0.55 }));
            });
          }

          // 3 — BREACH
          tl.addLabel("breach", "+=0.5");
          tl.call(
            () => {
              breachAt = performance.now();
              state.phase = 1;
              state.flashUntil = state.t + 0.14;
              // horizontal tear: one strip rips ±12px for ~2 frames
              state.tearY = state.h * 0.44 + gsap.utils.random(-70, 50);
              state.tearH = gsap.utils.random(30, 50, 1);
              state.tearDX = Math.random() < 0.5 ? -12 : 12;
              state.tearUntil = state.t + 0.07;
              setupDecode();
              gsap.fromTo(
                state,
                { wipeR: 0 },
                {
                  wipeR: state.w / 2 + state.cell * 4,
                  duration: 0.85,
                  ease: "hbxWipe",
                  onUpdate: stepDecode, // the front prints the name
                  onComplete: () => {
                    state.wipeR = 1e9;
                    finishDecode();
                    scheduleIdle();
                  },
                }
              );
              // chromatic split on the name: ±4px accent2/accent3 echoes settle
              if (nameEl) {
                const split = { v: 4.5 };
                gsap.to(split, {
                  v: 0,
                  duration: 0.45,
                  delay: 0.06,
                  ease: "power2.out",
                  onUpdate: () => {
                    if (disposed) return;
                    nameEl.style.textShadow =
                      split.v < 0.1
                        ? ""
                        : `${split.v}px 0 ${VIOLET}e6, ${-split.v}px 0 ${ROSE}e6`;
                  },
                });
              }
            },
            undefined,
            "breach"
          );

          // invert flash: ~80ms of white difference-blend over the viewport
          if (flash) {
            tl.set(flash, { opacity: 1 }, "breach");
            tl.to(
              flash,
              { opacity: 0, duration: 0.09, ease: "power1.in" },
              "breach+=0.02"
            );
          }

          // ring shockwaves (non-scaling stroke via attr r tween)
          const rMax = () => Math.hypot(state.w, state.h) / 2;
          if (ring1)
            tl.fromTo(
              ring1,
              { attr: { r: 0 }, opacity: 0.9 },
              {
                attr: { r: rMax },
                opacity: 0,
                duration: 1.05,
                ease: "expo.out",
              },
              "breach"
            );
          if (ring2)
            tl.fromTo(
              ring2,
              { attr: { r: 0 }, opacity: 0.7 },
              {
                attr: { r: () => rMax() * 0.82 },
                opacity: 0,
                duration: 1.3,
                ease: "expo.out",
              },
              "breach+=0.08"
            );

          // the name rises out of the parted rain
          if (chars.length)
            tl.to(
              chars,
              {
                yPercent: 0,
                duration: 0.95,
                ease: "hbxPop",
                stagger: { each: 0.016, from: "center" },
              },
              "breach+=0.04"
            );
          if (vignette)
            tl.to(
              vignette,
              { opacity: 1, duration: 0.9, ease: "power2.out" },
              "breach"
            );

          // bottom-left cluster slides in
          tl.to(
            clusterKids,
            { opacity: 1, y: 0, duration: 0.85, stagger: 0.09 },
            "breach+=0.3"
          );
          roles.forEach((r, i) => {
            tl.call(
              () => {
                cleanups.push(scramble(r, { duration: 0.8 }));
              },
              undefined,
              `breach+=${0.35 + i * 0.12}`
            );
          });

          // OSD: timer on, command dims, stamp blinks in
          if (timerWrap)
            tl.to(
              timerWrap,
              { opacity: 1, duration: 0.5, ease: "power2.out" },
              "breach+=0.45"
            );
          if (telem)
            tl.to(
              telem,
              { opacity: 1, duration: 0.5, ease: "power2.out" },
              "breach+=0.55"
            );
          if (linked)
            tl.to(
              linked,
              { opacity: 1, duration: 0.5, ease: "power2.out" },
              "breach+=0.62"
            );
          if (cmdLine)
            tl.to(
              cmdLine,
              { opacity: 0.5, duration: 0.7, ease: "power2.out" },
              "breach+=0.5"
            );
          if (stamps.length) {
            tl.to(
              stamps,
              { opacity: 1, duration: 0.3, ease: "power2.out" },
              "breach+=0.8"
            );
            tl.call(
              () => stamps.forEach((s) => s.classList.add("hbx-on")),
              undefined,
              "breach+=0.8"
            );
          }

          // arm the decryption torch (+ its HUD ring if the mouse moved early)
          tl.call(
            () => {
              state.torchOn = true;
              maybeShowRing();
            },
            undefined,
            "breach+=0.9"
          );
        });
      })
    );

    return () => {
      disposed = true;
      running = false;
      gsap.killTweensOf(state); // late-created wipe tween lives outside gctx
      cleanups.forEach((fn) => fn());
      gctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / SIGNAL"
      className="relative h-[100svh] min-h-[640px] overflow-hidden bg-bg"
    >
      {/* glyph-rain canvas (Canvas2D — the page's WebGL budget stays free) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 block h-full w-full"
      />

      {/* breach invert flash — white difference-blend, ~2 frames (JS-driven) */}
      <div
        aria-hidden="true"
        className="hbx-flash pointer-events-none absolute inset-0 z-[40]"
        style={{ opacity: 0 }}
      />

      {/* legibility vignette under the name */}
      <div
        aria-hidden="true"
        className="hbx-vignette pointer-events-none absolute left-1/2 top-[44%] z-[2] h-[80vmin] w-[135vmin] -translate-x-1/2 -translate-y-1/2"
      />

      {/* breach shockwave rings */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
      >
        <circle
          className="hbx-ring1"
          cx="50%"
          cy="44%"
          r="0"
          fill="none"
          stroke={ACCENT}
          strokeWidth="1.5"
        />
        <circle
          className="hbx-ring2"
          cx="50%"
          cy="44%"
          r="0"
          fill="none"
          stroke="#7c5cff"
          strokeWidth="1"
        />
      </svg>

      {/* decryption torch HUD: elastic 1px ring + live chip (fine pointers) */}
      <div
        aria-hidden="true"
        className="hbx-torchring pointer-events-none absolute left-0 top-0 z-[15]"
        style={{ opacity: 0 }}
      >
        <div className="hbx-torchring-c" />
        <span className="hbx-chip absolute whitespace-nowrap border border-accent/30 bg-bg/70 px-1.5 py-0.5 font-mono text-[.5rem] tracking-[.14em] text-accent">
          DECRYPT 0x3F.. 38%
        </span>
      </div>

      {/* the name — DOM above the rain, occlusion via vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <h1 className="hbx-name -mt-[12vh] text-center font-display font-bold leading-[.94] tracking-[-.04em] text-[clamp(2.6rem,12vw,3.4rem)] md:text-[clamp(3.6rem,9.5vw,9.5rem)]">
          <span className="block overflow-hidden">
            <span ref={l1} className="block">
              UDAY PRATAP
            </span>
          </span>
          <span className="block overflow-hidden">
            <span ref={l2} className="text-stroke block">
              SINGH PARIHAR
            </span>
          </span>
        </h1>
      </div>

      {/* OSD: inject command, upper-left */}
      <div className="hbx-cmdline absolute left-[var(--pad)] top-[4.6rem] z-20 font-mono text-[.6rem] leading-[1.8] tracking-[.06em] text-muted md:top-[5.5rem] md:text-[.68rem]">
        <div>
          <span className="text-accent">$ </span>
          <span ref={cmdTextRef}>{CMD}</span>
          <span aria-hidden="true" className="hbx-caret text-accent">
            ▌
          </span>
        </div>
        <div className="hbx-resp text-faint">{RESP}</div>
        <div className="hbx-telem text-faint">
          COLS: --- / DROPS: ---- / LAYER: 3
        </div>
        <div className="hbx-linked text-faint">LINKED: ---</div>
        {/* one-shot presence event line (join/leave/message intercepts) */}
        <div aria-hidden="true" className="hbx-evt text-faint max-md:hidden" />
      </div>

      {/* OSD: breach timer, upper-right */}
      <div
        aria-hidden="true"
        className="hbx-timerwrap absolute right-[var(--pad)] top-[4.6rem] z-20 font-mono text-[.6rem] tracking-[.18em] text-muted md:top-[5.5rem] md:text-[.65rem]"
      >
        <span className="hbx-timer">BREACH // 00:00:00</span>
      </div>

      {/* bottom-left: roles / copy / CTAs (+ inline stamp on mobile) */}
      <div className="hbx-cluster absolute bottom-6 left-[var(--pad)] right-[var(--pad)] z-20 md:bottom-7 md:right-auto md:max-w-[580px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:text-[.65rem]">
          {ROLES.map((r, i) => (
            <Fragment key={r}>
              {i > 0 && (
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
              )}
              <span className="hbx-role">{r}</span>
            </Fragment>
          ))}
        </div>
        <p className="mt-4 max-w-[46ch] text-[.88rem] leading-[1.6] text-muted md:text-[.95rem]">
          {COPY}
        </p>
        <div className="mt-6 flex gap-3 max-md:flex-col md:items-center">
          <a
            href="#projects"
            data-cursor="hover"
            className="hbx-cta hbx-cta--fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-6 py-3.5 font-mono text-[.66rem] uppercase tracking-[.24em] text-text max-md:w-full"
          >
            <span
              aria-hidden="true"
              className="hbx-cta-bg absolute inset-0 bg-accent"
            />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
              VIEW CASE FILES
            </span>
          </a>
          <a
            href="#contact"
            data-cursor="hover"
            className="hbx-cta inline-flex items-center justify-center border border-line px-6 py-3.5 font-mono text-[.66rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
          >
            TRANSMIT
          </a>
        </div>
        <div
          aria-hidden="true"
          className="hbx-stamp mt-5 inline-flex items-center gap-2 border border-accent/50 px-3 py-1.5 font-mono text-[.55rem] tracking-[.24em] text-accent md:hidden"
        >
          <span className="h-1 w-1 rounded-full bg-accent" />
          ACCESS: GRANTED
        </div>
      </div>

      {/* OSD: access stamp, bottom-right (desktop) */}
      <div
        aria-hidden="true"
        className="hbx-stamp absolute bottom-7 right-[var(--pad)] z-20 hidden items-center gap-2 border border-accent/50 px-3.5 py-2 font-mono text-[.6rem] tracking-[.26em] text-accent md:flex"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        ACCESS: GRANTED
      </div>

      <style>{`
        .hbx-vignette {
          background: radial-gradient(closest-side,
            rgba(7,7,9,.85) 0%, rgba(7,7,9,.5) 52%, rgba(7,7,9,0) 78%);
        }
        .hbx-flash {
          background: #fff;
          mix-blend-mode: difference;
          will-change: opacity;
        }
        .hbx-torchring { will-change: transform; }
        .hbx-torchring-c {
          position: absolute;
          left: -95px;
          top: -95px;
          width: 190px;
          height: 190px;
          border-radius: 9999px;
          border: 1px solid rgba(204,255,61,.45);
        }
        .hbx-chip {
          left: 72px;
          top: -84px;
        }
        .hbx-caret {
          display: inline-block;
          animation: hbxCaret .9s steps(2, end) infinite;
        }
        @keyframes hbxCaret { 50% { opacity: 0; } }
        .hbx-stamp.hbx-on {
          animation: hbxStamp 1.6s steps(2, end) infinite;
        }
        @keyframes hbxStamp { 50% { opacity: .3; } }
        .hbx-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .hbx-cta--fill:hover .hbx-cta-bg,
        .hbx-cta--fill:focus-visible .hbx-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        @media (prefers-reduced-motion: reduce) {
          .hbx-caret, .hbx-stamp.hbx-on { animation: none; }
        }
      `}</style>
    </section>
  );
}
