"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";
import { magnetize } from "@/lib/mythic/magnetic";

/**
 * HeroFluid — 00 / SIGNAL. "DARK FLUID".
 *
 * A luxury-grade liquid: fullscreen GLSL quad running domain-warped simplex
 * fbm — slow-rolling ink, near-black, with thin iridescent crest lines that
 * pick up the acid/violet accents only on noise ridges. The killer trick:
 * pointer velocity is splatted into a 64×64 DataTexture (JS ping, GPU pong)
 * that ADVECTS the fluid — the surface visibly swirls where the cursor has
 * been, trails dissipating over ~3s. The name itself lives INSIDE the shader:
 * it is drawn to a canvas texture and sampled with UVs offset by the fluid
 * gradient, so the letterforms shimmer and bend like type viewed through
 * dark water, with chromatic fringing near fresh trails and a specular sheen
 * sweeping the glyphs every ~9s. On boot the distortion eases from molten
 * chaos to calm legibility — the name condenses out of the liquid.
 *
 * Touch devices get an automatic slow stirring path. Reduced motion or a
 * missing WebGL context falls back to DOM type over a static gradient.
 */

const ROLES = ["Full-Stack", "RPA & Automation", "Reverse Engineering"];
const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";
const LINE_1 = "UDAY PRATAP";
const LINE_2 = "SINGH PARIHAR";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ───────────────────────── GLSL ───────────────────────── */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2 vUv;

uniform float uTime;    // simulation time (slows as the fluid calms)
uniform float uSweep;   // 0..1 phase of the ~9s specular sweep
uniform vec2  uRes;     // drawing-buffer resolution
uniform float uChaos;   // 1 at boot -> 0 at rest (dips slightly below 0 once)
uniform float uReveal;  // 0 -> 1 fade from black
uniform sampler2D uTrail; // rg = pointer velocity (encoded), b = intensity
uniform sampler2D uText;  // the name, screen-aligned

// ── simplex noise 3D (Ashima / Stefan Gustavson, MIT) ──
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += a * snoise(p);
    p = vec3(p.xy * 2.04, p.z * 1.18) + vec3(7.3, 1.9, 0.0);
    a *= 0.52;
  }
  return v;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.4;

  // ── trail buffer: pointer history advects the fluid ──
  vec4 tr = texture2D(uTrail, uv);
  vec2 tvel = (tr.rg - 0.5) * 2.0;
  float tint = tr.b;

  float t = uTime;

  // stirred sampling position (the swirl)
  vec2 sp = p - tvel * tint * 1.1;

  // cheap domain warp; boot chaos and stirring deepen it
  float n1 = snoise(vec3(sp * 0.75, t * 0.45));
  float n2 = snoise(vec3(sp * 0.75 + 19.7, t * 0.5 + 4.2));
  float warpAmt = 0.6 + uChaos * 1.6 + tint * 0.9;
  vec2 wp = sp + vec2(n1, n2) * warpAmt;

  float h = fbm(vec3(wp * 0.85, t * 0.32 + tint * 0.8));

  // surface gradient via screen-space derivatives (normalized vs resolution)
  vec2 grad = vec2(dFdx(h), dFdy(h)) * uRes.y * 0.42;
  grad = clamp(grad, -3.0, 3.0);
  vec3 nrm = normalize(vec3(-grad * 0.6, 1.0));

  // ── ink body: near-black, oily ──
  float body = smoothstep(-0.85, 0.95, h);
  vec3 col = mix(vec3(0.016, 0.016, 0.028), vec3(0.075, 0.078, 0.118), body);

  // thin iridescent crest lines — violet -> acid along a second noise field,
  // mostly invisible at rest, blooming where the fluid has been stirred
  float crest = pow(clamp(1.0 - abs(h - 0.08) * 7.5, 0.0, 1.0), 6.0);
  vec3 irid = mix(vec3(0.486, 0.361, 1.0), vec3(0.80, 1.0, 0.24),
                  smoothstep(-0.5, 0.6, n2));
  col += irid * crest * (0.085 + tint * 0.5 + uChaos * 0.1);

  // broad oily specular
  vec3 L = normalize(vec3(-0.5, 0.62, 0.62));
  float spec = pow(max(dot(nrm, L), 0.0), 26.0);
  col += vec3(0.50, 0.55, 0.72) * spec * 0.06;

  // stirred regions lift faintly violet
  col += vec3(0.10, 0.08, 0.16) * tint * 0.55;

  // ── the name, refracted through the surface ──
  float refr = 0.0045 + max(uChaos, 0.0) * 0.055 + tint * 0.038;
  vec2 ro = grad * refr + tvel * tint * 0.025;
  float ab = (0.25 + tint * 0.9) * 0.35;
  float aR = texture2D(uText, uv + ro * (1.0 + ab)).a;
  float aG = texture2D(uText, uv + ro).a;
  float aB = texture2D(uText, uv + ro * (1.0 - ab)).a;

  // specular sheen sweeping the letters every ~9s
  float band = uv.x * 0.85 + (1.0 - uv.y) * 0.42;
  float bx = (band - mix(-0.6, 1.6, uSweep)) * 6.5;
  float sheen = exp(-bx * bx);
  sheen *= 0.5 + 0.5 * max(dot(nrm, normalize(vec3(0.3, 0.45, 0.85))), 0.0);

  vec3 inkTxt = vec3(0.929, 0.929, 0.941) * (0.94 + sheen * 1.1);
  inkTxt += vec3(0.80, 1.0, 0.24) * sheen * 0.18; // acid kiss inside the sheen
  vec3 ta = vec3(aR, aG, aB) * (0.84 + 0.16 * body); // letters sit IN the liquid
  col = col * (1.0 - ta) + inkTxt * ta;

  // vignette + reveal + dither (kills banding in the dark gradients)
  float vig = smoothstep(1.35, 0.42, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= 0.6 + 0.4 * vig;
  col *= uReveal;
  col += (hash12(uv * uRes + uTime) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ──────────────────────── component ──────────────────────── */

export default function HeroFluid() {
  const root = useRef<HTMLElement>(null);
  const glWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const rolesRow = useRef<HTMLDivElement>(null);
  const nameBlock = useRef<HTMLDivElement>(null);
  const line1 = useRef<HTMLSpanElement>(null);
  const line2 = useRef<HTMLSpanElement>(null);
  const meniscus = useRef<HTMLDivElement>(null);
  const para = useRef<HTMLParagraphElement>(null);
  const ctaRow = useRef<HTMLDivElement>(null);
  const annot = useRef<HTMLDivElement>(null);
  const viscEl = useRef<HTMLSpanElement>(null);
  const flowEl = useRef<HTMLSpanElement>(null);
  const reEl = useRef<HTMLSpanElement>(null);

  const [mode, setMode] = useState<"gl" | "flat">("gl");

  useIsoLayoutEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {}, rootEl);

    /* magnetic CTAs — lib no-ops on touch + reduced motion */
    rootEl
      .querySelectorAll<HTMLElement>(".hf-cta")
      .forEach((el) => cleanups.push(magnetize(el, 0.3)));

    /* ───────────── flat fallback: reduced motion / no WebGL ───────────── */
    if (mode === "flat") {
      cleanups.push(
        onBooted(() => {
          ctx.add(() => {
            gsap.fromTo(
              [content.current, annot.current],
              { opacity: 0 },
              { opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.12 }
            );
          });
        })
      );
      return () => {
        cleanups.forEach((fn) => fn());
        ctx.revert();
      };
    }

    if (prefersReduced()) {
      setMode("flat");
      return () => {
        cleanups.forEach((fn) => fn());
        ctx.revert();
      };
    }

    const wrap = glWrap.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    /* ───────────── WebGL setup (the page's only context) ───────────── */
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setMode("flat");
      return () => {
        cleanups.forEach((fn) => fn());
        ctx.revert();
      };
    }

    gsap.registerPlugin(CustomEase);
    // condensation ease: fast settle with a single ~6% rebound — the surface
    // "rings" once as the name snaps crisp, then relaxes
    CustomEase.create(
      "hfSettle",
      "M0,0 C0.104,0.604 0.22,1.06 0.45,1.065 0.636,1.069 0.818,1.001 1,1"
    );

    const isMobile = window.innerWidth < 768;
    const isTouch = window.matchMedia("(hover: none)").matches;
    const glDpr =
      Math.min(window.devicePixelRatio || 1, 1.75) * (isMobile ? 0.65 : 1);
    renderer.setPixelRatio(glDpr);
    renderer.setClearColor(0x070709, 1);

    /* ── trail buffer: 64×64 velocity/intensity splats, JS-decayed ── */
    const TS = 64;
    const fbuf = new Float32Array(TS * TS * 3); // vx, vy, intensity
    const tdata = new Uint8Array(TS * TS * 4);
    for (let i = 0; i < TS * TS; i++) {
      tdata[i * 4] = 128;
      tdata[i * 4 + 1] = 128;
      tdata[i * 4 + 2] = 0;
      tdata[i * 4 + 3] = 255;
    }
    const trailTex = new THREE.DataTexture(tdata, TS, TS, THREE.RGBAFormat);
    trailTex.magFilter = THREE.LinearFilter;
    trailTex.minFilter = THREE.LinearFilter;
    trailTex.needsUpdate = true;

    /* ── text texture: the name, drawn at the DOM h-block's exact rects ── */
    const textCanvas = document.createElement("canvas");
    const textCtx = textCanvas.getContext("2d");
    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.generateMipmaps = false;
    textTex.minFilter = THREE.LinearFilter;

    const drawText = () => {
      const c = textCtx;
      if (!c) return;
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      const tdpr = Math.min(window.devicePixelRatio || 1, 1.5);
      textCanvas.width = Math.max(2, Math.round(w * tdpr));
      textCanvas.height = Math.max(2, Math.round(h * tdpr));
      c.setTransform(tdpr, 0, 0, tdpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const rootRect = wrap.getBoundingClientRect();
      const lines: Array<{ el: HTMLElement | null; stroke: boolean }> = [
        { el: line1.current, stroke: false },
        { el: line2.current, stroke: true },
      ];
      for (const { el, stroke } of lines) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        const fs = parseFloat(cs.fontSize) || 64;
        const ls = parseFloat(cs.letterSpacing) || 0;
        c.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        c.textBaseline = "alphabetic";
        c.fillStyle = "#ffffff";
        c.strokeStyle = "#ffffff";
        c.lineWidth = stroke ? (fs > 72 ? 1.5 : 1.05) : 1;
        c.lineJoin = "round";
        const capAsc =
          c.measureText("U").actualBoundingBoxAscent || fs * 0.72;
        const baseY = r.top - rootRect.top + r.height / 2 + capAsc / 2;
        let x = r.left - rootRect.left;
        for (const ch of el.textContent || "") {
          if (ch !== " ") {
            if (stroke) c.strokeText(ch, x, baseY);
            else c.fillText(ch, x, baseY);
          }
          x += c.measureText(ch).width + ls;
        }
      }
      textTex.needsUpdate = true;
    };

    /* ── scene: fullscreen quad ── */
    const uniforms = {
      uTime: { value: 0 },
      uSweep: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uChaos: { value: 1 },
      uReveal: { value: 0 },
      uTrail: { value: trailTex },
      uText: { value: textTex },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      defines: { OCTAVES: isMobile ? 3 : 5 },
      depthWrite: false,
      depthTest: false,
    });
    material.extensions.derivatives = true;
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const measure = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(
        renderer.domElement.width,
        renderer.domElement.height
      );
      drawText();
    };
    measure();
    if (typeof document.fonts?.ready?.then === "function") {
      document.fonts.ready.then(() => {
        if (!disposed) drawText();
      });
    }

    /* ── splats ── */
    let trailDirty = true;
    const splat = (
      u: number,
      v: number,
      vx: number,
      vy: number,
      amt: number,
      sigma = 2.0
    ) => {
      if (u < -0.1 || u > 1.1 || v < -0.1 || v > 1.1) return;
      trailDirty = true;
      const cx = u * TS;
      const cy = v * TS;
      const rad = Math.ceil(sigma * 2.5);
      const x0 = Math.max(0, Math.floor(cx - rad));
      const x1 = Math.min(TS - 1, Math.ceil(cx + rad));
      const y0 = Math.max(0, Math.floor(cy - rad));
      const y1 = Math.min(TS - 1, Math.ceil(cy + rad));
      const s2 = 2 * sigma * sigma;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          const wgt = Math.exp(-(dx * dx + dy * dy) / s2) * amt;
          if (wgt < 0.01) continue;
          const i = (y * TS + x) * 3;
          const blend = Math.min(1, wgt * 1.4);
          fbuf[i] += (vx - fbuf[i]) * blend;
          fbuf[i + 1] += (vy - fbuf[i + 1]) * blend;
          fbuf[i + 2] = Math.min(1, fbuf[i + 2] + wgt);
        }
      }
    };

    /* ── pointer → trail (processed once per frame) ── */
    type Move = { x: number; y: number; t: number; burst?: boolean };
    const moves: Move[] = [];
    let prevU = -1;
    let prevV = -1;
    let prevT = 0;
    let speedEMA = 0;
    const clampV = (n: number) => Math.max(-1, Math.min(1, n));

    const onMove = (e: PointerEvent) => {
      if (!running) return;
      if (moves.length < 32)
        moves.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    const onDown = (e: PointerEvent) => {
      if (!running) return;
      if (moves.length < 32)
        moves.push({
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          burst: true,
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    });

    const processMoves = () => {
      if (!moves.length) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        moves.length = 0;
        return;
      }
      for (const m of moves) {
        const u = (m.x - rect.left) / rect.width;
        const v = 1 - (m.y - rect.top) / rect.height;
        if (m.burst) {
          splat(u, v, 0, 0, 0.9, 3.2); // a "drop" — ripple bloom on tap/click
          speedEMA = Math.max(speedEMA, 0.5);
        } else if (prevU >= 0) {
          const dtm = Math.max(0.004, (m.t - prevT) / 1000);
          if (dtm < 0.25) {
            const vu = (u - prevU) / dtm;
            const vv = (v - prevV) / dtm;
            const speed = Math.hypot(vu, vv);
            const amt = Math.min(0.85, speed * 0.5 + 0.1);
            // sub-sample long segments so fast flicks leave a continuous wake
            const steps = Math.min(
              6,
              Math.ceil(Math.hypot(u - prevU, v - prevV) * TS / 1.5)
            );
            for (let s = 1; s <= steps; s++) {
              const f = s / steps;
              splat(
                prevU + (u - prevU) * f,
                prevV + (v - prevV) * f,
                clampV(vu * 0.25),
                clampV(vv * 0.25),
                amt / steps + 0.04
              );
            }
            speedEMA = Math.max(speedEMA, Math.min(1.4, speed * 0.35));
          }
        }
        if (!m.burst) {
          prevU = u;
          prevV = v;
          prevT = m.t;
        }
      }
      moves.length = 0;
    };

    /* ── boot choreography state (tweened by gsap, read in tick) ── */
    const chaos = { v: 1 };
    const reveal = { v: 0 };

    /* hide the layout name — the fluid renders it from here on.
       (DOM copy stays for no-JS / the flat fallback / layout metrics.) */
    ctx.add(() => {
      gsap.set(nameBlock.current, { opacity: 0 });
      if (rolesRow.current)
        gsap.set(Array.from(rolesRow.current.children), { opacity: 0, y: 8 });
      gsap.set([para.current, ctaRow.current], { opacity: 0, y: 30 });
      gsap.set(meniscus.current, { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(annot.current, { opacity: 0 });
    });

    /* ── render loop ── */
    let raf = 0;
    let running = false;
    let inView = true;
    let disposed = false;
    let last = performance.now();
    let simT = 0;
    let realT = 0;
    let flickAcc = 0;

    const flicker = () => {
      const turb = speedEMA > 0.45;
      if (viscEl.current)
        viscEl.current.textContent = (
          0.842 +
          speedEMA * 0.35 +
          (Math.random() - 0.5) * 0.012
        ).toFixed(3);
      if (reEl.current)
        reEl.current.textContent = (740 + speedEMA * 5200 + Math.random() * 90)
          .toExponential(1)
          .toUpperCase()
          .replace("E+", "E");
      if (flowEl.current) {
        flowEl.current.textContent = turb ? "TURBULENT" : "LAMINAR";
        flowEl.current.style.color = turb ? "#ccff3d" : "";
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      realT += dt;
      simT += dt * (0.55 + Math.max(chaos.v, 0) * 3.2);
      speedEMA *= Math.exp(-dt * 1.4);

      // touch devices: an automatic slow stirring path (lissajous)
      if (isTouch) {
        const au =
          0.5 +
          0.27 * Math.sin(realT * 0.21) +
          0.1 * Math.sin(realT * 0.473 + 1.3);
        const av =
          0.52 +
          0.2 * Math.sin(realT * 0.157 + 4.2) +
          0.08 * Math.cos(realT * 0.31);
        const dx = Math.cos(realT * 0.21) * 0.057 + Math.cos(realT * 0.473);
        const dy = Math.cos(realT * 0.157) - Math.sin(realT * 0.31);
        const d = Math.hypot(dx, dy) || 1;
        splat(au, av, (dx / d) * 0.5, (dy / d) * 0.5, 0.05, 2.6);
      }

      processMoves();

      // decay + upload the trail buffer (skipped once fully dissipated)
      if (trailDirty) {
        const kV = Math.exp(-dt * 1.45);
        const kI = Math.exp(-dt * 1.15); // ~3% left after 3s
        let energy = 0;
        for (let i = 0, j = 0; i < fbuf.length; i += 3, j += 4) {
          fbuf[i] *= kV;
          fbuf[i + 1] *= kV;
          fbuf[i + 2] *= kI;
          energy += fbuf[i + 2];
          tdata[j] = 128 + fbuf[i] * 127;
          tdata[j + 1] = 128 + fbuf[i + 1] * 127;
          tdata[j + 2] = fbuf[i + 2] * 255;
        }
        trailTex.needsUpdate = true;
        if (energy < 0.01) trailDirty = false;
      }

      uniforms.uTime.value = simT;
      uniforms.uSweep.value = (realT % 9) / 9;
      uniforms.uChaos.value = chaos.v;
      uniforms.uReveal.value = reveal.v;

      // live-ish instrument readout, ~2×/s, pauses with the loop
      flickAcc += dt;
      if (flickAcc >= 0.45) {
        flickAcc = 0;
        flicker();
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const setRunning = () => {
      const should = inView && !document.hidden && !disposed;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
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
    io.observe(wrap);
    const onVis = () => setRunning();
    document.addEventListener("visibilitychange", onVis);

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    cleanups.push(() => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeRaf);
    });

    setRunning();

    /* ── entrance: the name condenses out of the liquid ── */
    cleanups.push(
      onBooted(() => {
        ctx.add(() => {
          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
          tl.to(reveal, { v: 1, duration: 1.5, ease: "power2.inOut" }, 0);
          tl.to(chaos, { v: 0, duration: 2.0, ease: "hfSettle" }, 0.1);
          if (rolesRow.current)
            tl.to(
              Array.from(rolesRow.current.children),
              { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: "power3.out" },
              0.85
            );
          tl.to(
            meniscus.current,
            { scaleX: 1, duration: 1.0, ease: "expo.out" },
            1.05
          );
          tl.to(
            [para.current, ctaRow.current],
            { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 },
            1.15
          );
          tl.to(
            annot.current,
            { opacity: 1, duration: 0.8, ease: "power2.out" },
            1.45
          );
        });
      })
    );

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cleanups.forEach((fn) => fn());
      ctx.revert();
      geometry.dispose();
      material.dispose();
      trailTex.dispose();
      textTex.dispose();
      renderer.dispose();
    };
  }, [mode]);

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / SIGNAL"
      className="relative h-[100svh] min-h-[640px] overflow-hidden bg-bg"
    >
      {/* the page's only WebGL context — or the static-gradient fallback */}
      {mode === "gl" ? (
        <div ref={glWrap} aria-hidden="true" className="absolute inset-0 z-0">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      ) : (
        <div aria-hidden="true" className="hf-flat absolute inset-0 z-0" />
      )}

      {/* mobile legibility lift under the bottom block */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[34%] bg-gradient-to-b from-transparent to-bg/60 md:hidden" />

      <h1 className="sr-only">
        Uday Pratap Singh Parihar — Full-Stack, RPA &amp; Automation, Reverse
        Engineering
      </h1>

      {/* ── composition ── */}
      <div
        ref={content}
        className="relative z-10 flex h-full flex-col pad-x pb-16 pt-24 md:pb-20 md:pt-28"
      >
        {/* roles — top-left, mono */}
        <div
          ref={rolesRow}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:text-[.65rem]"
        >
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

        {/* the name — layout host + no-JS / fallback type; when the fluid is
            live this block turns invisible and the shader renders it instead */}
        <div className="my-auto">
          <div
            ref={nameBlock}
            aria-hidden="true"
            className="font-display font-bold leading-[.94] tracking-[-.04em] text-[clamp(2.3rem,11.4vw,3rem)] md:text-[clamp(3.5rem,10.6vw,10.6rem)]"
          >
            <span ref={line1} className="block whitespace-nowrap">
              {LINE_1}
            </span>
            <span ref={line2} className="hf-stroke block whitespace-nowrap">
              {LINE_2}
            </span>
          </div>

          {/* meniscus — the liquid's edge under the composition */}
          <div
            ref={meniscus}
            aria-hidden="true"
            className="hf-meniscus mt-5 h-px w-[min(380px,58%)] md:mt-7"
          />
        </div>

        {/* paragraph + CTAs — bottom-left */}
        <div className="max-w-[46ch]">
          <p
            ref={para}
            className="text-[.9rem] leading-[1.6] text-muted md:text-[clamp(.9rem,1.3vw,1.05rem)]"
          >
            {COPY}
          </p>
          <div
            ref={ctaRow}
            className="mt-7 flex gap-4 max-md:flex-col md:mt-9 md:items-center"
          >
            <a
              href="#projects"
              data-cursor="hover"
              className="hf-cta hf-cta-fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-text max-md:w-full"
            >
              <span
                aria-hidden="true"
                className="hf-cta-bg absolute inset-0 bg-accent"
              />
              <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
                View case files
              </span>
            </a>
            <a
              href="#contact"
              data-cursor="hover"
              className="hf-cta inline-flex items-center justify-center border border-line px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
            >
              Transmit
            </a>
          </div>
        </div>
      </div>

      {/* instrument readout — bottom-right */}
      <div
        ref={annot}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-4 z-10 select-none text-right font-mono text-[.55rem] uppercase leading-[1.7] tracking-[.18em] text-faint md:bottom-6 md:right-7 md:text-[.6rem]"
      >
        <div>
          Viscosity{" "}
          <span ref={viscEl} className="text-muted">
            0.846
          </span>{" "}
          Pa·s · Nominal
        </div>
        <div>
          Flow{" "}
          <span ref={flowEl} className="text-muted">
            Laminar
          </span>{" "}
          · Re{" "}
          <span ref={reEl} className="text-muted">
            7.4E2
          </span>
        </div>
      </div>

      <style>{`
        .hf-stroke {
          color: transparent;
          -webkit-text-stroke: 1.4px #ededf0;
        }
        @media (max-width: 767px) {
          .hf-stroke { -webkit-text-stroke-width: 1px; }
        }
        .hf-meniscus {
          background: linear-gradient(90deg, var(--accent) 0%, rgba(204,255,61,.55) 55%, rgba(204,255,61,0) 100%);
          box-shadow: 0 0 14px rgba(204,255,61,.3);
        }
        .hf-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .hf-cta-fill:hover .hf-cta-bg,
        .hf-cta-fill:focus-visible .hf-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        .hf-flat {
          background:
            linear-gradient(115deg, transparent 42%, rgba(237,237,240,.05) 50%, transparent 58%),
            radial-gradient(90% 70% at 30% 28%, #11111a 0%, rgba(17,17,26,0) 60%),
            radial-gradient(70% 55% at 72% 70%, rgba(124,92,255,.07), transparent 70%),
            radial-gradient(50% 40% at 18% 78%, rgba(204,255,61,.05), transparent 70%),
            #0a0a10;
        }
      `}</style>
    </section>
  );
}
