"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { magnetize } from "@/lib/mythic/magnetic";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";
import {
  getPresenceSnapshot,
  subscribePresence,
  type PresenceSnapshot,
} from "@/lib/mythic/presence";

/* ── identity (shared contract — do not change) ── */
const NAME_L1 = "UDAY PRATAP";
const NAME_L2 = "SINGH PARIHAR";
const ROLES = ["FULL-STACK", "RPA & AUTOMATION", "REVERSE ENGINEERING"];
const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

/* ── palette ── */
const BG = "#070709";
const ACCENT = "#ccff3d";
const ROSE = "#ff5c7c";
const MUTED = "#8a8a93";
const FAINT = "#54545c";
const GRID_LINE = "rgba(255,255,255,0.06)";

const TAU = Math.PI * 2;
const SWEEP_PERIOD = 6; // seconds per revolution
const MAX_BLIPS = 24;
const SCR_CHARS = "01<>/\\[]{}|=+*#@!?";

/** deterministic pseudo-random in [0,1) from an integer key */
const fract = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
const blipBearing = (slot: number) => fract(slot * 3 + 1) * TAU;
const blipRange = (slot: number) => 0.34 + fract(slot * 7 + 13) * 0.52;
const pad2 = (n: number) => String(n).padStart(2, "0");

type Blip = {
  slot: number; // stable contact index → label N-0X + deterministic position
  bearing: number; // rad, 0 = north, clockwise
  rangeN: number; // 0..1 of radar radius
  device: "PC" | "MOBILE";
  state: "spawn" | "live" | "leave";
  dead: boolean;
  spawnAt: number; // state.t
  leaveAt: number; // state.t
  pingAt: number; // state.t of last sweep pass (-10 = never)
  bornAtMs: number; // wall clock, for the T+Xm lock readout
};

/**
 * HeroOverwatch — 00 / SIGNAL. "OVERWATCH": a tactical operations display
 * where the live visitors ARE the concept. One Canvas2D radar (no WebGL):
 * a prerendered polar grid (range rings + bearing spokes + sparse star
 * noise) sits low-left of center while an accent sweep wedge rotates at
 * 6s/rev (30fps cap, paused offscreen/hidden). Presence = contacts: you are
 * the center accent diamond ("SELF"); every other live node from
 * @/lib/mythic/presence is a radar blip at a deterministic pseudo-random
 * bearing/range that PINGS (flash + expanding ring + echo glow) when the
 * sweep passes it. Joins materialize with a converging lock-on bracket +
 * "CONTACT ACQUIRED" OSD line; leaves dissolve in a rose static burst.
 * The name enters as a target acquisition: four corner brackets fly in from
 * the viewport edges and clamp its bbox (overshoot + settle), a scanline
 * sweeps it once, a "TARGET LOCKED" stamp pops and the chars run one fast
 * ScrambleText decode. Idle: brackets re-tighten 2px every ~7s with a
 * 1-frame accent edge ghost on the name. Mouse = targeting designator
 * (lerped crosshair + BRG/RNG readout + dashed ray from radar center);
 * hovering a blip locks it (corner brackets + expanded tag). Touch
 * auto-cycles the lock between blips. OSD chrome: mission header + live IST
 * clock top-left, roles top-right, copy + CTAs bottom-left, contact ledger
 * bottom-right (collapses to "CONTACTS: N" on small screens). Disconnected:
 * rings only, dimmed sweep, "LINK OFFLINE" at center, zero blips — never
 * crashes, never blocks. Reduced motion: a static console (parked sweep,
 * blips visible, name pre-locked, no loops).
 */
export default function HeroOverwatch() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const l2 = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const canvas = canvasRef.current;
    const ctx2d = canvas ? canvas.getContext("2d", { alpha: false }) : null;
    const nameEl = nameRef.current;
    if (!rootEl || !canvas || !ctx2d || !nameEl || !l1.current || !l2.current)
      return;

    gsap.registerPlugin(ScrambleTextPlugin);
    const reduced = prefersReduced();
    const fine = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const cleanups: Array<() => void> = [];
    const gctx = gsap.context(() => {}, rootEl);
    const q = gsap.utils.selector(rootEl);
    const el = (sel: string) => q(sel)[0] as HTMLElement | undefined;
    let disposed = false;
    let booted = false;
    let entranceDone = false;
    let locked = false; // brackets parked on the name bbox (post-entrance)

    /* ── element lookups ── */
    const headEl = el(".hox-head");
    const clockEl = el(".hox-clock");
    const evtEl = el(".hox-evt");
    const rolesEl = el(".hox-roles");
    const ledgerEl = el(".hox-ledger");
    const rowsEl = el(".hox-rows");
    const countEl = el(".hox-count");
    const contactsEl = el(".hox-contacts");
    const clusterEl = el(".hox-cluster");
    const lockWrap = el(".hox-lockwrap");
    const brkEls = q(".hox-br") as HTMLElement[]; // DOM order: TL TR BL BR
    const scanEl = el(".hox-scan");
    const stampEl = el(".hox-stamp");
    const clusterKids = clusterEl
      ? (Array.from(clusterEl.children) as HTMLElement[])
      : [];

    /* ── radar state ── */
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const state = {
      w: 1,
      h: 1,
      cx: 0,
      cy: 0,
      R: 100,
      isMobile: false,
      fontFam: '"JetBrains Mono", ui-monospace, monospace',
      t: 0,
      sweep: 0,
      cur: { x: -9999, y: -9999, tx: -9999, ty: -9999, seen: false },
      lockTarget: -1, // slot currently locked (hover / touch cycle)
      cycleSlot: -1, // touch auto-cycle pointer
      selfMobile: window.matchMedia("(hover: none) and (pointer: coarse)")
        .matches,
      snap: null as PresenceSnapshot | null,
      blips: [] as Blip[],
      lock: { x0: 0, y0: 0, w: 0, h: 0 },
      lockT: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    };
    if (clockEl) state.fontFam = getComputedStyle(clockEl).fontFamily;

    /* ── offscreen prerender: polar grid + star noise (static per resize) ── */
    const gridCvs = document.createElement("canvas");
    const gridCtx = gridCvs.getContext("2d", { alpha: false });

    const renderGrid = () => {
      const g = gridCtx;
      if (!g) return;
      const { w, h, cx, cy, R } = state;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = BG;
      g.fillRect(0, 0, w, h);
      // sparse star/dot noise
      const n = Math.round((w * h) / 9000);
      g.fillStyle = "#ffffff";
      for (let i = 0; i < n; i++) {
        g.globalAlpha = 0.04 + Math.random() * 0.1;
        g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      g.globalAlpha = 1;
      // range rings
      g.lineWidth = 1;
      for (let k = 1; k <= 4; k++) {
        g.strokeStyle = k === 4 ? "rgba(255,255,255,0.09)" : GRID_LINE;
        g.beginPath();
        g.arc(cx, cy, (R * k) / 4, 0, TAU);
        g.stroke();
      }
      // bearing spokes every 30°
      g.strokeStyle = GRID_LINE;
      for (let d = 0; d < 360; d += 30) {
        const a = (d / 180) * Math.PI;
        g.beginPath();
        g.moveTo(cx + Math.sin(a) * R * 0.08, cy - Math.cos(a) * R * 0.08);
        g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
        g.stroke();
      }
      // cardinal bearing labels
      g.font = `${state.isMobile ? 8 : 9}px ${state.fontFam}`;
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const d of [0, 90, 180, 270]) {
        const a = (d / 180) * Math.PI;
        g.fillText(
          String(d).padStart(3, "0"),
          cx + Math.sin(a) * (R + 16),
          cy - Math.cos(a) * (R + 16)
        );
      }
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      // center cross tick
      g.strokeStyle = "rgba(255,255,255,0.16)";
      g.beginPath();
      g.moveTo(cx - 7, cy);
      g.lineTo(cx + 7, cy);
      g.moveTo(cx, cy - 7);
      g.lineTo(cx, cy + 7);
      g.stroke();
    };

    const build = () => {
      const r = rootEl.getBoundingClientRect();
      state.w = Math.max(1, Math.round(r.width));
      state.h = Math.max(1, Math.round(r.height));
      state.isMobile = state.w < 768;
      if (state.isMobile) {
        // radar shifts to the upper third, smaller sweep
        state.cx = state.w * 0.5;
        state.cy = state.h * 0.3;
        state.R = Math.min(state.w * 0.42, state.h * 0.22);
      } else {
        // centered low-left of viewport center
        state.cx = state.w * 0.36;
        state.cy = state.h * 0.58;
        state.R = Math.min(state.w * 0.26, state.h * 0.36);
      }
      canvas.width = Math.round(state.w * dpr);
      canvas.height = Math.round(state.h * dpr);
      gridCvs.width = canvas.width;
      gridCvs.height = canvas.height;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderGrid();
    };

    /* ── target-lock layout: brackets clamp the name's measured bbox ── */
    const layoutLock = () => {
      if (disposed || !l1.current || !l2.current) return;
      const sr = rootEl.getBoundingClientRect();
      const ra = l1.current.getBoundingClientRect();
      const rb = l2.current.getBoundingClientRect();
      const pad = state.isMobile ? 10 : 14;
      const x0 = Math.min(ra.left, rb.left) - sr.left - pad;
      const y0 = ra.top - sr.top - pad;
      const x1 = Math.max(ra.right, rb.right) - sr.left + pad;
      const y1 = rb.bottom - sr.top + pad;
      const B = 22; // bracket square size (matches .hox-br)
      state.lock = { x0, y0, w: x1 - x0, h: y1 - y0 };
      state.lockT = [
        { x: x0, y: y0 },
        { x: x1 - B, y: y0 },
        { x: x0, y: y1 - B },
        { x: x1 - B, y: y1 - B },
      ];
      gctx.add(() => {
        if (scanEl) gsap.set(scanEl, { left: x0, top: y0, width: x1 - x0 });
        if (stampEl) gsap.set(stampEl, { x: x0, y: Math.max(y0 - 30, 8) });
        if (locked)
          brkEls.forEach((b, i) =>
            gsap.set(b, { x: state.lockT[i].x, y: state.lockT[i].y })
          );
      });
    };

    build();
    layoutLock();
    document.fonts?.ready.then(() => {
      if (!disposed) layoutLock();
    });

    /* ── magnetic CTAs (lib self-guards touch / reduced) ── */
    (q(".hox-cta") as HTMLElement[]).forEach((cta) =>
      cleanups.push(magnetize(cta, 0.3))
    );

    /* ── live IST clock (runs in both motion paths) ── */
    const fmtIST = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const setClock = () => {
      if (clockEl) clockEl.textContent = `IST ${fmtIST.format(new Date())}`;
    };
    setClock();
    const clockId = window.setInterval(() => {
      if (!document.hidden) setClock();
    }, 1000);
    cleanups.push(() => window.clearInterval(clockId));

    /* ── OSD event line (one-shot, top-left under the mission header) ── */
    let evtFadeId = 0;
    const showEvt = (text: string, color: string) => {
      if (!evtEl) return;
      window.clearTimeout(evtFadeId);
      gsap.killTweensOf(evtEl);
      evtEl.style.color = color;
      evtEl.textContent = text;
      gsap.set(evtEl, { autoAlpha: 1 });
      evtFadeId = window.setTimeout(() => {
        gsap.to(evtEl, { autoAlpha: 0, duration: 0.6, ease: "power2.out" });
      }, 3600);
    };
    cleanups.push(() => {
      window.clearTimeout(evtFadeId);
      if (evtEl) gsap.killTweensOf(evtEl);
    });

    /* ── contact ledger (bottom-right table / "CONTACTS: N" collapse) ── */
    const renderLedger = (s: PresenceSnapshot) => {
      const live = state.blips
        .filter((b) => b.state !== "leave")
        .sort((a, b) => a.slot - b.slot);
      const countText = s.connected ? `CONTACTS: ${pad2(s.nodes)}` : "CONTACTS: --";
      if (contactsEl) contactsEl.textContent = countText;
      if (rowsEl) {
        const mk = (text: string, cls: string) => {
          const d = document.createElement("div");
          if (cls) d.className = cls;
          d.textContent = text;
          return d;
        };
        const rows: HTMLElement[] = [];
        if (!s.connected) {
          rows.push(mk("LINK OFFLINE", "text-accent3"));
        } else {
          rows.push(
            mk(`SELF · ${state.selfMobile ? "MOBILE" : "PC"} · YOU`, "text-accent")
          );
          live
            .slice(0, 6)
            .forEach((b) =>
              rows.push(mk(`N-${pad2(b.slot + 1)} · ${b.device}`, ""))
            );
          if (live.length > 6)
            rows.push(mk(`+${live.length - 6} MORE`, "text-faint"));
        }
        rowsEl.replaceChildren(...rows);
      }
      if (countEl && countEl.textContent !== countText) {
        countEl.textContent = countText;
        if (entranceDone)
          gsap.fromTo(
            countEl,
            { opacity: 0.2 },
            { opacity: 1, duration: 0.5, ease: "power2.out" }
          );
      }
    };
    cleanups.push(() => {
      if (countEl) gsap.killTweensOf(countEl);
    });

    /* ── distribute PC/MOBILE tags across the other nodes (self excluded) ── */
    const retag = (s: PresenceSnapshot) => {
      let pcLeft = Math.max(0, s.pcs - (state.selfMobile ? 0 : 1));
      for (const b of state.blips
        .filter((x) => x.state !== "leave")
        .sort((a, c) => a.slot - c.slot)) {
        b.device = pcLeft > 0 ? "PC" : "MOBILE";
        if (pcLeft > 0) pcLeft--;
      }
    };

    /* ── canvas paint helpers (shared by the live loop + static paint) ── */
    const blipXY = (b: Blip): [number, number] => [
      state.cx + Math.sin(b.bearing) * b.rangeN * state.R,
      state.cy - Math.cos(b.bearing) * b.rangeN * state.R,
    ];

    const drawSweep = (lead: number, gain: number) => {
      const { cx, cy, R } = state;
      const SLICES = 26;
      const SW = (Math.PI / 180) * 2.4; // ≈20° bright wedge + long falloff
      ctx2d.fillStyle = ACCENT;
      for (let k = 0; k < SLICES; k++) {
        const fall = 1 - k / SLICES;
        ctx2d.globalAlpha =
          gain * (0.07 * fall * fall + (k < 8 ? 0.05 * (1 - k / 8) : 0));
        const a1 = lead - k * SW - Math.PI / 2;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.arc(cx, cy, R, a1 - SW, a1, false);
        ctx2d.closePath();
        ctx2d.fill();
      }
      // leading edge
      ctx2d.globalAlpha = 0.5 * gain;
      ctx2d.strokeStyle = ACCENT;
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(cx, cy);
      ctx2d.lineTo(cx + Math.sin(lead) * R, cy - Math.cos(lead) * R);
      ctx2d.stroke();
      ctx2d.globalAlpha = 1;
    };

    const drawBlipBase = (
      b: Blip,
      x: number,
      y: number,
      alpha: number,
      hot: number
    ) => {
      ctx2d.lineWidth = 1;
      ctx2d.strokeStyle = hot > 0.05 ? ACCENT : "rgba(255,255,255,0.6)";
      ctx2d.globalAlpha = (0.55 + 0.45 * hot) * alpha;
      ctx2d.beginPath();
      ctx2d.arc(x, y, 3.5, 0, TAU);
      ctx2d.stroke();
      if (hot > 0.05) {
        ctx2d.fillStyle = ACCENT;
        ctx2d.globalAlpha = hot * 0.85 * alpha;
        ctx2d.beginPath();
        ctx2d.arc(x, y, 2.2, 0, TAU);
        ctx2d.fill();
      }
      if (state.lockTarget !== b.slot) {
        ctx2d.fillStyle = MUTED;
        ctx2d.globalAlpha = (0.55 + 0.35 * hot) * alpha;
        ctx2d.font = `${state.isMobile ? 8 : 9}px ${state.fontFam}`;
        ctx2d.fillText(`N-${pad2(b.slot + 1)} · ${b.device}`, x + 8, y - 9);
      }
    };

    const drawSelf = (animated: boolean) => {
      const { cx, cy } = state;
      const connected = !!state.snap?.connected;
      ctx2d.lineWidth = 1;
      ctx2d.font = `${state.isMobile ? 8 : 9}px ${state.fontFam}`;
      if (connected) {
        ctx2d.fillStyle = ACCENT;
        ctx2d.globalAlpha = 0.95;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy - 5);
        ctx2d.lineTo(cx + 5, cy);
        ctx2d.lineTo(cx, cy + 5);
        ctx2d.lineTo(cx - 5, cy);
        ctx2d.closePath();
        ctx2d.fill();
        if (animated) {
          const pp = (state.t % 2.4) / 2.4;
          ctx2d.strokeStyle = ACCENT;
          ctx2d.globalAlpha = (1 - pp) * 0.3;
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, 6 + pp * 16, 0, TAU);
          ctx2d.stroke();
        }
        ctx2d.fillStyle = ACCENT;
        ctx2d.globalAlpha = 0.9;
        ctx2d.fillText("SELF", cx + 10, cy - 9);
      } else {
        ctx2d.strokeStyle = "rgba(255,255,255,0.35)";
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy - 5);
        ctx2d.lineTo(cx + 5, cy);
        ctx2d.lineTo(cx, cy + 5);
        ctx2d.lineTo(cx - 5, cy);
        ctx2d.closePath();
        ctx2d.stroke();
        ctx2d.fillStyle = FAINT;
        ctx2d.globalAlpha = 0.95;
        ctx2d.fillText("LINK OFFLINE", cx + 10, cy - 9);
      }
      ctx2d.globalAlpha = 1;
    };

    const drawLock = (b: Blip) => {
      const [x, y] = blipXY(b);
      const s = 11;
      const arm = 5;
      ctx2d.strokeStyle = ACCENT;
      ctx2d.lineWidth = 1.2;
      ctx2d.globalAlpha = 0.9;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const px = x + sx * s;
        const py = y + sy * s;
        ctx2d.beginPath();
        ctx2d.moveTo(px - sx * arm, py);
        ctx2d.lineTo(px, py);
        ctx2d.lineTo(px, py - sy * arm);
        ctx2d.stroke();
      }
      const m = Math.max(0, Math.floor((Date.now() - b.bornAtMs) / 60000));
      ctx2d.fillStyle = ACCENT;
      ctx2d.globalAlpha = 0.95;
      ctx2d.font = `${state.isMobile ? 8.5 : 9.5}px ${state.fontFam}`;
      ctx2d.fillText(
        `N-${pad2(b.slot + 1)} · ${b.device} · T+${m}m`,
        x + 16,
        y - 13
      );
      ctx2d.globalAlpha = 1;
    };

    const drawBlips = () => {
      const t = state.t;
      let removed = false;
      for (const b of state.blips) {
        let alpha = 1;
        const [x, y] = blipXY(b);
        if (b.state === "spawn") {
          // lock-on: two corner brackets converge on the new contact
          const p = Math.min(1, (t - b.spawnAt) / 0.55);
          alpha = 0.15 + 0.85 * p;
          const off = 26 * (1 - p) + 8;
          ctx2d.strokeStyle = ACCENT;
          ctx2d.lineWidth = 1.2;
          ctx2d.globalAlpha = 0.35 + 0.55 * p;
          ctx2d.beginPath();
          ctx2d.moveTo(x - off + 6, y - off);
          ctx2d.lineTo(x - off, y - off);
          ctx2d.lineTo(x - off, y - off + 6);
          ctx2d.stroke();
          ctx2d.beginPath();
          ctx2d.moveTo(x + off - 6, y + off);
          ctx2d.lineTo(x + off, y + off);
          ctx2d.lineTo(x + off, y + off - 6);
          ctx2d.stroke();
          if (p >= 1) b.state = "live";
        } else if (b.state === "leave") {
          // static burst, then gone
          const p = (t - b.leaveAt) / 0.5;
          if (p >= 1) {
            b.dead = true;
            removed = true;
            continue;
          }
          alpha = 1 - p;
          ctx2d.fillStyle = ROSE;
          for (let j = 0; j < 8; j++) {
            ctx2d.globalAlpha = (1 - p) * 0.55 * Math.random();
            ctx2d.fillRect(
              x + (Math.random() * 2 - 1) * 15,
              y + (Math.random() * 2 - 1) * 11,
              2,
              1.5
            );
          }
        }
        const since = t - b.pingAt;
        const hot = b.pingAt > -5 && since < 1.6 ? Math.exp(-since / 0.45) : 0;
        drawBlipBase(b, x, y, alpha, hot);
        // expanding ping ring (echo)
        if (b.pingAt > -5 && since < 1.1) {
          ctx2d.strokeStyle = ACCENT;
          ctx2d.lineWidth = 1;
          ctx2d.globalAlpha = (1 - since / 1.1) * 0.5 * alpha;
          ctx2d.beginPath();
          ctx2d.arc(x, y, 4 + since * 30, 0, TAU);
          ctx2d.stroke();
        }
      }
      if (removed) state.blips = state.blips.filter((b) => !b.dead);
      ctx2d.globalAlpha = 1;
    };

    const drawCursor = (dt: number) => {
      if (!fine || !entranceDone || !state.cur.seen) return;
      const c = state.cur;
      c.x += (c.tx - c.x) * Math.min(1, dt * 9);
      c.y += (c.ty - c.y) * Math.min(1, dt * 9);
      if (c.tx < 0 || c.ty < 0 || c.tx > state.w || c.ty > state.h) return;
      // dashed ray from radar center to the designator
      ctx2d.save();
      ctx2d.setLineDash([4, 6]);
      ctx2d.strokeStyle = "rgba(255,255,255,0.13)";
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(state.cx, state.cy);
      ctx2d.lineTo(c.x, c.y);
      ctx2d.stroke();
      ctx2d.restore();
      // crosshair ticks + center dot
      const col = state.lockTarget >= 0 ? ACCENT : "rgba(255,255,255,0.7)";
      ctx2d.strokeStyle = col;
      ctx2d.lineWidth = 1;
      ctx2d.globalAlpha = 0.9;
      const gap = 4;
      const len = 7;
      ctx2d.beginPath();
      ctx2d.moveTo(c.x - gap - len, c.y);
      ctx2d.lineTo(c.x - gap, c.y);
      ctx2d.moveTo(c.x + gap, c.y);
      ctx2d.lineTo(c.x + gap + len, c.y);
      ctx2d.moveTo(c.x, c.y - gap - len);
      ctx2d.lineTo(c.x, c.y - gap);
      ctx2d.moveTo(c.x, c.y + gap);
      ctx2d.lineTo(c.x, c.y + gap + len);
      ctx2d.stroke();
      ctx2d.fillStyle = col;
      ctx2d.fillRect(c.x - 0.5, c.y - 0.5, 1, 1);
      // bearing + range readout
      const dx = c.x - state.cx;
      const dy = c.y - state.cy;
      const deg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const rng = (Math.hypot(dx, dy) / state.R).toFixed(2);
      ctx2d.fillStyle = MUTED;
      ctx2d.globalAlpha = 0.85;
      ctx2d.font = `9px ${state.fontFam}`;
      ctx2d.fillText(
        `BRG ${String(deg).padStart(3, "0")} · RNG ${rng}`,
        c.x + 14,
        c.y + 18
      );
      ctx2d.globalAlpha = 1;
    };

    /* ── full dynamic frame ── */
    const draw = (dt: number) => {
      ctx2d.drawImage(gridCvs, 0, 0, state.w, state.h);
      const prevLead = state.sweep;
      state.sweep = (state.sweep + (dt * TAU) / SWEEP_PERIOD) % TAU;
      drawSweep(state.sweep, state.snap?.connected ? 1 : 0.35);
      // sweep ping: any live blip whose bearing the front crossed this frame
      const a0 = prevLead;
      const a1 = state.sweep;
      for (const b of state.blips) {
        if (b.state === "leave") continue;
        const th = b.bearing;
        const crossed = a0 <= a1 ? th > a0 && th <= a1 : th > a0 || th <= a1;
        if (crossed) b.pingAt = state.t;
      }
      // lock target: hover (desktop) or auto-cycle (touch)
      let hover = -1;
      if (fine && entranceDone && state.cur.seen) {
        for (const b of state.blips) {
          if (b.state === "leave") continue;
          const [x, y] = blipXY(b);
          const ddx = state.cur.x - x;
          const ddy = state.cur.y - y;
          if (ddx * ddx + ddy * ddy < 484) {
            hover = b.slot;
            break;
          }
        }
      }
      state.lockTarget = fine ? hover : entranceDone ? state.cycleSlot : -1;
      drawBlips();
      drawSelf(true);
      const lockB = state.blips.find(
        (b) => b.slot === state.lockTarget && b.state !== "leave"
      );
      if (lockB) drawLock(lockB);
      drawCursor(dt);
    };

    /* ── static frame (reduced motion) ── */
    const PARKED = 5.2; // parked sweep bearing, rad
    const paintStatic = () => {
      state.lockTarget = -1;
      ctx2d.drawImage(gridCvs, 0, 0, state.w, state.h);
      drawSweep(PARKED, state.snap?.connected ? 0.7 : 0.3);
      for (const b of state.blips) {
        const [x, y] = blipXY(b);
        drawBlipBase(b, x, y, 1, 0);
      }
      drawSelf(false);
      ctx2d.globalAlpha = 1;
    };

    /* ── debounced re-measure: radar geometry + bracket clamp. RO fires on
       initial observe too, self-healing any bogus first measurement (e.g.
       a zero-size mount in a background tab). ── */
    let rzId = 0;
    let measured = false;
    const remeasure = () => {
      build();
      layoutLock();
      if (reduced) paintStatic();
    };
    const ro = new ResizeObserver(() => {
      if (!measured) {
        measured = true;
        const r = rootEl.getBoundingClientRect();
        if (
          Math.round(r.width) !== state.w ||
          Math.round(r.height) !== state.h
        )
          remeasure();
        return;
      }
      window.clearTimeout(rzId);
      rzId = window.setTimeout(remeasure, 150);
    });
    ro.observe(rootEl);
    cleanups.push(() => {
      ro.disconnect();
      window.clearTimeout(rzId);
    });

    /* ── presence → contacts reconciliation ── */
    let prevSnap: PresenceSnapshot | null = null;
    const applySnap = (s: PresenceSnapshot) => {
      state.snap = s;
      const silent = prevSnap === null;
      const wasConn = prevSnap?.connected ?? false;
      const target = s.connected
        ? Math.min(Math.max(0, s.nodes - 1), MAX_BLIPS)
        : 0;
      let live = state.blips.filter((b) => b.state !== "leave");
      while (live.length < target) {
        const used = new Set(live.map((b) => b.slot));
        let slot = 0;
        while (used.has(slot)) slot++;
        state.blips.push({
          slot,
          bearing: blipBearing(slot),
          rangeN: blipRange(slot),
          device: "PC",
          state: "spawn",
          dead: false,
          spawnAt: state.t,
          leaveAt: 0,
          pingAt: -10,
          bornAtMs: Date.now(),
        });
        live = state.blips.filter((b) => b.state !== "leave");
        if (!silent && wasConn && s.connected)
          showEvt(`CONTACT ACQUIRED · N-${pad2(slot + 1)}`, ACCENT);
      }
      if (live.length > target) {
        const drop = live
          .sort((a, b) => b.slot - a.slot)
          .slice(0, live.length - target);
        for (const b of drop) {
          b.state = "leave";
          b.leaveAt = state.t;
          if (!silent && wasConn && s.connected)
            showEvt(`CONTACT LOST · N-${pad2(b.slot + 1)}`, ROSE);
        }
      }
      if (!silent && wasConn && !s.connected)
        showEvt("LINK OFFLINE · RETRYING", ROSE);
      else if (!silent && !wasConn && s.connected)
        showEvt("LINK ESTABLISHED", ACCENT);
      const ev = s.lastEvent;
      if (
        !silent &&
        ev &&
        ev.kind === "message" &&
        ev.at !== prevSnap?.lastEvent?.at
      ) {
        const raw = `RX · ${ev.name ?? "ANON"}: ${ev.text ?? ""}`;
        showEvt(raw.length > 44 ? `${raw.slice(0, 43)}…` : raw, "");
      }
      retag(s);
      renderLedger(s);
      prevSnap = s;
    };

    /* ════════════════ reduced motion: a static, fully-readable console ════════════════ */
    if (reduced) {
      locked = true;
      gctx.add(() => {
        if (lockWrap) gsap.set(lockWrap, { autoAlpha: 1 });
        brkEls.forEach((b, i) =>
          gsap.set(b, { x: state.lockT[i].x, y: state.lockT[i].y })
        );
        if (scanEl) gsap.set(scanEl, { autoAlpha: 0 });
        if (stampEl) gsap.set(stampEl, { autoAlpha: 1 });
      });
      // presence keeps the console truthful — repaint one frame per change
      const applyStatic = (s: PresenceSnapshot) => {
        state.snap = s;
        const target = s.connected
          ? Math.min(Math.max(0, s.nodes - 1), MAX_BLIPS)
          : 0;
        state.blips = Array.from({ length: target }, (_, i) => ({
          slot: i,
          bearing: blipBearing(i),
          rangeN: blipRange(i),
          device: "PC" as const,
          state: "live" as const,
          dead: false,
          spawnAt: 0,
          leaveAt: 0,
          pingAt: -10,
          bornAtMs: Date.now(),
        }));
        retag(s);
        renderLedger(s);
        paintStatic();
      };
      applyStatic(getPresenceSnapshot());
      cleanups.push(subscribePresence(applyStatic));

      cleanups.push(
        onBooted(() => {
          gctx.add(() => {
            gsap.fromTo(
              rootEl,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.7, ease: "power2.out" }
            );
          });
        })
      );
      return () => {
        disposed = true;
        cleanups.forEach((fn) => fn());
        gctx.revert();
      };
    }

    /* ── hidden initial states (JS only — page reads fine without JS) ── */
    gctx.add(() => {
      gsap.set(canvas, { autoAlpha: 0 });
      gsap.set(
        [headEl, rolesEl, ledgerEl, contactsEl].filter(Boolean),
        { opacity: 0 }
      );
      if (evtEl) gsap.set(evtEl, { autoAlpha: 0 });
      gsap.set(nameEl, { autoAlpha: 0 });
      if (lockWrap) gsap.set(lockWrap, { autoAlpha: 0 });
      if (scanEl) gsap.set(scanEl, { autoAlpha: 0 });
      if (stampEl) gsap.set(stampEl, { autoAlpha: 0 });
      gsap.set(clusterKids, { opacity: 0, y: 26 });
    });

    /* ── presence wiring (subscribe in effect, unsubscribe in cleanup) ── */
    applySnap(getPresenceSnapshot());
    cleanups.push(subscribePresence(applySnap));

    /* ── rAF loop, capped ~30fps, pauses offscreen + hidden tab ── */
    let raf = 0;
    let running = false;
    let inView = true;
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
      const should = booted && inView && !document.hidden && !disposed;
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

    /* ── pointer: targeting designator (fine) / auto-cycling lock (touch) ── */
    if (fine) {
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        state.cur.tx = e.clientX - r.left;
        state.cur.ty = e.clientY - r.top;
        if (!state.cur.seen) {
          state.cur.seen = true;
          state.cur.x = state.cur.tx;
          state.cur.y = state.cur.ty;
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onMove));
    } else {
      const cycleId = window.setInterval(() => {
        if (!running || !entranceDone) return;
        const live = state.blips
          .filter((b) => b.state !== "leave")
          .sort((a, b) => a.slot - b.slot);
        if (!live.length) {
          state.cycleSlot = -1;
          return;
        }
        const i = live.findIndex((b) => b.slot === state.cycleSlot);
        state.cycleSlot = live[(i + 1) % live.length].slot;
      }, 3500);
      cleanups.push(() => window.clearInterval(cycleId));
    }

    /* ── idle life: brackets re-tighten 2px + 1-frame accent edge ghost ── */
    let ghostId = 0;
    const idleId = window.setInterval(() => {
      if (!running || !entranceDone) return;
      brkEls.forEach((b, i) => {
        const dx = i % 2 === 0 ? 2 : -2;
        const dy = i < 2 ? 2 : -2;
        gsap.to(b, {
          x: `+=${dx}`,
          y: `+=${dy}`,
          duration: 0.09,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        });
      });
      nameEl.style.textShadow = `2px 0 ${ACCENT}a6`;
      window.clearTimeout(ghostId);
      ghostId = window.setTimeout(() => {
        if (!disposed) nameEl.style.textShadow = "";
      }, 80);
    }, 7000);
    cleanups.push(() => {
      window.clearInterval(idleId);
      window.clearTimeout(ghostId);
      brkEls.forEach((b) => gsap.killTweensOf(b));
    });

    /* ── entrance: target acquisition, gated on boot ── */
    cleanups.push(
      onBooted(() => {
        if (booted) return;
        booted = true;
        setRunning();
        gctx.add(() => {
          layoutLock(); // fresh measure right before the flight
          const fly = [
            { x: -120, y: -120 },
            { x: state.w + 120, y: -120 },
            { x: -120, y: state.h + 120 },
            { x: state.w + 120, y: state.h + 120 },
          ];
          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

          // 1 — the console wakes: grid + sweep fade up, mission header on
          tl.to(canvas, { autoAlpha: 1, duration: 0.9, ease: "power2.out" }, 0);
          if (headEl)
            tl.to(headEl, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.25);

          // 2 — dim silhouette of the target, then brackets fly in and clamp
          tl.to(nameEl, { autoAlpha: 0.3, duration: 0.4, ease: "power2.out" }, 0.35);
          if (lockWrap) tl.set(lockWrap, { autoAlpha: 1 }, 0.4);
          brkEls.forEach((b, i) => {
            tl.fromTo(
              b,
              { x: fly[i].x, y: fly[i].y },
              {
                x: () => state.lockT[i].x,
                y: () => state.lockT[i].y,
                duration: 0.75,
                ease: "back.out(1.7)", // overshoot + settle
              },
              0.4 + i * 0.05
            );
          });

          // 3 — scanline sweeps the bbox once
          if (scanEl) {
            tl.set(scanEl, { autoAlpha: 1, y: 0 }, 1.25);
            tl.to(
              scanEl,
              { y: () => state.lock.h, duration: 0.5, ease: "power2.inOut" },
              1.25
            );
            tl.to(scanEl, { autoAlpha: 0, duration: 0.18 }, 1.72);
          }

          // 4 — TARGET LOCKED + one fast decode pass over the name
          tl.to(nameEl, { autoAlpha: 1, duration: 0.25, ease: "power2.out" }, 1.55);
          tl.to(
            l1.current,
            {
              duration: 0.65,
              ease: "none",
              scrambleText: { text: NAME_L1, chars: SCR_CHARS, speed: 1.4 },
            },
            1.55
          );
          tl.to(
            l2.current,
            {
              duration: 0.7,
              ease: "none",
              scrambleText: { text: NAME_L2, chars: SCR_CHARS, speed: 1.4 },
            },
            1.63
          );
          if (stampEl)
            tl.fromTo(
              stampEl,
              { autoAlpha: 0, scale: 0.7 },
              { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" },
              1.6
            );

          // 5 — OSD chrome + copy/CTAs rise after lock
          tl.to(
            [rolesEl, ledgerEl, contactsEl].filter(Boolean),
            { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.08 },
            1.8
          );
          tl.to(
            clusterKids,
            { opacity: 1, y: 0, duration: 0.85, stagger: 0.1 },
            1.9
          );
          tl.call(
            () => {
              entranceDone = true;
              locked = true;
            },
            [],
            2.5
          );
        });
      })
    );

    return () => {
      disposed = true;
      running = false;
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf(
        [
          canvas,
          nameEl,
          l1.current,
          l2.current,
          headEl,
          rolesEl,
          ledgerEl,
          contactsEl,
          evtEl,
          scanEl,
          stampEl,
          lockWrap,
          ...brkEls,
          ...clusterKids,
        ].filter(Boolean)
      );
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
      {/* the ops radar — one Canvas2D surface, WebGL budget untouched */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 block h-full w-full"
      />

      {/* the target — real DOM type, clamped by the lock brackets */}
      <h1
        ref={nameRef}
        className="absolute z-10 font-display font-bold leading-[.94] tracking-[-.04em] text-[clamp(2.3rem,10.5vw,3rem)] max-md:bottom-[23rem] max-md:left-[var(--pad)] max-md:right-[var(--pad)] md:right-[var(--pad)] md:top-[24%] md:text-right md:text-[clamp(3.2rem,7.6vw,7.6rem)]"
      >
        <span className="block">
          <span ref={l1} className="inline-block">
            {NAME_L1}
          </span>
        </span>
        <span className="block">
          <span ref={l2} className="text-stroke inline-block">
            {NAME_L2}
          </span>
        </span>
      </h1>

      {/* target-lock overlay: corner brackets + scanline + stamp */}
      <div
        aria-hidden="true"
        className="hox-lockwrap pointer-events-none absolute inset-0 z-20"
      >
        <div className="hox-br hox-br-tl" />
        <div className="hox-br hox-br-tr" />
        <div className="hox-br hox-br-bl" />
        <div className="hox-br hox-br-br" />
        <div className="hox-scan" />
        <div className="hox-stamp absolute left-0 top-0 inline-flex items-center gap-1.5 border border-accent/50 bg-bg/70 px-2 py-1 font-mono text-[.55rem] tracking-[.22em] text-accent">
          <span className="hox-blink h-1 w-1 rounded-full bg-accent" />
          TARGET LOCKED
        </div>
      </div>

      {/* OSD: mission header + IST clock + event line, top-left */}
      <div className="hox-head absolute left-[var(--pad)] top-[4.6rem] z-30 font-mono text-[.6rem] leading-[1.8] tracking-[.08em] text-muted md:top-[5.5rem] md:text-[.68rem]">
        <div>
          <span className="text-accent">OP: </span>
          PORTFOLIO // GRID 22.71N 75.85E
        </div>
        <div className="hox-clock text-faint">IST --:--:--</div>
        {/* one-shot presence event line (acquired / lost / rx intercepts) */}
        <div aria-hidden="true" className="hox-evt text-faint" />
      </div>

      {/* OSD: roles row, top-right (desktop) */}
      <div className="hox-roles absolute right-[var(--pad)] top-[5.5rem] z-30 hidden items-center gap-x-3 font-mono text-[.65rem] uppercase tracking-[.22em] text-muted md:flex">
        {ROLES.map((r, i) => (
          <Fragment key={r}>
            {i > 0 && (
              <span aria-hidden="true" className="text-accent">
                ·
              </span>
            )}
            <span>{r}</span>
          </Fragment>
        ))}
      </div>

      {/* OSD: collapsed contact count, top-right (mobile) */}
      <div className="hox-contacts absolute right-[var(--pad)] top-[4.6rem] z-30 font-mono text-[.6rem] tracking-[.18em] text-muted md:hidden">
        CONTACTS: --
      </div>

      {/* OSD: contact ledger, bottom-right (desktop) */}
      <div className="hox-ledger absolute bottom-7 right-[var(--pad)] z-30 hidden w-[200px] font-mono text-[.6rem] leading-[1.9] tracking-[.12em] text-muted md:block">
        <div className="text-faint">CONTACT LEDGER</div>
        <div className="hox-rows" />
        <div className="hox-count text-accent">CONTACTS: --</div>
      </div>

      {/* bottom-left: roles (mobile) / copy / CTAs */}
      <div className="hox-cluster absolute bottom-6 left-[var(--pad)] right-[var(--pad)] z-30 md:bottom-7 md:right-auto md:max-w-[460px] lg:max-w-[560px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:hidden">
          {ROLES.map((r, i) => (
            <Fragment key={r}>
              {i > 0 && (
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
              )}
              <span>{r}</span>
            </Fragment>
          ))}
        </div>
        <p className="mt-4 max-w-[46ch] text-[.88rem] leading-[1.6] text-muted md:mt-0 md:text-[.95rem]">
          {COPY}
        </p>
        <div className="mt-6 flex gap-3 max-md:flex-col md:items-center">
          <a
            href="#projects"
            data-cursor="hover"
            className="hox-cta hox-cta--fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-6 py-3.5 font-mono text-[.66rem] uppercase tracking-[.24em] text-text max-md:w-full"
          >
            <span
              aria-hidden="true"
              className="hox-cta-bg absolute inset-0 bg-accent"
            />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
              VIEW CASE FILES
            </span>
          </a>
          <a
            href="#contact"
            data-cursor="hover"
            className="hox-cta inline-flex items-center justify-center border border-line px-6 py-3.5 font-mono text-[.66rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
          >
            TRANSMIT
          </a>
        </div>
      </div>

      <style>{`
        .hox-br {
          position: absolute;
          left: 0;
          top: 0;
          width: 22px;
          height: 22px;
          will-change: transform;
        }
        .hox-br-tl { border-top: 2px solid rgba(204,255,61,.9); border-left: 2px solid rgba(204,255,61,.9); }
        .hox-br-tr { border-top: 2px solid rgba(204,255,61,.9); border-right: 2px solid rgba(204,255,61,.9); }
        .hox-br-bl { border-bottom: 2px solid rgba(204,255,61,.9); border-left: 2px solid rgba(204,255,61,.9); }
        .hox-br-br { border-bottom: 2px solid rgba(204,255,61,.9); border-right: 2px solid rgba(204,255,61,.9); }
        .hox-scan {
          position: absolute;
          left: 0;
          top: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(204,255,61,.85) 30%, rgba(204,255,61,.85) 70%, transparent);
          box-shadow: 0 0 12px rgba(204,255,61,.35);
          will-change: transform;
        }
        .hox-stamp { will-change: transform; }
        .hox-blink { animation: hoxBlink 1.7s steps(2, end) infinite; }
        @keyframes hoxBlink { 50% { opacity: .35; } }
        .hox-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .hox-cta--fill:hover .hox-cta-bg,
        .hox-cta--fill:focus-visible .hox-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        @media (prefers-reduced-motion: reduce) {
          .hox-blink { animation: none; }
        }
      `}</style>
    </section>
  );
}
