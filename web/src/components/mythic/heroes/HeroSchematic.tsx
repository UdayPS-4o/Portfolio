"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";
import { magnetize } from "@/lib/mythic/magnetic";
import { scramble, splitChars } from "@/lib/mythic/text";
import { usePresence } from "@/lib/mythic/presence";

const ROLES = "FULL-STACK · RPA & AUTOMATION · REVERSE ENGINEERING";

const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

/** leader callout keys — real values are measured + injected by layout() */
const LEADS = ["CAP", "TRACKING", "BASELINE"] as const;
/** mobile measurement strip keys — same live values, shorter labels */
const MOBILE_DIMS = ["CAP", "TRK", "BASE"] as const;

const RET_SQUARE = "M44 44 L76 44 L76 76 L44 76 Z";
const RET_DIAMOND = "M60 41 L79 60 L60 79 L41 60 Z";
/** 8-tooth thin-stroke gear around (60,60) — middle form of the morph cycle */
const RET_GEAR =
  "M79.7 56.5 L79.7 63.5 L74 63.8 L72.6 67.3 L76.4 71.5 L71.5 76.4 L67.3 72.6 " +
  "L63.8 74 L63.5 79.7 L56.5 79.7 L56.3 74 L52.8 72.6 L48.5 76.4 L43.6 71.5 " +
  "L47.4 67.3 L46 63.8 L40.3 63.5 L40.3 56.5 L46 56.3 L47.4 52.8 L43.6 48.5 " +
  "L48.5 43.6 L52.8 47.4 L56.3 46 L56.5 40.3 L63.5 40.3 L63.8 46 L67.3 47.4 " +
  "L71.5 43.6 L76.4 48.5 L72.6 52.8 L74 56.3 Z";
const RET_FORMS = [RET_SQUARE, RET_GEAR, RET_DIAMOND] as const;

const CLIP_HIDDEN = "inset(-15% 100.5% -15% -0.5%)";
const CLIP_SHOWN = "inset(-15% -0.5% -15% -0.5%)";

const DWG_NO = "UDAYPS-2026-001";
/** fake barcode stroke widths (px) for the titleblock footer */
const BARS = [2, 1, 3, 1, 1, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 4, 2] as const;

/** zero-padded "0421.2" readout */
const fmtN = (n: number) => Math.max(0, n).toFixed(1).padStart(6, "0");

/** bridge from the imperative GSAP world to the usePresence() effect */
type PresenceApi = {
  setObservers: (label: string) => void;
  setRemote: (n: number) => void;
  joinPing: () => void;
  note: (name: string, text: string) => void;
};

/** deterministic per-slot hash → [0,1) (observer cross placement) */
const hashF = (i: number, k: number) => {
  let h = Math.imul(i + 1, 2654435761) ^ Math.imul(k + 1, 1597334677);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/**
 * HeroSchematic — 00 / SIGNAL.
 * The hero as a live engineering drawing plotting itself: a drafting
 * crosshair sweeps in construction lines, an accent plotter head (with a
 * coordinate ticker + 1px fading trail) races the baselines wiping the name
 * into view, DrawSVG dimension lines + leader callouts annotate the block
 * with the block's OWN measured geometry (W / CAP / TRACKING / BASELINE,
 * re-measured live on resize), a reticle morphs reticle→gear→diamond up
 * top-right, a block diagram of THIS PAGE's systems (GRID / PLOTTER /
 * CROSSHAIR / LINK) drafts itself bottom-right (modules hover-tint accent on
 * desktop with a status chip), drawing furniture drafts in (north arrow +
 * 1:1 scale bar, an A—A section cut-line that fades to 15%, a corner
 * cross-hatch patch), and the titleblock rows stagger in as the final beat.
 * Interactivity: the mouse is the drafting crosshair (snaps to the name's 8
 * geometry nodes, parks near the sheet corner with a STDBY tag after 4s
 * idle); click-drag measures any region of the sheet; hovering a single
 * letter draws a glyph-level selection bbox with its measured width and
 * clicking it scramble-decodes the glyph; double-click (tap on touch) stamps
 * a registration cross + coordinates that self-erase. Presence (via
 * @/lib/mythic/presence — the hero is the site's ONLY presence surface):
 * OBSERVERS count scramble-resolves, each remote node is plotted on the
 * sheet as a surveyor's cross + OBS-0n label at a deterministic safe anchor
 * (joins draw in with an accent flash + LINK pulse, leaves un-draw with a
 * rose tick), joins get a rose redline "+1", chat lines surface as a
 * read-only marginal "rx" note. No WebGL.
 */
export default function HeroSchematic() {
  const root = useRef<HTMLElement>(null);
  const gridEl = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const vigEl = useRef<HTMLDivElement>(null);
  const regs = useRef<HTMLDivElement>(null);
  const chV = useRef<HTMLDivElement>(null);
  const chH = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const snapH = useRef<HTMLDivElement>(null);
  const nameWrap = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const l2 = useRef<HTMLSpanElement>(null);
  const pen = useRef<HTMLDivElement>(null);
  const tkr = useRef<HTMLSpanElement>(null);
  const trail1 = useRef<HTMLDivElement>(null);
  const trail2 = useRef<HTMLDivElement>(null);
  const sel = useRef<HTMLDivElement>(null);
  const selRect = useRef<SVGRectElement>(null);
  const dims = useRef<SVGSVGElement>(null);
  const oly = useRef<SVGSVGElement>(null);
  const retWrap = useRef<HTMLDivElement>(null);
  const retSpin = useRef<SVGGElement>(null);
  const retSnap = useRef<SVGGElement>(null);
  const retMorph = useRef<SVGPathElement>(null);
  const retDash = useRef<SVGCircleElement>(null);
  const diagWrap = useRef<HTMLDivElement>(null);
  const diag = useRef<SVGSVGElement>(null);
  const mob = useRef<HTMLDivElement>(null);
  const para = useRef<HTMLParagraphElement>(null);
  const ctas = useRef<HTMLDivElement>(null);
  const block = useRef<HTMLDivElement>(null);
  const dateEl = useRef<HTMLSpanElement>(null);
  const dwgEl = useRef<HTMLSpanElement>(null);
  const scaleEl = useRef<HTMLSpanElement>(null);
  const revEl = useRef<HTMLSpanElement>(null);
  const obsCell = useRef<HTMLDivElement>(null);
  const obsEl = useRef<HTMLSpanElement>(null);
  const noteEl = useRef<HTMLDivElement>(null);
  const mbox = useRef<HTMLDivElement>(null);
  const mchip = useRef<HTMLDivElement>(null);
  const gsel = useRef<HTMLDivElement>(null);
  const gdim = useRef<HTMLSpanElement>(null);
  const stdbyTag = useRef<HTMLDivElement>(null);
  const dgChip = useRef<HTMLDivElement>(null);
  const naWrap = useRef<HTMLDivElement>(null);
  const hatchWrap = useRef<HTMLDivElement>(null);

  const presence = usePresence();
  const presenceApi = useRef<PresenceApi | null>(null);
  const presencePrimed = useRef(false);
  const lastEventAt = useRef(0);

  useEffect(() => {
    const rootEl = root.current;
    const svg = dims.current;
    const olyEl = oly.current;
    if (!rootEl || !svg || !olyEl) return;

    const reduced = prefersReduced();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ctx = gsap.context(() => {}, rootEl);
    const cleanups: Array<() => void> = [];
    const loops: gsap.core.Animation[] = [];
    let disposed = false;

    gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, ScrambleTextPlugin, CustomEase);
    CustomEase.create("hsxSweep", "M0,0 C0.14,1 0.34,1 1,1");
    CustomEase.create("hsxPlot", "M0,0 C0.3,0.06 0.7,0.94 1,1");

    /* ── titleblock live date (IST) ── */
    if (dateEl.current) {
      dateEl.current.textContent = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date())
        .replace(/-/g, ".");
    }

    /* ── per-letter spans for glyph selection (desktop, motion-ok only) ── */
    const chars: HTMLElement[] =
      fine && !reduced && l1.current && l2.current
        ? [...splitChars(l1.current), ...splitChars(l2.current)]
        : [];

    /* ── dimension SVG element handles ── */
    const q = <T extends SVGElement>(s: string) =>
      Array.from(svg.querySelectorAll<T>(s));
    const extLines = q<SVGLineElement>(".hsx-ext");
    const dsegs = q<SVGLineElement>(".hsx-dseg");
    const arrows = q<SVGPathElement>(".hsx-arrow");
    const dimText = svg.querySelector<SVGTextElement>(".hsx-dimtext");
    const under = svg.querySelector<SVGLineElement>(".hsx-under");
    const leadsG = svg.querySelector<SVGGElement>(".hsx-leads");
    const leadPaths = q<SVGPathElement>(".hsx-lead");
    const ldots = q<SVGCircleElement>(".hsx-ldot");
    const ltexts = q<SVGTextElement>(".hsx-ltext");
    /* redline + registration-cross machinery lives on the overlay svg
       (z-15, above content) so it can also circle the titleblock */
    const redMask = olyEl.querySelector<SVGEllipseElement>(".hsx-redmaskel");
    const redEl = olyEl.querySelector<SVGEllipseElement>(".hsx-redel");
    const redTxt = olyEl.querySelector<SVGTextElement>(".hsx-rev");
    const mmEls = mob.current
      ? Array.from(mob.current.querySelectorAll<HTMLElement>(".hsx-mm"))
      : [];
    /* section cut-line A—A (positioned by layout, drawn in the entrance) */
    const cutG = svg.querySelector<SVGGElement>(".hsx-cutg");
    const cutStrokes = q<SVGElement>(".hsx-cut, .hsx-cutflag");
    const cutLabs = q<SVGTextElement>(".hsx-cutlab");

    const att = (el: Element | null, o: Record<string, string | number>) => {
      if (!el) return;
      for (const k in o) el.setAttribute(k, String(o[k]));
    };
    /** swap an annotation's text + its scramble target in one go */
    const setTxt = (
      el: SVGTextElement | HTMLElement | null | undefined,
      t: string
    ) => {
      if (!el) return;
      if (el.textContent !== t) el.textContent = t;
      el.dataset.text = t;
    };

    /* ── shared geometry / state ── */
    const G = { settleX: 120, settleY: 360 };
    let tracking = false;
    let entranceDone = false;
    let booted = false;
    let inView = true;
    let running = false;
    let mx = -1;
    let my = -1;
    let moved = false;
    let chOn = true;
    let chipOn = false;
    let lifeId = 0;
    let redId = 0;
    let blkId = 0;
    let retForm = 0;
    let scrCancel: (() => void) | null = null;
    let glyphCancel: (() => void) | null = null;
    let scramblePool: Element[] = [];
    let snapNodes: Array<{ x: number; y: number }> = [];
    let snapIdx = -1;
    let redTl: gsap.core.Timeline | null = null;
    let noteTl: gsap.core.Timeline | null = null;
    /* crosshair standby (desktop): idle >4s parks it near the sheet corner */
    let standby = false;
    let lastMoveAt = 0;
    /* coordinate chip holds a printed message (GLYPH … · OK) until this ts */
    let chipHoldUntil = 0;
    /* plotted observer crosses (live presence on the sheet) */
    let obsAnchors: Array<{ x: number; y: number }> = [];
    let obsShown = 0;
    let obsTarget = 0;
    /* titleblock bounds (section-relative) so the coord chip can park ABOVE it
       instead of sliding behind the block and bleeding through its text */
    let blockTop = Infinity;
    let blockLeft = Infinity;

    /** drag-to-measure state (desktop only) */
    const msr = {
      pending: false,
      active: false,
      ax: 0,
      ay: 0,
      cx: 0,
      cy: 0,
      hold: null as gsap.core.Tween | null,
      un: null as gsap.core.Tween | null,
    };

    /** drafter's-lamp glow follows a point (transform only — compositor cheap) */
    const setGlow = (x: number, y: number) => {
      if (glow.current) gsap.set(glow.current, { x, y });
    };

    /* ── plotted observer crosses: slot pool + deterministic placement ── */
    type ObsSlot = {
      g: SVGGElement;
      strokes: SVGElement[];
      label: SVGTextElement | null;
      tl: gsap.core.Timeline | null;
    };
    const obsSlots: ObsSlot[] = Array.from(
      olyEl.querySelectorAll<SVGGElement>(".hsx-obsx")
    ).map((g) => ({
      g,
      strokes: Array.from(g.querySelectorAll<SVGElement>(".hsx-ox")),
      label: g.querySelector<SVGTextElement>(".hsx-oxt"),
      tl: null,
    }));
    const obsCapacity = () => (window.innerWidth < 768 ? 3 : 6);
    const placeObs = (i: number) => {
      const a = obsAnchors[i];
      const s = obsSlots[i];
      if (!a || !s) return;
      const [lh, lv] = s.strokes;
      att(lh, { x1: a.x - 5, y1: a.y, x2: a.x + 5, y2: a.y });
      att(lv, { x1: a.x, y1: a.y - 5, x2: a.x, y2: a.y + 5 });
      if (s.label) {
        s.label.textContent = `OBS-0${i + 1}`;
        att(s.label, {
          x: Math.min(a.x + 9, rootEl.clientWidth - 58),
          y: a.y - 7 < 12 ? a.y + 15 : a.y - 7,
        });
      }
    };
    cleanups.push(() => obsSlots.forEach((s) => s.tl?.kill()));

    /* ── layout: measure the name, plot every annotation coordinate.
         EVERY number on the sheet is a real measurement of the sheet. ── */
    const layout = () => {
      if (disposed || !l1.current || !l2.current) return;
      const sr = rootEl.getBoundingClientRect();
      const ra = l1.current.getBoundingClientRect();
      const rb = l2.current.getBoundingClientRect();
      const a = {
        l: ra.left - sr.left,
        r: ra.right - sr.left,
        t: ra.top - sr.top,
        cy: ra.top - sr.top + ra.height / 2,
      };
      const b = {
        l: rb.left - sr.left,
        r: rb.right - sr.left,
        b: rb.bottom - sr.top,
        cy: rb.top - sr.top + rb.height / 2,
      };
      const mobile = window.innerWidth < 768;
      const dimY = Math.max(a.t - 24, 14);
      const underY = b.b + 12;
      G.settleX = Math.min(a.l, b.l);
      G.settleY = underY;

      /* top width dimension (over line 1), text gap in the middle */
      const cx = (a.l + a.r) / 2;
      att(extLines[0], { x1: a.l, y1: a.t - 6, x2: a.l, y2: dimY - 6 });
      att(extLines[1], { x1: a.r, y1: a.t - 6, x2: a.r, y2: dimY - 6 });
      att(dsegs[0], { x1: a.l + 1, y1: dimY, x2: cx - 40, y2: dimY });
      att(dsegs[1], { x1: cx + 40, y1: dimY, x2: a.r - 1, y2: dimY });
      att(arrows[0], {
        d: `M${a.l + 7} ${dimY - 3.2} L${a.l} ${dimY} L${a.l + 7} ${dimY + 3.2}`,
      });
      att(arrows[1], {
        d: `M${a.r - 7} ${dimY - 3.2} L${a.r} ${dimY} L${a.r - 7} ${dimY + 3.2}`,
      });
      if (dimText) att(dimText, { x: cx, y: dimY + 0.5 });

      /* accent underline beneath line 2 */
      att(under, { x1: b.l + 1, y1: underY, x2: b.r, y2: underY });

      /* self-referential annotation values, re-measured on every resize */
      scrCancel?.();
      scrCancel = null;
      const cs = window.getComputedStyle(l1.current);
      const fs = parseFloat(cs.fontSize);
      const lsp = parseFloat(cs.letterSpacing);
      const trk =
        fs > 0 && Number.isFinite(lsp) ? (lsp / fs).toFixed(2) : "-0.04";
      const capH = Math.round(ra.height);
      setTxt(dimText, `W ${Math.round(ra.width)} PX`);
      setTxt(ltexts[0], `CAP ${capH} PX`);
      setTxt(ltexts[1], `TRACKING ${trk} EM`);
      setTxt(ltexts[2], `BASELINE Y ${Math.round(underY)}`);
      setTxt(mmEls[0], `CAP ${capH} PX`);
      setTxt(mmEls[1], `TRK ${trk} EM`);
      setTxt(mmEls[2], `BASE Y ${Math.round(underY)}`);

      /* leader callouts fanning to a right-margin column */
      const tx = sr.width - 30;
      const ex = tx - 92;
      const anchors: Array<[number, number]> = [
        [a.r + 12, a.cy],
        [b.r + 12, b.cy],
        [b.r + 14, underY],
      ];
      const ymid = (a.t + underY) / 2;
      const rows = [ymid - 34, ymid + 2, ymid + 38];
      const maxAx = Math.max(...anchors.map((p) => p[0]));
      const show = !mobile && ex - maxAx > 36;
      if (leadsG) leadsG.style.display = show ? "" : "none";
      if (show) {
        anchors.forEach(([ax, ay], i) => {
          att(ldots[i], { cx: ax, cy: ay });
          att(leadPaths[i], { d: `M${ax} ${ay} L${ex} ${rows[i]} L${tx} ${rows[i]}` });
          att(ltexts[i], { x: tx, y: rows[i] - 6 });
        });
      }

      /* section cut-line A—A through the name's vertical midpoint */
      if (cutG) cutG.style.display = mobile ? "none" : "";
      if (!mobile && cutG) {
        const cy = (a.t + b.b) / 2;
        const cx0 = 16;
        const cx1 = show ? ex - 18 : sr.width - 16;
        att(cutStrokes[0], { x1: cx0 + 8, y1: cy, x2: cx1 - 8, y2: cy });
        att(cutStrokes[1], { d: `M${cx0} ${cy - 8} L${cx0} ${cy + 8}` });
        att(cutStrokes[2], { d: `M${cx1} ${cy - 8} L${cx1} ${cy + 8}` });
        att(cutLabs[0], { x: cx0, y: cy - 13 });
        att(cutLabs[1], { x: cx1, y: cy - 13 });
      }

      /* 6 deterministic safe anchors for the plotted observer crosses:
         hash slot→candidate, reject anything near the sheet's content */
      const avoid: Array<{ l: number; t: number; r: number; b: number }> = [];
      const pushAvoid = (el: Element | null, pad = 26) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        avoid.push({
          l: r.left - sr.left - pad,
          t: r.top - sr.top - pad,
          r: r.right - sr.left + pad,
          b: r.bottom - sr.top + pad,
        });
      };
      pushAvoid(nameWrap.current, 40);
      pushAvoid(block.current);
      pushAvoid(diagWrap.current);
      pushAvoid(retWrap.current);
      pushAvoid(para.current);
      pushAvoid(ctas.current);
      pushAvoid(mob.current);
      obsAnchors = [];
      for (let i = 0; i < 6; i++) {
        let pick: { x: number; y: number } | null = null;
        for (let k = 0; k < 16 && !pick; k++) {
          const px = (0.05 + 0.88 * hashF(i, k * 2 + 1)) * sr.width;
          const py = (0.16 + 0.66 * hashF(i, k * 2 + 2)) * sr.height;
          const clear = !avoid.some(
            (rc) => px > rc.l && px < rc.r && py > rc.t && py < rc.b
          );
          const spaced = !obsAnchors.some(
            (p) => (p.x - px) ** 2 + (p.y - py) ** 2 < 4900
          );
          if (clear && (spaced || k > 9)) pick = { x: px, y: py };
        }
        obsAnchors.push(
          pick ?? { x: (0.08 + 0.15 * i) * sr.width, y: 0.13 * sr.height }
        );
      }
      for (let i = 0; i < obsShown; i++) placeObs(i);

      /* cache the titleblock box (section-relative) for the chip-avoidance clamp */
      if (block.current) {
        const br = block.current.getBoundingClientRect();
        blockTop = br.top - sr.top;
        blockLeft = br.left - sr.left;
      } else {
        blockTop = Infinity;
        blockLeft = Infinity;
      }

      /* 8 snap nodes on the name block: corners + edge midpoints (desktop) */
      if (fine && !mobile) {
        const nl = Math.min(a.l, b.l);
        const nr = Math.max(a.r, b.r);
        const nt = a.t;
        const nb = b.b;
        const nmx = (nl + nr) / 2;
        const nmy = (nt + nb) / 2;
        snapNodes = [
          { x: nl, y: nt },
          { x: nmx, y: nt },
          { x: nr, y: nt },
          { x: nl, y: nmy },
          { x: nr, y: nmy },
          { x: nl, y: nb },
          { x: nmx, y: nb },
          { x: nr, y: nb },
        ];
      } else {
        snapNodes = [];
      }
      if (snapIdx >= 0) {
        snapIdx = -1;
        if (snapH.current) gsap.set(snapH.current, { autoAlpha: 0 });
      }

      /* parked construction lines track the drawing if idle */
      if ((reduced || entranceDone) && !tracking) {
        if (chV.current) gsap.set(chV.current, { x: G.settleX });
        if (chH.current) gsap.set(chH.current, { y: G.settleY });
      }
    };

    layout();
    document.fonts?.ready.then(() => {
      if (!disposed) layout();
    });

    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(layout);
    });
    ro.observe(rootEl);
    cleanups.push(() => {
      ro.disconnect();
      cancelAnimationFrame(roRaf);
    });

    /* ── magnetic CTAs (no-ops on touch / reduced) ── */
    rootEl
      .querySelectorAll<HTMLElement>(".hsx-cta")
      .forEach((el) => cleanups.push(magnetize(el, 0.3)));

    /* ── registration-cross pool (double-click / tap stamps, max 3) ── */
    type CrossSlot = {
      g: SVGGElement;
      strokes: SVGElement[];
      label: SVGTextElement | null;
      tl: gsap.core.Timeline | null;
    };
    const crossSlots: CrossSlot[] = Array.from(
      olyEl.querySelectorAll<SVGGElement>(".hsx-cross")
    ).map((g) => ({
      g,
      strokes: Array.from(g.querySelectorAll<SVGElement>(".hsx-cr")),
      label: g.querySelector<SVGTextElement>(".hsx-crt"),
      tl: null,
    }));
    cleanups.push(() => crossSlots.forEach((s) => s.tl?.kill()));

    /* ════════════════ reduced motion: pre-drawn, one quiet fade ════════════════ */
    if (reduced) {
      ctx.add(() => {
        gsap.set(chV.current, { x: G.settleX });
        gsap.set(chH.current, { y: G.settleY });
        gsap.set(glow.current, { x: G.settleX, y: G.settleY });
        gsap.set(
          [
            chip.current,
            pen.current,
            sel.current,
            snapH.current,
            trail1.current,
            trail2.current,
            mbox.current,
            mchip.current,
            gsel.current,
            noteEl.current,
            stdbyTag.current,
            dgChip.current,
            ...crossSlots.map((s) => s.g),
            ...obsSlots.map((s) => s.g),
          ],
          { autoAlpha: 0 }
        );
      });
      /* presence still updates the OBSERVERS cell + plotted crosses —
         plain text / static marks, no theatrics */
      presenceApi.current = {
        setObservers: (label) => {
          if (obsEl.current && obsEl.current.textContent !== label)
            obsEl.current.textContent = label;
        },
        setRemote: (n) => {
          const target = Math.min(
            Math.max(0, n),
            obsCapacity(),
            obsSlots.length,
            obsAnchors.length
          );
          obsSlots.forEach((s, i) => {
            if (i < target) {
              placeObs(i);
              gsap.set(s.g, { autoAlpha: 1 });
              if (s.label) gsap.set(s.label, { autoAlpha: 0.7 });
            } else {
              gsap.set(s.g, { autoAlpha: 0 });
            }
          });
          obsShown = target;
        },
        joinPing: () => {},
        note: () => {},
      };
      cleanups.push(() => {
        presenceApi.current = null;
      });
      cleanups.push(
        onBooted(() => {
          ctx.add(() => {
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
        ctx.revert();
      };
    }

    /* event-driven overlays start hidden — set from JS, never CSS */
    gsap.set(
      [
        mbox.current,
        mchip.current,
        gsel.current,
        noteEl.current,
        stdbyTag.current,
        dgChip.current,
        ...crossSlots.map((s) => s.g),
        ...obsSlots.map((s) => s.g),
      ],
      { autoAlpha: 0 }
    );

    /* ── system diagram handles (shared by the entrance, hover + LINK pulse) ── */
    const dg = diag.current;
    const dgq = <T extends SVGElement>(s: string): T[] =>
      dg ? Array.from(dg.querySelectorAll<T>(s)) : [];
    const dgBoxes = dgq<SVGRectElement>(".hsx-dg-box");
    const dgLeads = dgq<SVGPathElement>(".hsx-dg-lead");
    const dgArrs = dgq<SVGPathElement>(".hsx-dg-arr");
    const dgLabs = dgq<SVGTextElement>(".hsx-dg-lab");
    const dgIdx = dgq<SVGTextElement>(".hsx-dg-idx");
    const dgFbG = dg?.querySelector<SVGGElement>(".hsx-dg-fbg") ?? null;
    const dgFbPath = dg?.querySelector<SVGPathElement>(".hsx-dg-fb") ?? null;
    const dgFbArr = dg?.querySelector<SVGPathElement>(".hsx-dg-fbarr") ?? null;
    const dgHead =
      diagWrap.current?.querySelector<HTMLElement>(".hsx-dg-head") ?? null;
    const dgVisible = () =>
      !!diagWrap.current &&
      window.getComputedStyle(diagWrap.current).display !== "none";

    /* LINK module pulses once on a presence join (class + CSS transition) */
    let linkPulse: gsap.core.Tween | null = null;
    const pulseLink = () => {
      const box = dgBoxes[3];
      if (!box || !dgVisible()) return;
      box.classList.add("hsx-dg-on");
      linkPulse?.kill();
      linkPulse = gsap.delayedCall(0.55, () => box.classList.remove("hsx-dg-on"));
    };
    cleanups.push(() => linkPulse?.kill());

    /* ── observer crosses: draw in (accent flash) / un-draw (rose tick) ── */
    const showObs = (i: number, instant: boolean, delay = 0) => {
      const s = obsSlots[i];
      if (!s) return;
      placeObs(i);
      s.tl?.kill();
      if (instant) {
        gsap.set(s.strokes, { drawSVG: "100%", clearProps: "stroke" });
        gsap.set(s.g, { autoAlpha: 1 });
        if (s.label) gsap.set(s.label, { autoAlpha: 0.7 });
        return;
      }
      s.tl = gsap
        .timeline({ delay })
        .set(s.g, { autoAlpha: 1 })
        .set(s.strokes, { stroke: "#ccff3d" })
        .fromTo(
          s.strokes,
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 0.4, ease: "power2.out", stagger: 0.07 }
        )
        .fromTo(s.label, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.3 }, 0.2)
        .to(
          s.strokes,
          { stroke: "rgba(255,255,255,.45)", duration: 0.6, ease: "power2.out", clearProps: "stroke" },
          0.55
        );
      pulseLink();
    };
    const hideObs = (i: number) => {
      const s = obsSlots[i];
      if (!s) return;
      s.tl?.kill();
      s.tl = gsap
        .timeline()
        .set(s.strokes, { stroke: "#ff5c7c" })
        .to(s.label, { autoAlpha: 0, duration: 0.25 }, 0)
        .to(
          s.strokes,
          { drawSVG: "100% 100%", duration: 0.35, ease: "power2.in", stagger: 0.05 },
          0
        )
        .set(s.g, { autoAlpha: 0 })
        .set(s.strokes, { clearProps: "stroke" });
    };
    const applyObs = (instant = false) => {
      const n = Math.min(
        obsTarget,
        obsCapacity(),
        obsSlots.length,
        obsAnchors.length
      );
      let d = 0;
      while (obsShown < n) {
        showObs(obsShown++, instant, d);
        d += 0.15;
      }
      while (obsShown > n) hideObs(--obsShown);
    };

    /* ── drag-to-measure painter (also runs the un-draw, p: 1 → 0) ── */
    const paintMeasure = (p: number) => {
      const bx = mbox.current;
      const bc = mchip.current;
      if (!bx || !bc) return;
      const w = rootEl.clientWidth;
      const h = rootEl.clientHeight;
      const cornX = msr.ax + (msr.cx - msr.ax) * p;
      const cornY = msr.ay + (msr.cy - msr.ay) * p;
      const bw = Math.abs(cornX - msr.ax);
      const bh = Math.abs(cornY - msr.ay);
      gsap.set(bx, {
        x: Math.min(msr.ax, cornX),
        y: Math.min(msr.ay, cornY),
        width: bw,
        height: bh,
      });
      gsap.set(bc, {
        x: Math.min(Math.max(cornX + 14, 8), w - 112),
        y: Math.min(Math.max(cornY + 16, 8), h - 34),
      });
      bc.textContent = `${Math.round(bw)}×${Math.round(bh)} PX`;
    };
    const endMeasure = () => {
      if (!msr.pending && !msr.active) return;
      msr.pending = false;
      if (!msr.active) return;
      msr.active = false;
      rootEl.classList.remove("hsx-measuring");
      msr.hold?.kill();
      /* hold the reading 1.2s, then un-draw back toward the anchor */
      msr.hold = gsap.delayedCall(1.2, () => {
        const proxy = { p: 1 };
        msr.un?.kill();
        msr.un = gsap.to(proxy, {
          p: 0,
          duration: 0.45,
          ease: "power3.inOut",
          onUpdate: () => paintMeasure(proxy.p),
          onComplete: () => {
            if (mbox.current && mchip.current)
              gsap.set([mbox.current, mchip.current], { autoAlpha: 0 });
          },
        });
      });
    };
    cleanups.push(() => {
      msr.hold?.kill();
      msr.un?.kill();
    });

    /* ── glyph-level selection (one letter at a time, desktop) ── */
    let curChar: HTMLElement | null = null;
    const selectChar = (c: HTMLElement | null) => {
      if (c === curChar) return;
      if (curChar)
        gsap.to(curChar, { y: 0, duration: 0.25, ease: "power2.out", overwrite: "auto" });
      curChar = c;
      const g = gsel.current;
      if (!g) return;
      if (!c) {
        gsap.to(g, { autoAlpha: 0, duration: 0.2, ease: "power2.out", overwrite: "auto" });
        return;
      }
      const sr = rootEl.getBoundingClientRect();
      const r = c.getBoundingClientRect();
      gsap.set(g, {
        x: r.left - sr.left - 3,
        y: r.top - sr.top - 5,
        width: r.width + 6,
        height: r.height + 6,
      });
      if (gdim.current) gdim.current.textContent = `W ${Math.round(r.width)} PX`;
      gsap.to(g, { autoAlpha: 1, duration: 0.18, ease: "power2.out", overwrite: "auto" });
      gsap.to(c, { y: -2, duration: 0.2, ease: "power3.out", overwrite: "auto" });
    };
    chars.forEach((c) => {
      if (!c.textContent || c.textContent === " ") return;
      const enter = () => {
        if (entranceDone && !msr.active && !msr.pending) selectChar(c);
      };
      const leave = () => {
        if (curChar === c) selectChar(null);
      };
      /* click: one-glyph scramble-decode + accent flash on the micro-dim */
      const click = () => {
        if (!entranceDone || msr.active) return;
        const ch = (c.dataset.text ?? c.textContent ?? "").trim();
        glyphCancel?.();
        glyphCancel = scramble(c, { duration: 0.45 });
        if (gsel.current)
          gsap.fromTo(
            gsel.current,
            { borderColor: "rgba(204,255,61,.9)" },
            {
              borderColor: "rgba(255,255,255,.55)",
              duration: 0.7,
              ease: "power2.out",
              clearProps: "borderColor",
            }
          );
        if (chip.current) {
          chip.current.textContent = `GLYPH ${ch || "·"} · OK`;
          chipHoldUntil = performance.now() + 1200;
        }
      };
      c.addEventListener("pointerenter", enter);
      c.addEventListener("pointerleave", leave);
      c.addEventListener("click", click);
      cleanups.push(() => {
        c.removeEventListener("pointerenter", enter);
        c.removeEventListener("pointerleave", leave);
        c.removeEventListener("click", click);
      });
    });
    cleanups.push(() => glyphCancel?.());

    /* ── registration cross stamp (double-click / tap), DrawSVG in/out ── */
    let nextCross = 0;
    const stampCross = (x: number, y: number) => {
      const slot = crossSlots[nextCross];
      if (!slot) return;
      nextCross = (nextCross + 1) % crossSlots.length;
      slot.tl?.kill();
      const [lh, lv, ring] = slot.strokes;
      att(lh, { x1: x - 9, y1: y, x2: x + 9, y2: y });
      att(lv, { x1: x, y1: y - 9, x2: x, y2: y + 9 });
      att(ring, { cx: x, cy: y });
      const w = rootEl.clientWidth;
      att(slot.label, {
        x: Math.min(x + 13, w - 72),
        y: y - 8 < 12 ? y + 17 : y - 8,
      });
      if (slot.label)
        slot.label.textContent = `${Math.round(x)},${Math.round(y)}`;
      slot.tl = gsap
        .timeline()
        .set(slot.g, { autoAlpha: 1 })
        .fromTo(
          slot.strokes,
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 0.35, ease: "power2.out", stagger: 0.06 }
        )
        .fromTo(slot.label, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.3 }, 0.25)
        .to(
          slot.strokes,
          { drawSVG: "100% 100%", duration: 0.35, ease: "power2.in", stagger: 0.04 },
          6
        )
        .to(slot.label, { autoAlpha: 0, duration: 0.3 }, 6)
        .set(slot.g, { autoAlpha: 0 });
    };

    /* ── pointer tracking + measure/stamp wiring ── */
    if (fine) {
      const onMove = (e: PointerEvent) => {
        mx = e.clientX;
        my = e.clientY;
        moved = true;
        lastMoveAt = performance.now();
        /* any movement snaps the crosshair out of standby */
        if (standby) {
          standby = false;
          if (stdbyTag.current)
            gsap.to(stdbyTag.current, { autoAlpha: 0, duration: 0.25, overwrite: "auto" });
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      const onDown = (e: PointerEvent) => {
        if (e.button !== 0 || !entranceDone) return;
        if ((e.target as Element | null)?.closest?.("a, button, .hsx-block")) return;
        const sr = rootEl.getBoundingClientRect();
        msr.hold?.kill();
        msr.un?.kill();
        if (mbox.current && mchip.current)
          gsap.set([mbox.current, mchip.current], { autoAlpha: 0 });
        mx = e.clientX;
        my = e.clientY;
        moved = true;
        msr.pending = true;
        msr.active = false;
        msr.ax = msr.cx = e.clientX - sr.left;
        msr.ay = msr.cy = e.clientY - sr.top;
      };
      const onUp = () => endMeasure();
      const onDbl = (e: MouseEvent) => {
        if (!entranceDone) return;
        if ((e.target as Element | null)?.closest?.("a, button, .hsx-block")) return;
        const sr = rootEl.getBoundingClientRect();
        window.getSelection()?.removeAllRanges();
        stampCross(e.clientX - sr.left, e.clientY - sr.top);
      };
      rootEl.addEventListener("pointerdown", onDown);
      rootEl.addEventListener("dblclick", onDbl);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        rootEl.removeEventListener("pointerdown", onDown);
        rootEl.removeEventListener("dblclick", onDbl);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);
        rootEl.classList.remove("hsx-measuring");
      });
    } else {
      /* touch: tap stamps a registration cross (drag-measure + glyph hover skipped) */
      const onTap = (e: MouseEvent) => {
        if (!entranceDone) return;
        if ((e.target as Element | null)?.closest?.("a, button, .hsx-block")) return;
        const sr = rootEl.getBoundingClientRect();
        stampCross(e.clientX - sr.left, e.clientY - sr.top);
      };
      rootEl.addEventListener("click", onTap);
      cleanups.push(() => rootEl.removeEventListener("click", onTap));
    }

    /* ── per-frame: grid parallax + lerped crosshair + snap nodes + chip ── */
    const pos = { x: 0, y: 0, gx: 0, gy: 0 };
    const tick = () => {
      const sr = rootEl.getBoundingClientRect();
      /* fresh titleblock bounds every frame (read before any writes this frame,
         so no forced reflow) — keeps the coord-chip clamp accurate even though
         the block animates/clip-reveals during the entrance */
      if (block.current) {
        const br = block.current.getBoundingClientRect();
        blockTop = br.top - sr.top;
        blockLeft = br.left - sr.left;
      }
      if (moved && gridEl.current) {
        const nx = (mx / window.innerWidth) * 2 - 1;
        const ny = (my / window.innerHeight) * 2 - 1;
        pos.gx += (nx * 14 - pos.gx) * 0.04;
        pos.gy += (ny * 10 - pos.gy) * 0.04;
        gsap.set(gridEl.current, { x: pos.gx, y: pos.gy });
      }
      if (!tracking) return;
      const inside =
        moved && mx >= sr.left && mx <= sr.right && my >= sr.top && my <= sr.bottom;

      /* live drag-to-measure rect */
      if (msr.pending || msr.active) {
        const rx = Math.min(Math.max(mx - sr.left, 0), sr.width);
        const ry = Math.min(Math.max(my - sr.top, 0), sr.height);
        msr.cx = rx;
        msr.cy = ry;
        if (!msr.active) {
          const ddx = rx - msr.ax;
          const ddy = ry - msr.ay;
          if (ddx * ddx + ddy * ddy > 16) {
            msr.active = true;
            selectChar(null);
            window.getSelection()?.removeAllRanges();
            rootEl.classList.add("hsx-measuring");
            if (mbox.current && mchip.current)
              gsap.set([mbox.current, mchip.current], { autoAlpha: 1 });
          }
        }
        if (msr.active) paintMeasure(1);
      }

      /* snap-to-geometry: magnetic lock within 24px of a name node */
      let target = -1;
      if (inside && snapNodes.length) {
        const rx = mx - sr.left;
        const ry = my - sr.top;
        for (let i = 0; i < snapNodes.length; i++) {
          const dx = rx - snapNodes[i].x;
          const dy = ry - snapNodes[i].y;
          if (dx * dx + dy * dy < 576) {
            target = i;
            break;
          }
        }
      }
      if (target !== snapIdx) {
        snapIdx = target;
        if (target >= 0) {
          const n = snapNodes[target];
          if (snapH.current) {
            gsap.killTweensOf(snapH.current);
            gsap.set(snapH.current, { x: n.x, y: n.y, autoAlpha: 1 });
            gsap.fromTo(
              snapH.current,
              { scale: 1.4 },
              { scale: 1, duration: 0.35, ease: "back.out(3)" }
            );
          }
          if (chip.current)
            chip.current.textContent = `SNAP: NODE_0${target + 1} · Δ0.00`;
        } else if (snapH.current) {
          gsap.to(snapH.current, {
            autoAlpha: 0,
            scale: 0.7,
            duration: 0.25,
            overwrite: "auto",
          });
        }
      }
      /* standby: idle >4s drifts the crosshair to park near the sheet corner */
      if (
        !standby &&
        entranceDone &&
        moved &&
        inside &&
        !msr.active &&
        !msr.pending &&
        performance.now() - lastMoveAt > 4000
      ) {
        standby = true;
        if (stdbyTag.current)
          gsap.to(stdbyTag.current, { autoAlpha: 0.55, duration: 0.45, overwrite: "auto" });
      }

      const snapped = snapIdx >= 0;
      const txx = standby
        ? 28
        : snapped
          ? snapNodes[snapIdx].x
          : moved
            ? mx - sr.left
            : G.settleX;
      const tyy = standby
        ? sr.height - 28
        : snapped
          ? snapNodes[snapIdx].y
          : moved
            ? my - sr.top
            : G.settleY;
      const lf = standby ? 0.035 : snapped ? 0.45 : 0.3;
      pos.x += (txx - pos.x) * lf;
      pos.y += (tyy - pos.y) * lf;
      if (chV.current) gsap.set(chV.current, { x: pos.x });
      if (chH.current) gsap.set(chH.current, { y: pos.y });
      setGlow(pos.x, pos.y);
      if (standby && stdbyTag.current)
        gsap.set(stdbyTag.current, { x: pos.x + 12, y: pos.y - 20 });
      if (chip.current) {
        const cx = Math.min(pos.x + 18, sr.width - 158);
        let cy = pos.y + 20;
        /* if the chip would land over the titleblock, lift it clear ABOVE the
           block (the block is opaque + on top, so otherwise the chip hides
           under it). 8px slack on the left edge catches near-misses too. */
        if (cx + 140 > blockLeft - 8 && cy + 24 > blockTop) cy = blockTop - 34;
        cy = Math.min(cy, sr.height - 42);
        gsap.set(chip.current, { x: cx, y: cy });
        if (!snapped && performance.now() > chipHoldUntil)
          chip.current.textContent = `X ${fmtN(pos.x)} · Y ${fmtN(pos.y)}`;
      }
      const wantLines = inside || !moved;
      if (wantLines !== chOn) {
        chOn = wantLines;
        gsap.to([chV.current, chH.current], {
          autoAlpha: wantLines ? 1 : 0,
          duration: 0.3,
          overwrite: "auto",
        });
      }
      /* the measure chip replaces the coordinate chip while measuring;
         standby hides it behind the STDBY tag */
      const wantChip = inside && !msr.active && !standby;
      if (wantChip !== chipOn) {
        chipOn = wantChip;
        gsap.to(chip.current, {
          autoAlpha: wantChip ? 0.92 : 0,
          duration: 0.35,
          overwrite: "auto",
        });
      }
    };

    /* ── run-state: pause everything offscreen / hidden tab ── */
    const setRunning = () => {
      const should = inView && !document.hidden && booted && !disposed;
      if (should === running) return;
      running = should;
      if (fine) {
        if (should) {
          lastMoveAt = performance.now(); // don't wake into instant standby
          gsap.ticker.add(tick);
        } else gsap.ticker.remove(tick);
      }
      loops.forEach((t) => (should ? t.play() : t.pause()));
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
      gsap.ticker.remove(tick);
    });

    /* ── periodic life: one measurement re-resolves; the reticle snaps 90°
         and MorphSVGs through reticle → gear → diamond ── */
    const lifeTick = () => {
      if (!inView || document.hidden || disposed) return;
      const el = scramblePool[(Math.random() * scramblePool.length) | 0];
      if (el) {
        scrCancel?.();
        scrCancel = scramble(el as unknown as HTMLElement, { duration: 0.7 });
      }
      if (retSnap.current)
        gsap.to(retSnap.current, {
          rotation: "+=90",
          duration: 0.55,
          ease: "expo.inOut",
          svgOrigin: "60 60",
        });
      retForm = (retForm + 1) % RET_FORMS.length;
      if (retMorph.current)
        gsap.to(retMorph.current, {
          morphSVG: RET_FORMS[retForm],
          duration: 0.6,
          ease: "expo.inOut",
        });
    };

    /* ── redline machinery: a reviewer hand-circles a target (rose only) ── */
    const runRedline = (
      ecx: number,
      ecy: number,
      erx: number,
      ery: number,
      note: string
    ) => {
      if (disposed || !redMask || !redEl || !redTxt) return;
      if (redTl && redTl.isActive()) return;
      const rot = (Math.random() * 10 - 5).toFixed(1);
      const tf = `rotate(${rot} ${ecx} ${ecy})`;
      att(redMask, { cx: ecx, cy: ecy, rx: erx, ry: ery, transform: tf });
      att(redEl, { cx: ecx, cy: ecy, rx: erx, ry: ery, transform: tf });
      redTxt.textContent = note;
      const vw = rootEl.clientWidth || window.innerWidth;
      att(redTxt, {
        x: Math.min(ecx + erx * 0.55, vw - 44),
        y: ecy - ery - 6 < 14 ? ecy + ery + 14 : ecy - ery - 6,
      });
      redTl?.kill();
      redTl = gsap
        .timeline()
        .set(redEl, { autoAlpha: 0.9 })
        .set(redTxt, { autoAlpha: 0 })
        .fromTo(
          redMask,
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 0.55, ease: "power2.inOut" }
        )
        .to(redTxt, { autoAlpha: 1, duration: 0.25 }, 0.35)
        .to(redMask, { drawSVG: "100% 100%", duration: 0.45, ease: "power2.in" }, "+=1.2")
        .to(redTxt, { autoAlpha: 0, duration: 0.25 }, "<")
        .set(redEl, { autoAlpha: 0 });
    };
    const redTick = () => {
      if (!inView || document.hidden || disposed || !entranceDone) return;
      const pool = [
        dimText,
        ...(leadsG && leadsG.style.display !== "none" ? ltexts : []),
      ].filter(Boolean) as SVGTextElement[];
      const t = pool[(Math.random() * pool.length) | 0];
      if (!t) return;
      let bb: DOMRect;
      try {
        bb = t.getBBox();
      } catch {
        return;
      }
      if (!bb.width) return;
      runRedline(
        bb.x + bb.width / 2,
        bb.y + bb.height / 2,
        bb.width / 2 + 16,
        bb.height / 2 + 11,
        "rev?"
      );
    };

    /* ── titleblock life: a DIFFERENT cell scramble-resolves each cycle;
         REV occasionally ticks 2.0 → 2.1 → back ── */
    let blockCycle = 0;
    let revFlip = false;
    let revBack: gsap.core.Tween | null = null;
    const cellScramble = (el: HTMLElement | null, text: string, chars: string) => {
      if (!el || !text) return;
      gsap.killTweensOf(el);
      gsap.to(el, {
        duration: 0.8,
        ease: "none",
        scrambleText: { text, chars, speed: 0.4 },
      });
    };
    const blockTick = () => {
      if (!inView || document.hidden || disposed) return;
      const step = blockCycle % 5;
      blockCycle++;
      if (step === 0) cellScramble(scaleEl.current, "1:1", "0123456789:");
      else if (step === 1) {
        revFlip = !revFlip;
        if (revFlip) {
          cellScramble(revEl.current, "2.1", "0123456789.");
          revBack?.kill();
          revBack = gsap.delayedCall(3.4, () =>
            cellScramble(revEl.current, "2.0", "0123456789.")
          );
        } else cellScramble(revEl.current, "2.0", "0123456789.");
      } else if (step === 2)
        cellScramble(dateEl.current, dateEl.current?.textContent ?? "", "0123456789.");
      else if (step === 3)
        cellScramble(dwgEl.current, DWG_NO, "0123456789UDAYPS-");
      else cellScramble(obsEl.current, obsCurrent, "0123456789-/ ");
    };

    cleanups.push(() => {
      window.clearInterval(lifeId);
      window.clearInterval(redId);
      window.clearInterval(blkId);
      redTl?.kill();
      noteTl?.kill();
      revBack?.kill();
      scrCancel?.();
    });

    /* ── presence bridge: OBSERVERS cell + join redline + marginal rx note ── */
    let obsCurrent = obsEl.current?.textContent ?? "/ --";
    presenceApi.current = {
      setObservers: (label) => {
        const el = obsEl.current;
        if (!el || label === obsCurrent) return;
        obsCurrent = label;
        if (!entranceDone) {
          el.textContent = label;
          return;
        }
        gsap.killTweensOf(el);
        gsap.to(el, {
          duration: 0.7,
          ease: "none",
          scrambleText: { text: label, chars: "0123456789-/", speed: 0.5 },
        });
      },
      setRemote: (n) => {
        obsTarget = Math.max(0, n);
        /* before the entrance the sheet is still drafting itself —
           finish() reconciles the crosses with a draw-in */
        if (!entranceDone) return;
        applyObs();
      },
      joinPing: () => {
        if (!entranceDone || !inView || document.hidden) return;
        const cell = obsCell.current;
        if (!cell) return;
        const sr = rootEl.getBoundingClientRect();
        const r = cell.getBoundingClientRect();
        runRedline(
          r.left - sr.left + r.width / 2,
          r.top - sr.top + r.height / 2,
          r.width / 2 + 13,
          r.height / 2 + 9,
          "+1"
        );
      },
      note: (name, text) => {
        const el = noteEl.current;
        if (!el || !fine || window.innerWidth < 768) return;
        let s = `rx ${name}: ${text}`;
        if (s.length > 40) s = `${s.slice(0, 39)}…`;
        el.textContent = s;
        noteTl?.kill();
        noteTl = gsap
          .timeline()
          .fromTo(
            el,
            { autoAlpha: 0, y: 4 },
            { autoAlpha: 0.65, y: 0, duration: 0.4, ease: "power2.out" }
          )
          .to(el, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, 3.55);
      },
    };
    cleanups.push(() => {
      presenceApi.current = null;
      if (obsEl.current) gsap.killTweensOf(obsEl.current);
    });

    /* ── CAD selection rect on name hover (desktop) ── */
    let dashTween: gsap.core.Tween | null = null;
    if (fine && nameWrap.current && sel.current) {
      const wrap = nameWrap.current;
      const onEnter = () => {
        if (!entranceDone) return;
        ctx.add(() => {
          gsap.to(sel.current, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.28,
            ease: "power3.out",
            overwrite: "auto",
          });
        });
        dashTween?.kill();
        dashTween = gsap.to(selRect.current, {
          strokeDashoffset: -44,
          duration: 1.6,
          ease: "none",
          repeat: -1,
        });
      };
      const onLeave = () => {
        if (!entranceDone) return;
        ctx.add(() => {
          gsap.to(sel.current, {
            autoAlpha: 0,
            scale: 0.99,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
        dashTween?.kill();
        dashTween = null;
      };
      wrap.addEventListener("pointerenter", onEnter);
      wrap.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        wrap.removeEventListener("pointerenter", onEnter);
        wrap.removeEventListener("pointerleave", onLeave);
        dashTween?.kill();
      });
    }

    /* ── system-diagram module hover: border + connections tint accent,
         non-hovered connections dim, a status chip prints (desktop only) ── */
    if (fine && dg && dgBoxes.length === 4) {
      const allConns = [...dgLeads, ...dgArrs, dgFbPath, dgFbArr].filter(
        Boolean
      ) as SVGElement[];
      const mods: Array<{ name: string; idx: string; box: SVGRectElement; conns: SVGElement[] }> = [
        { name: "GRID", idx: "M1", box: dgBoxes[0], conns: [dgLeads[0], dgArrs[0], dgFbPath, dgFbArr].filter(Boolean) as SVGElement[] },
        { name: "PLOTTER", idx: "M2", box: dgBoxes[1], conns: [dgLeads[1], dgArrs[1]].filter(Boolean) as SVGElement[] },
        { name: "CROSSHAIR", idx: "M3", box: dgBoxes[2], conns: [dgLeads[0], dgLeads[1], dgLeads[2], dgArrs[0], dgArrs[1], dgArrs[2]].filter(Boolean) as SVGElement[] },
        { name: "LINK", idx: "M4", box: dgBoxes[3], conns: [dgLeads[2], dgArrs[2], dgFbPath, dgFbArr].filter(Boolean) as SVGElement[] },
      ];
      mods.forEach((m) => {
        const enter = () => {
          if (!entranceDone) return;
          m.box.classList.add("hsx-dg-on");
          m.conns.forEach((c) => c.classList.add("hsx-dg-on"));
          allConns.forEach((c) => {
            if (!m.conns.includes(c)) c.classList.add("hsx-dg-dim");
          });
          if (dgChip.current) {
            dgChip.current.textContent = `${m.idx} · ${m.name} · ACTIVE`;
            gsap.to(dgChip.current, { autoAlpha: 0.9, duration: 0.25, overwrite: "auto" });
          }
        };
        const leave = () => {
          m.box.classList.remove("hsx-dg-on");
          allConns.forEach((c) => c.classList.remove("hsx-dg-on", "hsx-dg-dim"));
          if (dgChip.current)
            gsap.to(dgChip.current, { autoAlpha: 0, duration: 0.25, overwrite: "auto" });
        };
        m.box.addEventListener("pointerenter", enter);
        m.box.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          m.box.removeEventListener("pointerenter", enter);
          m.box.removeEventListener("pointerleave", leave);
        });
      });
    }

    /* ── reticle stroke targets ── */
    const retStrokes = retWrap.current
      ? Array.from(
          retWrap.current.querySelectorAll<SVGElement>(".hsx-rst:not(.hsx-rdash)")
        )
      : [];

    /* ════════════════ entrance: the drawing drafts itself ════════════════ */
    cleanups.push(
      onBooted(() => {
        booted = true;
        ctx.add(() => {
          layout();
          const sr = rootEl.getBoundingClientRect();
          const nb = nameWrap.current!.getBoundingClientRect();
          const ra = l1.current!.getBoundingClientRect();
          const rb = l2.current!.getBoundingClientRect();
          const p1 = {
            x0: ra.left - nb.left,
            x1: ra.right - nb.left,
            y: ra.top - nb.top + ra.height * 0.52,
          };
          const p2 = {
            x0: rb.left - nb.left,
            x1: rb.right - nb.left,
            y: rb.top - nb.top + rb.height * 0.52,
          };
          const regEls = regs.current ? Array.from(regs.current.children) : [];
          const blockCells = block.current
            ? Array.from(block.current.querySelectorAll<HTMLElement>(".hsx-cell"))
            : [];
          const mobEls = mob.current ? Array.from(mob.current.children) : [];

          /* system diagram (CSS gates it to large viewports) + drawing
             furniture (north arrow / scale bar, hatch patch, cut-line) */
          const dgOn = !!dg && dgVisible();
          const naOn =
            !!naWrap.current &&
            window.getComputedStyle(naWrap.current).display !== "none";
          const naStrokes = naOn
            ? Array.from(naWrap.current!.querySelectorAll<SVGElement>(".hsx-nast"))
            : [];
          const naFills = naOn
            ? Array.from(naWrap.current!.querySelectorAll<SVGElement>(".hsx-nafill"))
            : [];
          const naTexts = naOn
            ? Array.from(naWrap.current!.querySelectorAll<SVGElement>(".hsx-nat"))
            : [];
          const naRot =
            naWrap.current?.querySelector<SVGGElement>(".hsx-na-rot") ?? null;
          const hatchOn =
            !!hatchWrap.current &&
            window.getComputedStyle(hatchWrap.current).display !== "none";
          const hatchLines = hatchOn
            ? Array.from(hatchWrap.current!.querySelectorAll<SVGElement>(".hsx-hat"))
            : [];
          const cutOn = !!cutG && cutG.style.display !== "none";

          /* plotter ticker streams the head's live coordinates */
          const tickText = () => {
            if (!tkr.current || !pen.current) return;
            const px = Number(gsap.getProperty(pen.current, "x"));
            const py = Number(gsap.getProperty(pen.current, "y"));
            tkr.current.textContent = `PLT ${fmtN(px)},${fmtN(py)}`;
          };

          /* hidden initial states — JS only, never CSS */
          gsap.set([gridEl.current, vigEl.current], { autoAlpha: 0 });
          gsap.set(glow.current, { autoAlpha: 0, x: G.settleX, y: G.settleY });
          gsap.set(regEls, { autoAlpha: 0 });
          gsap.set([chV.current, chH.current, chip.current], { autoAlpha: 0 });
          gsap.set(snapH.current, { autoAlpha: 0 });
          gsap.set([l1.current, l2.current], { clipPath: CLIP_HIDDEN });
          gsap.set(pen.current, { autoAlpha: 0, x: p1.x0, y: p1.y });
          gsap.set(trail1.current, {
            left: p1.x0,
            top: p1.y,
            width: Math.max(p1.x1 - p1.x0, 0),
            scaleX: 0,
            transformOrigin: "0% 50%",
            autoAlpha: 1,
          });
          gsap.set(trail2.current, {
            left: p2.x0,
            top: p2.y,
            width: Math.max(p2.x1 - p2.x0, 0),
            scaleX: 0,
            transformOrigin: "0% 50%",
            autoAlpha: 1,
          });
          gsap.set([...extLines, ...dsegs, ...arrows, ...leadPaths, under], {
            drawSVG: "0%",
          });
          gsap.set([dimText, ...ltexts], { autoAlpha: 0, y: 6 });
          gsap.set(ldots, { scale: 0, transformOrigin: "50% 50%" });
          gsap.set([redEl, redTxt].filter(Boolean), { autoAlpha: 0 });
          gsap.set(retWrap.current, { autoAlpha: 0 });
          gsap.set(retStrokes, { drawSVG: "0%" });
          gsap.set(retDash.current, { autoAlpha: 0 });
          gsap.set([retSpin.current, retSnap.current], { svgOrigin: "60 60" });
          gsap.set(sel.current, { autoAlpha: 0, scale: 0.99 });
          gsap.set([para.current, ctas.current], { autoAlpha: 0, y: 26 });
          /* cells are present from the start; the block CLIP-reveals them so
             the titleblock plots itself in rather than appearing as a static
             outline. starts clipped (invisible) + accent-bordered. */
          gsap.set(blockCells, { autoAlpha: 1, scale: 1, transformOrigin: "50% 50%" });
          gsap.set(block.current, {
            clipPath: "inset(0 0 100% 0)",
            borderColor: "rgba(204,255,61,.55)",
          });
          gsap.set(mobEls, { autoAlpha: 0, y: 8 });
          if (dgOn) {
            gsap.set([...dgBoxes, ...dgLeads, ...dgArrs], { drawSVG: "0%" });
            gsap.set(dgLabs, { autoAlpha: 0, y: 4 });
            gsap.set(dgIdx, { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" });
            if (dgFbG) gsap.set(dgFbG, { autoAlpha: 0 });
            if (dgHead) gsap.set(dgHead, { autoAlpha: 0 });
          }
          if (cutOn) {
            gsap.set(cutG, { opacity: 1 });
            gsap.set(cutStrokes, { drawSVG: "0%" });
            gsap.set(cutLabs, { autoAlpha: 0 });
          }
          if (naOn) {
            gsap.set(naStrokes, { drawSVG: "0%" });
            gsap.set(naFills, { scaleX: 0, transformOrigin: "0% 50%" });
            gsap.set(naTexts, { autoAlpha: 0 });
            if (naRot) gsap.set(naRot, { svgOrigin: "20 20", rotation: -32 });
          }
          if (hatchOn) gsap.set(hatchLines, { drawSVG: "0%" });

          const finish = () => {
            entranceDone = true;
            scramblePool =
              window.innerWidth < 768
                ? Array.from(rootEl.querySelectorAll(".hsx-mm"))
                : ([dimText, ...ltexts].filter(Boolean) as Element[]);
            const spin = gsap.to(retSpin.current, {
              rotation: "+=360",
              duration: 70,
              ease: "none",
              repeat: -1,
              svgOrigin: "60 60",
            });
            loops.push(spin);
            if (dgOn && dgFbPath)
              loops.push(
                gsap.to(dgFbPath, {
                  strokeDashoffset: -64,
                  duration: 18,
                  ease: "none",
                  repeat: -1,
                })
              );
            lifeId = window.setInterval(lifeTick, 10000);
            redId = window.setInterval(redTick, 9000);
            blkId = window.setInterval(blockTick, 10500);
            /* observers who arrived during the entrance plot in now */
            applyObs();
            if (fine) {
              pos.x = G.settleX;
              pos.y = G.settleY;
              lastMoveAt = performance.now();
              tracking = true;
            } else {
              /* touch: no crosshair; the drafter's lamp drifts on its own */
              gsap.to([chV.current, chH.current], {
                autoAlpha: 0,
                duration: 0.8,
                delay: 0.5,
              });
              gsap.fromTo(
                sel.current,
                { autoAlpha: 0 },
                {
                  autoAlpha: 1,
                  duration: 0.55,
                  ease: "power2.inOut",
                  yoyo: true,
                  repeat: 1,
                  repeatDelay: 1.1,
                  delay: 0.7,
                }
              );
              const amb = { x: G.settleX, y: G.settleY };
              loops.push(
                gsap.to(amb, {
                  x: sr.width * 0.72,
                  duration: 17,
                  ease: "sine.inOut",
                  yoyo: true,
                  repeat: -1,
                  onUpdate: () => setGlow(amb.x, amb.y),
                }),
                gsap.to(amb, {
                  y: sr.height * 0.55,
                  duration: 13,
                  ease: "sine.inOut",
                  yoyo: true,
                  repeat: -1,
                })
              );
            }
            if (!inView || document.hidden) setRunning();
          };

          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
          loops.push(tl);

          /* 1 — sheet + lamp + crosshair sweep lays construction lines */
          tl.to([gridEl.current, vigEl.current, glow.current], {
            autoAlpha: 1,
            duration: 0.9,
            ease: "power2.out",
          })
            .to(
              regEls,
              { autoAlpha: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
              0.15
            )
            .fromTo(
              chV.current,
              { x: sr.width + 60, autoAlpha: 1 },
              { x: G.settleX, duration: 1.15, ease: "hsxSweep" },
              0.05
            )
            .fromTo(
              chH.current,
              { y: sr.height + 60, autoAlpha: 1 },
              { y: G.settleY, duration: 1.15, ease: "hsxSweep" },
              0.18
            )

            /* 2 — plotter head races ahead of the wipe, trailing 1px of ink */
            .to(pen.current, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, 0.8)
            .to(l1.current, { clipPath: CLIP_SHOWN, duration: 0.85, ease: "hsxPlot" }, 0.9)
            .to(pen.current, { x: p1.x1, duration: 0.8, ease: "hsxPlot", onUpdate: tickText }, 0.9)
            .to(trail1.current, { scaleX: 1, duration: 0.8, ease: "hsxPlot" }, 0.9)
            /* pen-up hop to line 2 */
            .to(pen.current, { autoAlpha: 0.35, duration: 0.09 }, 1.76)
            .to(pen.current, { x: p2.x0, duration: 0.22, ease: "power1.inOut", onUpdate: tickText }, 1.78)
            .to(pen.current, { y: p1.y - 16, scale: 1.22, duration: 0.11, ease: "power2.out" }, 1.78)
            .to(pen.current, { y: p2.y, scale: 1, duration: 0.11, ease: "power2.in" }, 1.89)
            .to(pen.current, { autoAlpha: 1, duration: 0.09 }, 1.97)
            .to(l2.current, { clipPath: CLIP_SHOWN, duration: 0.95, ease: "hsxPlot" }, 2.0)
            .to(pen.current, { x: p2.x1, duration: 0.9, ease: "hsxPlot", onUpdate: tickText }, 2.0)
            .to(trail2.current, { scaleX: 1, duration: 0.9, ease: "hsxPlot" }, 2.0)
            .to(tkr.current, { autoAlpha: 0, duration: 0.15 }, 2.88)
            .to(under, { drawSVG: "100%", duration: 0.5, ease: "expo.out" }, 2.95)
            .to(pen.current, { scale: 1.9, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, 2.98)
            .to([trail1.current, trail2.current], { autoAlpha: 0, duration: 0.7, ease: "power2.out" }, 3.05)

            /* 3 — dimension lines + leader callouts annotate the block */
            .to(extLines, { drawSVG: "100%", duration: 0.3, stagger: 0.1, ease: "power2.inOut" }, 2.05)
            .to(dsegs, { drawSVG: "100%", duration: 0.4, stagger: 0.12, ease: "power2.inOut" }, 2.2)
            .to(arrows, { drawSVG: "100%", duration: 0.25, stagger: 0.1 }, 2.5)
            .to(dimText, { autoAlpha: 1, y: 0, duration: 0.45 }, 2.6)
            .to(leadPaths, { drawSVG: "100%", duration: 0.45, stagger: 0.14, ease: "power2.inOut" }, 2.45)
            .to(ldots, { scale: 1, duration: 0.35, ease: "back.out(2.5)", stagger: 0.14 }, 2.45)
            .to(ltexts, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.14 }, 2.7)
            .to(mobEls, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 2.7)

            /* 4 — reticle spins up */
            .to(retWrap.current, { autoAlpha: 0.95, duration: 0.5, ease: "power2.out" }, 2.5)
            .to(retStrokes, { drawSVG: "100%", duration: 0.7, stagger: 0.025, ease: "power2.inOut" }, 2.5)
            .to(retDash.current, { autoAlpha: 1, duration: 0.5 }, 2.9)
            .fromTo(retSpin.current, { rotation: -120 }, { rotation: 0, duration: 1.3, ease: "expo.out" }, 2.5)

            /* 5 — copy + CTAs rise */
            .to([para.current, ctas.current], { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.12 }, 2.9)

            /* 7 — final beat: the titleblock plots itself in — an accent border
               wipes down the sheet (clip reveal), then settles to white. */
            .fromTo(
              block.current,
              { clipPath: "inset(0 0 100% 0)" },
              { clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "power3.inOut" },
              3.0
            )
            .to(
              block.current,
              {
                borderColor: "rgba(255,255,255,.14)",
                duration: 0.55,
                ease: "power2.out",
                clearProps: "borderColor,clipPath",
              },
              3.75
            )
            .call(finish, [], 3.6);

          /* 6 — the page's own systems draft themselves (large viewports) */
          if (dgOn) {
            if (dgHead) tl.to(dgHead, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 2.7);
            tl.to(dgBoxes, { drawSVG: "100%", duration: 0.38, stagger: 0.07, ease: "power2.inOut" }, 2.7)
              .to(dgLeads, { drawSVG: "100%", duration: 0.32, stagger: 0.09, ease: "power2.inOut" }, 2.92)
              .to(dgArrs, { drawSVG: "100%", duration: 0.18, stagger: 0.06 }, 3.1)
              .to(dgLabs, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, 2.95)
              .to(dgIdx, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)", stagger: 0.06 }, 3.02);
            if (dgFbG) tl.to(dgFbG, { autoAlpha: 0.75, duration: 0.4, ease: "power2.out" }, 3.2);
          }

          /* 6b — drawing furniture drafts in alongside the annotations */
          if (cutOn) {
            tl.to(cutStrokes, { drawSVG: "100%", duration: 0.55, stagger: 0.08, ease: "power2.inOut" }, 2.25)
              .to(cutLabs, { autoAlpha: 1, duration: 0.3 }, 2.6)
              .to(cutG, { opacity: 0.15, duration: 0.6, ease: "power2.out" }, 3.15);
          }
          if (hatchOn)
            tl.to(hatchLines, { drawSVG: "100%", duration: 0.3, stagger: 0.05, ease: "power2.out" }, 2.45);
          if (naOn) {
            tl.to(naStrokes, { drawSVG: "100%", duration: 0.45, stagger: 0.06, ease: "power2.inOut" }, 2.7)
              .to(naFills, { scaleX: 1, duration: 0.35, stagger: 0.1, ease: "power2.out" }, 2.95)
              .to(naTexts, { autoAlpha: 0.9, duration: 0.4 }, 3.05);
            if (naRot)
              tl.to(naRot, { rotation: 0, duration: 0.9, ease: "elastic.out(1,0.4)" }, 2.85);
          }
        });
        setRunning();
      })
    );

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      loops.forEach((t) => t.kill());
      gsap.killTweensOf([
        retSnap.current,
        retMorph.current,
        chV.current,
        chH.current,
        chip.current,
        sel.current,
        snapH.current,
        dwgEl.current,
        dateEl.current,
        scaleEl.current,
        revEl.current,
        block.current,
        gridEl.current,
        glow.current,
        tkr.current,
        mbox.current,
        mchip.current,
        gsel.current,
        noteEl.current,
        obsEl.current,
        stdbyTag.current,
        dgChip.current,
        ...chars,
      ]);
      ctx.revert();
    };
  }, []);

  /* ── presence → imperative bridge (usePresence is the only data source) ── */
  useEffect(() => {
    const api = presenceApi.current;
    if (!api) return;
    /* the titleblock OBSERVERS cell is the site's single live-presence readout */
    obsCell.current?.classList.toggle("is-live", presence.connected);
    api.setObservers(
      presence.connected ? `/ ${String(presence.nodes).padStart(2, "0")}` : "/ --"
    );
    /* remote nodes plotted on the sheet (self excluded, capped per slot pool) */
    api.setRemote(presence.connected ? Math.max(0, presence.nodes - 1) : 0);
    const ev = presence.lastEvent;
    if (!presencePrimed.current) {
      /* don't replay an event that predates this mount */
      presencePrimed.current = true;
      lastEventAt.current = ev?.at ?? 0;
      return;
    }
    if (!ev || ev.at === lastEventAt.current) return;
    lastEventAt.current = ev.at;
    if (ev.kind === "join") api.joinPing();
    else if (ev.kind === "message") api.note(ev.name ?? "ANON", ev.text ?? "");
  }, [presence]);

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / INTRO"
      className="relative h-[100svh] min-h-[640px] overflow-hidden"
    >
      {/* blueprint sheet: minor/major grid + drafter's lamp + vignette */}
      <div ref={gridEl} aria-hidden="true" className="hsx-grid" />
      <div ref={glow} aria-hidden="true" className="hsx-glow pointer-events-none absolute left-0 top-0 z-[1]" />
      <div
        ref={vigEl}
        aria-hidden="true"
        className="hsx-vig pointer-events-none absolute inset-0 z-[1]"
      />

      {/* corner registration marks */}
      <div ref={regs} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
        <span className="hsx-reg left-[14px] top-[14px]" />
        <span className="hsx-reg right-[14px] top-[14px]" />
        <span className="hsx-reg bottom-[14px] left-[14px]" />
        <span className="hsx-reg bottom-[14px] right-[14px]" />
      </div>

      {/* dimension lines, arrowheads + live-measured callouts (values injected by layout()) */}
      <svg
        ref={dims}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full overflow-visible font-mono"
      >
        <line className="hsx-ext" x1="0" y1="-50" x2="0" y2="-50" />
        <line className="hsx-ext" x1="0" y1="-50" x2="0" y2="-50" />
        <line className="hsx-dseg" x1="0" y1="-50" x2="0" y2="-50" />
        <line className="hsx-dseg" x1="0" y1="-50" x2="0" y2="-50" />
        <path className="hsx-arrow" d="M0 -50" />
        <path className="hsx-arrow" d="M0 -50" />
        <text
          className="hsx-meas hsx-dimtext"
          x="-60"
          y="-50"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          W
        </text>
        <line className="hsx-under" x1="0" y1="-50" x2="0" y2="-50" />
        {/* section cut-line A—A through the name's midline (fades to 15%) */}
        <g className="hsx-cutg">
          <line className="hsx-cut" x1="0" y1="-50" x2="0" y2="-50" />
          <path className="hsx-cutflag" d="M0 -50" />
          <path className="hsx-cutflag" d="M0 -50" />
          <text className="hsx-cutlab" x="-60" y="-50" textAnchor="middle">
            A
          </text>
          <text className="hsx-cutlab" x="-60" y="-50" textAnchor="middle">
            A
          </text>
        </g>
        <g className="hsx-leads">
          {LEADS.map((m) => (
            <g key={m}>
              <circle className="hsx-ldot" cx="-60" cy="-50" r="2.5" />
              <path className="hsx-lead" d="M0 -50" />
              <text className="hsx-meas hsx-ltext" x="-60" y="-50" textAnchor="end">
                {m}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* corner cross-hatch patch — hatches in stroke by stroke (md+) */}
      <div
        ref={hatchWrap}
        aria-hidden="true"
        className="pointer-events-none absolute right-[40px] top-[14px] z-[2] max-md:hidden"
      >
        <svg viewBox="0 0 56 56" className="h-[56px] w-[56px] overflow-visible">
          <path className="hsx-hat hsx-hat--edge" d="M0 0 L56 56" />
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              className="hsx-hat"
              d={`M${(i + 1) * 8} 0 L56 ${56 - (i + 1) * 8}`}
            />
          ))}
        </svg>
      </div>

      {/* rotating drafting reticle */}
      <div
        ref={retWrap}
        aria-hidden="true"
        className="absolute right-4 top-20 z-[4] w-16 md:right-[26px] md:top-[5.2rem] md:w-[116px]"
      >
        <svg viewBox="0 0 120 120" className="h-auto w-full">
          <g ref={retSpin}>
            <circle className="hsx-rst" cx="60" cy="60" r="47" />
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={i}
                className="hsx-rst"
                x1="60"
                y1="13"
                x2="60"
                y2={i % 3 === 0 ? 21 : 17}
                transform={`rotate(${i * 30} 60 60)`}
              />
            ))}
          </g>
          <g ref={retSnap}>
            <circle ref={retDash} className="hsx-rst hsx-rdash" cx="60" cy="60" r="29" />
            <path ref={retMorph} className="hsx-rst" d={RET_SQUARE} />
            <path className="hsx-rst" d="M60 36 L60 46 M60 74 L60 84 M36 60 L46 60 M74 60 L84 60" />
            <circle className="hsx-rdot" cx="60" cy="60" r="1.6" />
          </g>
        </svg>
      </div>

      {/* ── foreground content ── */}
      <div className="relative z-10 flex h-full flex-col pad-x pb-10 pt-24 max-md:justify-end md:pb-12 md:pt-28">
        <div ref={nameWrap} className="relative w-fit max-md:mt-auto md:my-auto">
          {/* CAD selection rect + handles (hover / touch pulse) */}
          <div
            ref={sel}
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3 z-[3] md:-inset-5"
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
              <rect ref={selRect} x="0.5" y="0.5" width="100%" height="100%" className="hsx-selrect" />
            </svg>
            <span className="hsx-hd -left-[3px] -top-[3px]" />
            <span className="hsx-hd -top-[3px] left-1/2 -ml-[3px]" />
            <span className="hsx-hd -right-[3px] -top-[3px]" />
            <span className="hsx-hd -left-[3px] top-1/2 -mt-[3px]" />
            <span className="hsx-hd -right-[3px] top-1/2 -mt-[3px]" />
            <span className="hsx-hd -bottom-[3px] -left-[3px]" />
            <span className="hsx-hd -bottom-[3px] left-1/2 -ml-[3px]" />
            <span className="hsx-hd -bottom-[3px] -right-[3px]" />
            <span className="absolute -top-5 left-0 font-mono text-[.5rem] tracking-[.2em] text-faint">
              NAME_BLOCK · 2 ENT
            </span>
          </div>

          <h1
            aria-label="Uday Pratap Singh Parihar"
            className="relative font-display font-bold leading-[.92] tracking-[-.04em] text-[2.8rem] md:text-[clamp(3rem,11.5vw,11rem)]"
          >
            <span ref={l1} className="block">
              UDAY PRATAP
            </span>
            <span ref={l2} className="text-stroke block">
              SINGH PARIHAR
            </span>
          </h1>

          {/* plotter ink trails (1px, fade behind the head) */}
          <div ref={trail1} aria-hidden="true" className="hsx-trail" />
          <div ref={trail2} aria-hidden="true" className="hsx-trail" />

          {/* plotter head + live coordinate ticker */}
          <div ref={pen} aria-hidden="true" className="hsx-pen">
            <span ref={tkr} className="hsx-tick font-mono max-md:hidden">
              PLT 0000.0,0000.0
            </span>
          </div>
        </div>

        {/* mobile measurement strip (leader callouts collapse into this; values measured live) */}
        <div
          ref={mob}
          className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] tracking-[.16em] text-accent md:hidden"
        >
          {MOBILE_DIMS.map((m, i) => (
            <Fragment key={m}>
              {i > 0 && (
                <span aria-hidden="true" className="text-faint">
                  /
                </span>
              )}
              <span className="hsx-mm">{m}</span>
            </Fragment>
          ))}
        </div>

        <p
          ref={para}
          className="mt-6 max-w-[44ch] text-[.9rem] leading-[1.6] text-muted md:mt-7 md:text-[clamp(.9rem,1.25vw,1.02rem)]"
        >
          {COPY}
        </p>

        <div ref={ctas} className="mt-8 flex gap-4 max-md:flex-col md:mt-9 md:items-center">
          <a
            href="#projects"
            data-cursor="hover"
            className="hsx-cta hsx-cta--fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-7 py-4 font-mono text-[.66rem] uppercase tracking-[.24em] text-text max-md:w-full"
          >
            <span aria-hidden="true" className="hsx-cta-bg absolute inset-0 bg-accent" />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
              View case files
            </span>
          </a>
          <a
            href="#contact"
            data-cursor="hover"
            className="hsx-cta inline-flex items-center justify-center border border-line px-7 py-4 font-mono text-[.66rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
          >
            Transmit
          </a>
        </div>

        {/* system block diagram — THIS PAGE's own modules as a schematic */}
        <div
          ref={diagWrap}
          aria-hidden="true"
          className="hsx-diag pointer-events-none absolute right-0 z-[4] w-[216px]"
        >
          <div className="hsx-dg-head font-mono text-[.5rem] uppercase tracking-[.22em] text-faint">
            SYS // SHEET MODULES
          </div>
          <svg ref={diag} viewBox="0 0 216 140" className="mt-2 h-auto w-full overflow-visible font-mono">
            {/* leader lines (under the boxes) — accent run feeds LINK (presence) */}
            <path className="hsx-dg-lead" d="M66 21 L81 21 L81 64 L90 64" />
            <path className="hsx-dg-lead" d="M66 119 L81 119 L81 76 L90 76" />
            <path className="hsx-dg-lead hsx-dg-lead--acc" d="M146 70 L168 70" />
            <path className="hsx-dg-arr" d="M84 61.5 L90 64 L84 66.5" />
            <path className="hsx-dg-arr" d="M84 73.5 L90 76 L84 78.5" />
            <path className="hsx-dg-arr hsx-dg-arr--acc" d="M162 67.5 L168 70 L162 72.5" />
            {/* dashed feedback loop: LINK events redraw the sheet */}
            <g className="hsx-dg-fbg">
              <path className="hsx-dg-fb" d="M188 57 L188 44 L37 44 L37 34" />
              <path className="hsx-dg-fbarr" d="M34.5 40 L37 34 L39.5 40" />
            </g>
            {/* module boxes */}
            <rect className="hsx-dg-box" x="8" y="8" width="58" height="26" />
            <rect className="hsx-dg-box" x="8" y="106" width="58" height="26" />
            <rect className="hsx-dg-box" x="90" y="57" width="56" height="26" />
            <rect className="hsx-dg-box" x="168" y="57" width="40" height="26" />
            {/* labels — the page's own systems */}
            <text className="hsx-dg-lab" x="37" y="21">
              GRID
            </text>
            <text className="hsx-dg-lab" x="37" y="119">
              PLOTTER
            </text>
            <text className="hsx-dg-lab" x="118" y="70">
              CROSSHAIR
            </text>
            <text className="hsx-dg-lab" x="188" y="70">
              LINK
            </text>
            {/* index stamps */}
            <text className="hsx-dg-idx" x="8" y="5">
              M1
            </text>
            <text className="hsx-dg-idx" x="8" y="103">
              M2
            </text>
            <text className="hsx-dg-idx" x="90" y="54">
              M3
            </text>
            <text className="hsx-dg-idx" x="168" y="54">
              M4
            </text>
          </svg>
          {/* hover status chip — "M3 · CROSSHAIR · ACTIVE" */}
          <div
            ref={dgChip}
            className="absolute -top-[20px] right-0 whitespace-nowrap border border-white/10 bg-bg/85 px-1.5 py-0.5 font-mono text-[.5rem] tracking-[.16em] text-accent"
          />
        </div>

        {/* drawing titleblock — roles ride in the TITLE field */}
        <div
          ref={block}
          className="hsx-block relative z-30 font-mono max-md:mt-7 md:absolute md:bottom-6 md:right-0"
        >
          <div className="hsx-cell hsx-cell--title">
            <span className="hsx-lab">Title</span>
            <span className="hsx-val hsx-val--title">{ROLES}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="hsx-cell">
              <span className="hsx-lab">Drawn by</span>
              <span className="hsx-val">UdayPS</span>
            </div>
            <div className="hsx-cell">
              <span className="hsx-lab">Scale</span>
              <span className="hsx-val" ref={scaleEl}>
                1:1
              </span>
            </div>
            <div className="hsx-cell">
              <span className="hsx-lab">Rev</span>
              <span className="hsx-val" ref={revEl}>
                2.0
              </span>
            </div>
            <div className="hsx-cell">
              <span className="hsx-lab">Date</span>
              <span className="hsx-val" ref={dateEl}>
                ----.--.--
              </span>
            </div>
          </div>
          <div className="hsx-cell hsx-foot flex items-end justify-between gap-4">
            <div>
              <span className="hsx-lab">Dwg No</span>
              <span ref={dwgEl} className="hsx-val">
                {DWG_NO}
              </span>
            </div>
            {/* live presence cell — the site's single live readout (node count
                via @/lib/mythic/presence). `is-live` toggled by the bridge effect. */}
            <div ref={obsCell} className="hsx-obs">
              <span className="hsx-lab">Observers · live</span>
              <span className="hsx-obs-row">
                <span aria-hidden="true" className="hsx-obs-dot" />
                <span ref={obsEl} className="hsx-val hsx-obs-val">
                  / --
                </span>
              </span>
            </div>
            <span aria-hidden="true" className="hsx-bars">
              {BARS.map((w, i) => (
                <i key={i} style={{ width: w }} />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* north arrow + 1:1 scale bar — drafts itself bottom-left (md+) */}
      <div
        ref={naWrap}
        aria-hidden="true"
        className="hsx-na pointer-events-none absolute left-[var(--pad)] z-[4]"
      >
        <svg viewBox="0 0 150 46" className="h-auto w-[150px] overflow-visible font-mono">
          <circle className="hsx-nast" cx="20" cy="20" r="13" />
          <g className="hsx-na-rot">
            <path className="hsx-nast" d="M20 31 L20 9" />
            <path className="hsx-nast" d="M16 15 L20 7 L24 15" />
          </g>
          <text className="hsx-nat" x="20" y="43" textAnchor="middle">
            N
          </text>
          <rect className="hsx-nast" x="52.5" y="16.5" width="80" height="6" />
          <rect className="hsx-nafill" x="72.5" y="16.5" width="20" height="6" />
          <rect className="hsx-nafill" x="112.5" y="16.5" width="20" height="6" />
          <text className="hsx-nat" x="52" y="34">
            0
          </text>
          <text className="hsx-nat" x="92" y="34" textAnchor="middle">
            40
          </text>
          <text className="hsx-nat" x="133" y="34" textAnchor="end">
            80 PX
          </text>
        </svg>
      </div>

      {/* marginal presence note — "rx <name>: <text>" (desktop only) */}
      <div
        ref={noteEl}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-7 left-[var(--pad)] z-[5] max-w-[46ch] truncate font-mono text-[.55rem] tracking-[.14em] text-faint max-md:hidden"
      />

      {/* interaction overlay: registration crosses + reviewer redline (z above content) */}
      <svg
        ref={oly}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible font-mono"
      >
        {[0, 1, 2].map((i) => (
          <g key={i} className="hsx-cross">
            <line className="hsx-cr" x1="-30" y1="-30" x2="-30" y2="-30" />
            <line className="hsx-cr" x1="-30" y1="-30" x2="-30" y2="-30" />
            <circle className="hsx-cr" cx="-30" cy="-30" r="4.5" />
            <text className="hsx-crt" x="-30" y="-30">
              0,0
            </text>
          </g>
        ))}
        {/* plotted observers — one surveyor's cross per live remote node */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={`obs${i}`} className="hsx-obsx">
            <line className="hsx-ox" x1="-30" y1="-30" x2="-30" y2="-30" />
            <line className="hsx-ox" x1="-30" y1="-30" x2="-30" y2="-30" />
            <text className="hsx-oxt" x="-30" y="-30">
              OBS-0{i + 1}
            </text>
          </g>
        ))}
        {/* reviewer redline: dashed ellipse revealed by a DrawSVG'd mask */}
        <mask id="hsx-redline-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <ellipse className="hsx-redmaskel" cx="-100" cy="-100" rx="40" ry="16" />
        </mask>
        <ellipse
          className="hsx-redel"
          cx="-100"
          cy="-100"
          rx="40"
          ry="16"
          mask="url(#hsx-redline-m)"
        />
        <text className="hsx-rev" x="-100" y="-100">
          rev?
        </text>
      </svg>

      {/* drag-to-measure rect + readout chip */}
      <div
        ref={mbox}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[15] border border-dashed border-white/30"
      />
      <div
        ref={mchip}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[15] whitespace-nowrap border border-white/10 bg-bg/85 px-2 py-1 font-mono text-[.55rem] tracking-[.14em] text-accent"
      />

      {/* glyph-level selection bbox + micro dimension */}
      <div ref={gsel} aria-hidden="true" className="hsx-gsel pointer-events-none absolute left-0 top-0 z-[15]">
        <span className="hsx-ghd -left-[3px] -top-[3px]" />
        <span className="hsx-ghd -right-[3px] -top-[3px]" />
        <span className="hsx-ghd -bottom-[3px] -left-[3px]" />
        <span className="hsx-ghd -bottom-[3px] -right-[3px]" />
        <span ref={gdim} className="hsx-gdim">
          W · PX
        </span>
      </div>

      {/* drafting crosshair + coordinate chip + snap handle (above content) */}
      <div
        ref={chV}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 h-full w-px bg-white/15"
      />
      <div
        ref={chH}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 h-px w-full bg-white/15"
      />
      <div
        ref={chip}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 border border-white/10 bg-bg/85 px-2 py-1 font-mono text-[.55rem] tracking-[.14em] text-muted"
      >
        X 0000.0 · Y 0000.0
      </div>
      <div
        ref={snapH}
        aria-hidden="true"
        className="hsx-snap pointer-events-none absolute left-0 top-0 z-20"
      />
      {/* crosshair standby tag (idle >4s parks the crosshair) */}
      <div
        ref={stdbyTag}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 font-mono text-[.5rem] tracking-[.22em] text-faint"
      >
        STDBY
      </div>

      <style>{`
        /* the drafting crosshair IS the cursor inside the hero — park the
           site's global ring cursor while the pointer is over this section */
        body:has(#hero:hover) .cursor,
        body:has(#hero:hover) .cursor-dot { opacity: 0 !important; }

        .hsx-grid {
          position: absolute;
          inset: -60px;
          z-index: 0;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,.026) 0 1px, transparent 1px 8px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.026) 0 1px, transparent 1px 8px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 80px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 80px);
          will-change: transform;
        }
        .hsx-glow {
          width: 340px;
          height: 340px;
          margin: -170px 0 0 -170px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,.055), transparent 70%);
          mix-blend-mode: screen;
          will-change: transform;
        }
        .hsx-vig {
          background: radial-gradient(120% 95% at 32% 42%, transparent 42%, rgba(7,7,9,.62) 100%);
        }
        .hsx-reg { position: absolute; width: 16px; height: 16px; }
        .hsx-reg::before, .hsx-reg::after {
          content: "";
          position: absolute;
          background: rgba(255,255,255,.22);
        }
        .hsx-reg::before { left: 50%; top: 0; width: 1px; height: 100%; }
        .hsx-reg::after { top: 50%; left: 0; height: 1px; width: 100%; }

        .hsx-ext, .hsx-dseg, .hsx-lead {
          stroke: rgba(255,255,255,.30);
          stroke-width: 1;
          fill: none;
        }
        .hsx-arrow { stroke: rgba(255,255,255,.45); stroke-width: 1; fill: none; }
        .hsx-ldot { fill: #ccff3d; }
        .hsx-under { stroke: #ccff3d; stroke-width: 2; opacity: .85; }
        .hsx-meas {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .12em;
          fill: #ccff3d;
        }

        .hsx-redmaskel { stroke: #fff; stroke-width: 8; fill: none; }
        .hsx-redel {
          stroke: #ff5c7c;
          stroke-width: 1.2;
          stroke-dasharray: 7 5;
          fill: none;
        }
        .hsx-rev { font-size: 9px; letter-spacing: .14em; fill: #ff5c7c; }

        .hsx-cr { stroke: rgba(255,255,255,.5); stroke-width: 1; fill: none; }
        .hsx-crt { font-size: 8px; letter-spacing: .12em; fill: rgba(255,255,255,.45); }

        .hsx-ox { stroke: rgba(255,255,255,.45); stroke-width: 1; fill: none; }
        .hsx-oxt { font-size: 7.5px; letter-spacing: .14em; fill: rgba(255,255,255,.4); }

        .hsx-cutg { opacity: .15; }
        .hsx-cut {
          stroke: rgba(255,255,255,.7);
          stroke-width: 1;
          stroke-dasharray: 14 5 2 5;
          fill: none;
        }
        .hsx-cutflag { stroke: rgba(255,255,255,.7); stroke-width: 1.4; fill: none; }
        .hsx-cutlab { font-size: 9px; letter-spacing: .12em; fill: rgba(255,255,255,.75); }

        .hsx-hat { stroke: rgba(255,255,255,.08); stroke-width: 1; fill: none; }
        .hsx-hat--edge { stroke: rgba(255,255,255,.12); }

        /* north arrow + scale bar removed per request — kept display:none on all
           viewports so the drafting entrance simply skips it (naOn === false) */
        .hsx-na { display: none; bottom: 4.6rem; }
        .hsx-nast { stroke: rgba(255,255,255,.3); stroke-width: 1; fill: none; }
        .hsx-nafill { fill: rgba(255,255,255,.28); stroke: none; }
        .hsx-nat { font-size: 7.5px; letter-spacing: .14em; fill: #54545c; }

        .hsx-rst { stroke: rgba(255,255,255,.25); stroke-width: 1; fill: none; vector-effect: non-scaling-stroke; }
        .hsx-rdash { stroke-dasharray: 2.5 5; opacity: .8; }
        .hsx-rdot { fill: rgba(255,255,255,.6); }

        /* sits clear ABOVE the titleblock (bottom-6 + ~150px) so the PLOTTER
           module isn't hidden behind it */
        .hsx-diag { display: none; bottom: 12.5rem; }
        @media (min-width: 1024px) and (min-height: 760px) {
          .hsx-diag { display: block; }
        }
        .hsx-dg-box { stroke: rgba(255,255,255,.2); stroke-width: 1; fill: rgba(7,7,9,.55); pointer-events: all; }
        .hsx-dg-lead { stroke: rgba(255,255,255,.2); stroke-width: 1; fill: none; }
        .hsx-dg-lead--acc { stroke: rgba(204,255,61,.55); }
        .hsx-dg-arr { stroke: rgba(255,255,255,.35); stroke-width: 1; fill: none; }
        .hsx-dg-arr--acc { stroke: rgba(204,255,61,.7); }
        .hsx-dg-fb, .hsx-dg-fbarr { stroke: rgba(255,255,255,.22); stroke-width: 1; fill: none; }
        .hsx-dg-fb { stroke-dasharray: 4 4; }
        /* module hover (desktop): hovered border + connections tint accent,
           the rest dim — driven by class toggles, eased here */
        .hsx-dg-box, .hsx-dg-lead, .hsx-dg-arr, .hsx-dg-fb, .hsx-dg-fbarr {
          transition: stroke .25s, opacity .25s;
        }
        .hsx-dg-on { stroke: #ccff3d !important; }
        .hsx-dg-dim { opacity: .35; }
        .hsx-dg-lab {
          font-size: 8px;
          letter-spacing: .08em;
          fill: #54545c;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .hsx-dg-idx { font-size: 6px; letter-spacing: .12em; fill: rgba(255,255,255,.32); }

        .hsx-pen {
          position: absolute;
          left: -9px;
          top: -9px;
          width: 18px;
          height: 18px;
          z-index: 4;
          pointer-events: none;
        }
        .hsx-pen::before {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid rgba(204,255,61,.7);
          border-radius: 50%;
        }
        .hsx-pen::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          margin: -2.5px 0 0 -2.5px;
          background: #ccff3d;
          border-radius: 50%;
          box-shadow: 0 0 14px 2px rgba(204,255,61,.8);
        }
        .hsx-tick {
          position: absolute;
          left: 24px;
          top: 1px;
          font-size: .5rem;
          letter-spacing: .12em;
          color: rgba(204,255,61,.7);
          white-space: nowrap;
        }
        .hsx-trail {
          position: absolute;
          left: 0;
          top: 0;
          height: 1px;
          z-index: 2;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(204,255,61,0), rgba(204,255,61,.5));
        }

        .hsx-selrect {
          fill: none;
          stroke: rgba(255,255,255,.45);
          stroke-width: 1;
          stroke-dasharray: 6 5;
        }
        .hsx-hd {
          position: absolute;
          width: 7px;
          height: 7px;
          background: #070709;
          border: 1px solid rgba(255,255,255,.6);
        }
        .hsx-snap {
          width: 9px;
          height: 9px;
          margin: -4.5px 0 0 -4.5px;
          border: 1px solid rgba(255,255,255,.85);
          background: #070709;
        }

        .hsx-gsel { border: 1px dashed rgba(255,255,255,.55); }
        .hsx-ghd {
          position: absolute;
          width: 5px;
          height: 5px;
          background: #070709;
          border: 1px solid rgba(255,255,255,.7);
        }
        .hsx-gdim {
          position: absolute;
          left: -1px;
          top: -16px;
          font-size: .5rem;
          letter-spacing: .14em;
          color: #ccff3d;
          white-space: nowrap;
        }
        .hsx-measuring, .hsx-measuring * {
          user-select: none;
          -webkit-user-select: none;
        }

        .hsx-block {
          border: 1px solid rgba(255,255,255,.14);
          /* near-opaque so the drafting crosshair + coord chip (z-20) that pass
             beneath it can't bleed through and obscure the titleblock text */
          background: rgba(7,7,9,.96);
          backdrop-filter: blur(2px);
        }
        .hsx-cell { padding: .5rem .7rem; }
        .hsx-block .grid .hsx-cell { border-top: 1px solid rgba(255,255,255,.12); }
        .hsx-block .grid .hsx-cell + .hsx-cell { border-left: 1px solid rgba(255,255,255,.12); }
        .hsx-foot { border-top: 1px solid rgba(255,255,255,.12); }
        @media (max-width: 767px) {
          .hsx-block .grid .hsx-cell:nth-child(3) { border-left: 0; }
        }
        .hsx-lab {
          display: block;
          font-size: .5rem;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #54545c;
          margin-bottom: .3rem;
        }
        .hsx-val {
          display: block;
          font-size: .58rem;
          letter-spacing: .14em;
          color: #ededf0;
          white-space: nowrap;
        }
        .hsx-val--title { white-space: normal; color: #8a8a93; }
        @media (min-width: 768px) {
          .hsx-val--title { white-space: nowrap; }
        }
        .hsx-obs { border-left: 1px solid rgba(255,255,255,.12); padding-left: .8rem; }
        .hsx-obs-row { display: flex; align-items: center; gap: .42rem; }
        .hsx-obs-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #54545c; flex: none; box-shadow: 0 0 0 0 rgba(204,255,61,0);
        }
        .hsx-obs.is-live .hsx-obs-dot {
          background: #ccff3d;
          animation: hsx-obs-pulse 2s cubic-bezier(.22,1,.36,1) infinite;
        }
        .hsx-obs.is-live .hsx-obs-val { color: #ccff3d; }
        @keyframes hsx-obs-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(204,255,61,.55); }
          70%  { box-shadow: 0 0 0 6px rgba(204,255,61,0); }
          100% { box-shadow: 0 0 0 0 rgba(204,255,61,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hsx-obs.is-live .hsx-obs-dot { animation: none; }
        }
        .hsx-bars { display: flex; align-items: flex-end; gap: 2px; }
        .hsx-bars i { display: block; height: 12px; background: rgba(255,255,255,.30); }

        .hsx-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .hsx-cta--fill:hover .hsx-cta-bg,
        .hsx-cta--fill:focus-visible .hsx-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        .hsx-cta:focus-visible {
          outline: 1px solid #ccff3d;
          outline-offset: 3px;
        }
      `}</style>
    </section>
  );
}
