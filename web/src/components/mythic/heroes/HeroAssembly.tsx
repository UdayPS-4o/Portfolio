"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import * as THREE from "three";
import { scramble } from "@/lib/mythic/text";
import { magnetize } from "@/lib/mythic/magnetic";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";

/**
 * HeroAssembly — 00 / SIGNAL.
 * The name IS the particle system: ~28k GPU points whose home positions are
 * sampled from "UDAY PRATAP / SINGH PARIHAR" rasterized on an offscreen 2D
 * canvas. On boot the points start as a violet storm (rotating cloud + curl
 * noise) and ASSEMBLE into the acid-lit name over ~2.2s — the chaos→home morph
 * runs entirely in the vertex shader (uProgress + per-particle stagger with a
 * back-out overshoot). The pointer is a local disruptor: a springy world-space
 * repulsion field bends the name around the cursor; pointerdown fires an
 * expanding shockwave ring through the glyphs. Reduced motion / WebGL failure
 * falls back to huge DOM type over a static speckle field.
 */

const LINE1 = "UDAY PRATAP";
const LINE2 = "SINGH PARIHAR";
const ROLES = ["Full-Stack", "RPA & Automation", "Reverse Engineering"];
const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

/* ────────────────────────── shaders ────────────────────────── */

const VERT = /* glsl */ `
attribute vec3  aHome;
attribute float aRand;
attribute float aOffset;
attribute float aCore;

uniform float uTime;
uniform float uProgress;
uniform vec2  uMouse;
uniform float uMouseAmp;
uniform float uRadius;
uniform float uShockT;
uniform vec2  uShockPos;
uniform float uShockMaxR;
uniform float uTextW;
uniform float uPixelRatio;
uniform float uSize;

varying float vCore;
varying float vSeed;
varying float vE;
varying float vAlpha;

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

void main() {
  // per-particle assembly progress: staggered window + back-out overshoot
  float t = clamp(uProgress * 1.72 - aOffset * 0.72, 0.0, 1.0);
  float u = t - 1.0;
  float e = 1.0 + 2.35 * u * u * u + 1.35 * u * u; // back.out(1.35)

  // storm: slow vortex rotation + decorrelated curl-ish noise drift
  vec3 sp = position;
  float ca = cos(uTime * 0.11);
  float sa = sin(uTime * 0.11);
  sp.xy = mat2(ca, -sa, sa, ca) * sp.xy;
  vec3 q = sp * 0.27 + vec3(0.0, uTime * 0.16, uTime * 0.05);
  sp += vec3(
    snoise(q),
    snoise(q + vec3(31.7, 11.3, 71.7)),
    0.6 * snoise(q * 1.35 + vec3(7.7, 43.1, 17.9))
  ) * 1.5;

  // assembled micro-shimmer keeps the glyphs alive
  vec3 jit = vec3(
    sin(uTime * 1.25 + aRand * 39.0),
    cos(uTime * 1.05 + aRand * 17.0),
    sin(uTime * 0.90 + aRand * 27.0)
  ) * 0.016;

  vec3 p = mix(sp, aHome + jit, e);

  // pointer disruptor: springy world-space repulsion (uMouse integrated in JS)
  vec2 d = p.xy - uMouse;
  float dist = length(d);
  float push = (1.0 - smoothstep(0.0, uRadius, dist)) * uMouseAmp;
  push *= push;
  p.xy += (d / max(dist, 0.001)) * push * 1.05;
  p.z  += push * 0.5 * (aRand - 0.5);

  // shockwave: expanding ring from pointerdown
  vec2 sd = p.xy - uShockPos;
  float sdist = length(sd);
  float ring = exp(-pow((sdist - uShockT * uShockMaxR) * 1.45, 2.0)) * (1.0 - uShockT);
  p.xy += (sd / max(sdist, 0.001)) * ring * 2.3;
  p.z  += ring * (aRand - 0.5) * 1.4;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // size attenuation + slow global breathing
  float breath = 1.0 + 0.05 * sin(uTime * 0.85 + aRand * 6.2831);
  gl_PointSize = uPixelRatio * uSize * (0.55 + 0.9 * aRand) * breath / -mv.z;

  // periodic scan sweep across the formed name (instrument shimmer)
  float sweep = fract(uTime * 0.13);
  float scanX = (sweep * 1.7 - 0.85) * uTextW;
  float scan = exp(-pow((aHome.x - scanX) * (6.0 / max(uTextW, 0.001)), 2.0)) * t;

  vCore = aCore;
  vSeed = aRand;
  vE = t;
  vAlpha = (0.3 + 0.7 * aRand) * mix(0.42, 0.5 + 0.5 * aCore, t)
         + push * 0.45 + ring * 0.6 + scan * 0.5;
}
`;

const FRAG = /* glsl */ `
uniform vec3  uCore;
uniform vec3  uEdge;
uniform vec3  uViolet;
uniform float uAlpha;

varying float vCore;
varying float vSeed;
varying float vE;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float disc = smoothstep(0.5, 0.12, d);

  // bright accent core of glyph strokes -> dim text-white edges
  vec3 col = mix(uEdge * 0.72, uCore, smoothstep(0.18, 0.95, vCore));
  // ~4% of particles tinted violet
  col = mix(col, uViolet, step(0.962, vSeed) * 0.85);
  // storm phase reads dim violet, crystallizes into the final palette
  vec3 storm = mix(uEdge * 0.45, uViolet, 0.35 + 0.45 * vSeed);
  col = mix(storm, col, vE);

  gl_FragColor = vec4(col, disc * vAlpha * uAlpha);
}
`;

/* ─────────────────────── text sampling ─────────────────────── */

/**
 * Rasterize the two name lines on an offscreen canvas and sample `count`
 * home positions (world units) from inside the glyph strokes. `cores`
 * measures distance-from-edge (via a blurred second pass) so stroke centers
 * can glow accent while edges stay dim.
 */
function sampleNameField(
  family: string,
  count: number,
  worldW: number,
  yOff: number
): { homes: Float32Array; cores: Float32Array } | null {
  const W = 1280;
  const cv = document.createElement("canvas");
  const c2d = cv.getContext("2d", { willReadFrequently: true });
  if (!c2d) return null;

  // measure at 100px, then scale the font so the widest line fills 94% of W
  c2d.font = `700 100px ${family}`;
  const maxW100 = Math.max(
    c2d.measureText(LINE1).width,
    c2d.measureText(LINE2).width,
    1
  );
  const fontSize = Math.floor((W * 0.94 * 100) / maxW100);
  const lineGap = fontSize * 1.04;
  const H = Math.ceil(lineGap + fontSize * 1.3);
  cv.width = W;
  cv.height = H; // note: resizing resets ctx state

  const draw = () => {
    c2d.textAlign = "center";
    c2d.textBaseline = "alphabetic";
    c2d.font = `700 ${fontSize}px ${family}`;
    c2d.fillStyle = "#fff";
    const y1 = fontSize * 0.92;
    c2d.fillText(LINE1, W / 2, y1);
    c2d.fillText(LINE2, W / 2, y1 + lineGap);
  };

  c2d.clearRect(0, 0, W, H);
  draw();
  const sharp = c2d.getImageData(0, 0, W, H).data;

  // blurred pass = "coreness" map (stroke interiors stay bright)
  let blur: Uint8ClampedArray = sharp;
  try {
    c2d.clearRect(0, 0, W, H);
    c2d.filter = `blur(${Math.max(2, fontSize * 0.045)}px)`;
    draw();
    c2d.filter = "none";
    blur = c2d.getImageData(0, 0, W, H).data;
  } catch {
    blur = sharp;
  }

  const xs: number[] = [];
  const ys: number[] = [];
  const cs: number[] = [];
  let minY = H;
  let maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = sharp[(y * W + x) * 4 + 3];
      if (a > 110) {
        xs.push(x);
        ys.push(y);
        const b = blur[(y * W + x) * 4 + 3] / 255;
        cs.push(Math.min(1, Math.max(0, (b - 0.42) / 0.5)));
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (xs.length < 64) return null;

  const scale = worldW / (W * 0.94);
  const cx = W / 2;
  const cyMid = (minY + maxY) / 2;
  const n = xs.length;
  const homes = new Float32Array(count * 3);
  const cores = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const j = (Math.random() * n) | 0;
    homes[i * 3] = (xs[j] - cx + Math.random() - 0.5) * scale;
    homes[i * 3 + 1] = (cyMid - ys[j] + Math.random() - 0.5) * scale + yOff;
    homes[i * 3 + 2] = (Math.random() - 0.5) * 0.34;
    cores[i] = cs[j];
  }
  return { homes, cores };
}

/* ─────────────────────── component ─────────────────────── */

export default function HeroAssembly() {
  const [mode, setMode] = useState<"gl" | "fallback">("gl");

  const root = useRef<HTMLElement>(null);
  const glWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const para = useRef<HTMLParagraphElement>(null);
  const ctaRow = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const countEl = useRef<HTMLSpanElement>(null);
  const asmEl = useRef<HTMLSpanElement>(null);
  const statusEl = useRef<HTMLSpanElement>(null);
  const lockDot = useRef<HTMLSpanElement>(null);

  /* ── WebGL mode ── */
  useEffect(() => {
    if (mode !== "gl") return;
    const rootEl = root.current;
    const wrap = glWrap.current;
    const canvas = canvasRef.current;
    if (!rootEl || !wrap || !canvas) return;

    if (prefersReduced()) {
      setMode("fallback");
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setMode("fallback");
      return;
    }

    gsap.registerPlugin(CustomEase);
    CustomEase.create("massyRise", "M0,0 C0.16,1 0.3,1 1,1");

    const ctx = gsap.context(() => {}, rootEl);
    const cleanups: Array<() => void> = [];
    let disposed = false;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const FOV = 55;
    const CAM_Z = 14;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAM_Z);

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 9000 : 28000;

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseAmp: { value: 0 },
      uRadius: { value: 2 },
      uShockT: { value: 1 },
      uShockPos: { value: new THREE.Vector2(0, 0) },
      uShockMaxR: { value: 12 },
      uTextW: { value: 10 },
      uPixelRatio: { value: dpr },
      uSize: { value: isMobile ? 22 : 34 },
      uAlpha: { value: isMobile ? 0.62 : 0.85 },
      uCore: { value: new THREE.Color("#ccff3d") },
      uEdge: { value: new THREE.Color("#ededf0") },
      uViolet: { value: new THREE.Color("#7c5cff") },
    };

    const world = { halfW: 1, halfH: 1, textW: 10, yOff: 0 };
    const measure = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      world.halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
      world.halfW = world.halfH * camera.aspect;
      const mobile = w < 768;
      world.textW = world.halfW * 2 * (mobile ? 0.92 : 0.7);
      world.yOff = world.halfH * (mobile ? 0.22 : 0.14);
      uniforms.uTextW.value = world.textW;
      uniforms.uRadius.value = ((mobile ? 110 : 140) * world.halfW * 2) / w;
      uniforms.uShockMaxR.value = Math.hypot(world.halfW, world.halfH) * 1.35;
    };
    measure();

    /* geometry: position = chaos storm, aHome filled async after font load */
    const chaos = new Float32Array(COUNT * 3);
    const homes0 = new Float32Array(COUNT * 3);
    const rands = new Float32Array(COUNT);
    const offsets = new Float32Array(COUNT);
    const cores0 = new Float32Array(COUNT);
    const R = world.halfW * 0.9;
    for (let i = 0; i < COUNT; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = R * (0.35 + 0.65 * Math.cbrt(Math.random()));
      const x = r * Math.sin(ph) * Math.cos(th);
      const y = r * Math.sin(ph) * Math.sin(th) * 0.7;
      const z = r * Math.cos(ph) * 0.45;
      chaos[i * 3] = x;
      chaos[i * 3 + 1] = y;
      chaos[i * 3 + 2] = z;
      homes0[i * 3] = x;
      homes0[i * 3 + 1] = y;
      homes0[i * 3 + 2] = z;
      rands[i] = Math.random();
      offsets[i] = Math.random();
      cores0[i] = 0.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(chaos, 3));
    const homeAttr = new THREE.BufferAttribute(homes0, 3);
    const coreAttr = new THREE.BufferAttribute(cores0, 1);
    const offsetAttr = new THREE.BufferAttribute(offsets, 1);
    geometry.setAttribute("aHome", homeAttr);
    geometry.setAttribute("aCore", coreAttr);
    geometry.setAttribute("aOffset", offsetAttr);
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    /* ── pre-boot hidden states (JS only, never CSS) ── */
    ctx.add(() => {
      gsap.set([para.current, ctaRow.current], { y: 28, opacity: 0 });
      gsap.set(readout.current, { opacity: 0 });
    });

    /* ── magnetic CTAs (lib no-ops on touch / reduced) ── */
    rootEl
      .querySelectorAll<HTMLElement>(".massy-cta")
      .forEach((el) => cleanups.push(magnetize(el, 0.3)));

    /* ── assembly orchestration: needs boot + sampled homes ── */
    let booted = false;
    let sampled = false;
    let started = false;
    let formed = false;
    const counter = { n: 0 };

    const startAssembly = () => {
      if (started || disposed || !booted || !sampled) return;
      started = true;
      ctx.add(() => {
        rootEl.querySelectorAll<HTMLElement>(".massy-role").forEach((el, i) => {
          gsap.delayedCall(0.05 + i * 0.14, () => {
            if (!disposed) cleanups.push(scramble(el, { duration: 0.85 }));
          });
        });
        if (statusEl.current) statusEl.current.textContent = "FORMING";

        const tl = gsap.timeline();
        tl.fromTo(
          uniforms.uProgress,
          { value: 0 },
          {
            value: 1,
            duration: 2.2,
            ease: "power2.inOut",
            onUpdate: () => {
              if (asmEl.current)
                asmEl.current.textContent = `${String(
                  Math.round(uniforms.uProgress.value * 100)
                ).padStart(3, "0")}%`;
            },
            onComplete: () => {
              formed = true;
              if (asmEl.current) asmEl.current.textContent = "100%";
              if (statusEl.current) statusEl.current.textContent = "LOCKED";
              if (lockDot.current)
                gsap.to(lockDot.current, {
                  backgroundColor: "#ccff3d",
                  boxShadow: "0 0 8px rgba(204,255,61,.8)",
                  duration: 0.35,
                  ease: "power2.out",
                });
            },
          },
          0.15
        );
        tl.fromTo(
          readout.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: "power2.out" },
          0.35
        );
        tl.fromTo(
          counter,
          { n: 0 },
          {
            n: COUNT,
            duration: 1.5,
            ease: "power3.out",
            onUpdate: () => {
              if (countEl.current)
                countEl.current.textContent = String(
                  Math.round(counter.n)
                ).padStart(6, "0");
            },
          },
          0.15
        );
        tl.fromTo(
          [para.current, ctaRow.current],
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            ease: "massyRise",
            stagger: 0.12,
          },
          1.85
        );
      });
    };

    cleanups.push(
      onBooted(() => {
        booted = true;
        startAssembly();
      })
    );

    /* ── font-aware sampling (resample on resize) ── */
    let fontFamily = "sans-serif";
    let fontsLoaded = false;

    const applySample = () => {
      if (disposed || !fontsLoaded) return;
      const s = sampleNameField(fontFamily, COUNT, world.textW, world.yOff);
      if (!s) return;
      (homeAttr.array as Float32Array).set(s.homes);
      homeAttr.needsUpdate = true;
      (coreAttr.array as Float32Array).set(s.cores);
      coreAttr.needsUpdate = true;
      if (!sampled) {
        // left→right assembly sweep, noised per particle
        const off = offsetAttr.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          const nx = s.homes[i * 3] / world.textW + 0.5;
          off[i] = Math.min(1, Math.max(0, nx * 0.7 + Math.random() * 0.3));
        }
        offsetAttr.needsUpdate = true;
        sampled = true;
        startAssembly();
      } else if (formed) {
        // graceful re-form after resize instead of a hard snap
        ctx.add(() => {
          gsap.fromTo(
            uniforms.uProgress,
            { value: 0.55 },
            { value: 1, duration: 0.9, ease: "power3.out", overwrite: true }
          );
        });
      }
    };

    (async () => {
      const probe = document.createElement("span");
      probe.className = "font-display";
      probe.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none;";
      rootEl.appendChild(probe);
      const fam = getComputedStyle(probe).fontFamily;
      probe.remove();
      if (fam) fontFamily = fam;
      try {
        await document.fonts.load(`700 100px ${fontFamily}`, LINE2);
      } catch {
        /* sample with fallback metrics */
      }
      try {
        await document.fonts.ready;
      } catch {
        /* noop */
      }
      if (disposed) return;
      fontsLoaded = true;
      applySample();
    })();

    /* ── pointer: springy repulsion target + shockwave ── */
    const ptr = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0 };
    let ptrActive = false;

    const toWorld = (e: PointerEvent): { x: number; y: number } => {
      const r = wrap.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1;
      const ny = -(((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1);
      return { x: nx * world.halfW, y: ny * world.halfH };
    };

    const onMove = (e: PointerEvent) => {
      const w = toWorld(e);
      ptr.tx = w.x;
      ptr.ty = w.y;
      if (!ptrActive) {
        ptrActive = true;
        ptr.x = w.x;
        ptr.y = w.y;
        ptr.vx = 0;
        ptr.vy = 0;
        ctx.add(() => {
          gsap.to(uniforms.uMouseAmp, {
            value: 1,
            duration: 0.35,
            ease: "power2.out",
            overwrite: true,
          });
        });
      }
    };
    const onLeave = () => {
      ptrActive = false;
      ctx.add(() => {
        gsap.to(uniforms.uMouseAmp, {
          value: 0,
          duration: 0.5,
          ease: "power2.out",
          overwrite: true,
        });
      });
    };
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("a")) return;
      const w = toWorld(e);
      uniforms.uShockPos.value.set(w.x, w.y);
      ctx.add(() => {
        gsap.fromTo(
          uniforms.uShockT,
          { value: 0 },
          { value: 1, duration: 1.05, ease: "power1.out", overwrite: true }
        );
      });
    };
    rootEl.addEventListener("pointermove", onMove, { passive: true });
    rootEl.addEventListener("pointerleave", onLeave, { passive: true });
    rootEl.addEventListener("pointerdown", onDown, { passive: true });

    /* ── resize: re-measure now, resample debounced ── */
    let resizeTimer = 0;
    const onResize = () => {
      measure();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(applySample, 250);
    };
    window.addEventListener("resize", onResize);

    /* ── render loop, paused offscreen / hidden tab ── */
    let raf = 0;
    let running = false;
    let inView = true;
    let t = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      // underdamped spring → the repulsion field returns elastically
      const k = 70;
      const damp = Math.exp(-7.5 * dt);
      ptr.vx += (ptr.tx - ptr.x) * k * dt;
      ptr.vy += (ptr.ty - ptr.y) * k * dt;
      ptr.vx *= damp;
      ptr.vy *= damp;
      ptr.x += ptr.vx * dt;
      ptr.y += ptr.vy * dt;

      uniforms.uTime.value = t;
      uniforms.uMouse.value.set(ptr.x, ptr.y);

      // subtle camera parallax (z-jitter on homes gives depth shimmer)
      const px = ptrActive
        ? THREE.MathUtils.clamp(ptr.x / world.halfW, -1, 1)
        : 0;
      const py = ptrActive
        ? THREE.MathUtils.clamp(ptr.y / world.halfH, -1, 1)
        : 0;
      camera.position.x += (px * 0.45 - camera.position.x) * 0.04;
      camera.position.y += (py * 0.3 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

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
    io.observe(rootEl);
    const onVis = () => setRunning();
    document.addEventListener("visibilitychange", onVis);
    setRunning();

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      rootEl.removeEventListener("pointermove", onMove);
      rootEl.removeEventListener("pointerleave", onLeave);
      rootEl.removeEventListener("pointerdown", onDown);
      cleanups.forEach((fn) => fn());
      ctx.revert();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [mode]);

  /* ── fallback mode: static composition, simple fade ── */
  useEffect(() => {
    if (mode !== "fallback") return;
    const rootEl = root.current;
    if (!rootEl) return;
    const ctx = gsap.context(() => {}, rootEl);
    const cleanups: Array<() => void> = [];

    rootEl
      .querySelectorAll<HTMLElement>(".massy-cta")
      .forEach((el) => cleanups.push(magnetize(el, 0.3)));

    const items = rootEl.querySelectorAll<HTMLElement>(".massy-fb-item");
    ctx.add(() => {
      gsap.set(items, { opacity: 0 });
    });
    cleanups.push(
      onBooted(() => {
        ctx.add(() => {
          gsap.to(items, {
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.09,
          });
        });
      })
    );

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [mode]);

  const rolesRow = (extra = "") => (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:text-[.65rem] ${extra}`}
    >
      {ROLES.map((r, i) => (
        <Fragment key={r}>
          {i > 0 && (
            <span aria-hidden="true" className="text-accent">
              ·
            </span>
          )}
          <span className="massy-role">{r}</span>
        </Fragment>
      ))}
    </div>
  );

  const ctas = (
    <>
      <a
        href="#projects"
        data-cursor="hover"
        className="massy-cta massy-cta--fill group relative inline-flex items-center justify-center overflow-hidden border border-accent px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-text max-md:w-full"
      >
        <span
          aria-hidden="true"
          className="massy-cta-bg absolute inset-0 bg-accent"
        />
        <span className="relative z-10 transition-colors duration-300 group-hover:text-bg">
          View case files
        </span>
      </a>
      <a
        href="#contact"
        data-cursor="hover"
        className="massy-cta inline-flex items-center justify-center border border-line px-7 py-4 font-mono text-[.68rem] uppercase tracking-[.24em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent max-md:w-full"
      >
        Transmit
      </a>
    </>
  );

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / SIGNAL"
      className="relative h-[100svh] min-h-[640px] overflow-hidden"
    >
      {mode === "gl" ? (
        <>
          {/* the visible name is particles — real heading for AT/SEO */}
          <h1 className="sr-only">
            Uday Pratap Singh Parihar — Full-Stack, RPA &amp; Automation,
            Reverse Engineering
          </h1>

          {/* the page's only WebGL context */}
          <div
            ref={glWrap}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
          >
            <canvas ref={canvasRef} className="block h-full w-full" />
          </div>

          {/* mobile legibility gradient under the bottom copy */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[36%] bg-gradient-to-b from-transparent to-bg/85 md:hidden" />

          {/* foreground DOM — minimal instrument panel */}
          <div className="relative z-10 flex h-full flex-col pad-x pb-16 pt-24 md:pb-20 md:pt-28">
            {rolesRow("max-md:max-w-[62vw]")}

            <div className="mt-auto">
              <p
                ref={para}
                className="max-w-[46ch] text-[.9rem] leading-[1.6] text-muted md:text-[clamp(.9rem,1.25vw,1.05rem)]"
              >
                {COPY}
              </p>
              <div
                ref={ctaRow}
                className="mt-7 flex gap-4 max-md:flex-col md:mt-8 md:items-center"
              >
                {ctas}
              </div>
            </div>
          </div>

          {/* live readout */}
          <div
            ref={readout}
            aria-hidden="true"
            className="absolute z-10 space-y-1 font-mono text-[.55rem] uppercase tracking-[.18em] max-md:right-5 max-md:top-24 max-md:text-right md:bottom-[26px] md:right-[26px] md:text-[.6rem]"
          >
            <div>
              <span className="text-faint">PTS&nbsp;</span>
              <span ref={countEl} className="text-muted">
                000000
              </span>
            </div>
            <div>
              <span className="text-faint">ASSEMBLY&nbsp;</span>
              <span ref={asmEl} className="text-muted">
                000%
              </span>
            </div>
            <div className="flex items-center gap-2 max-md:justify-end">
              <span className="text-faint">FIELD</span>
              <span ref={statusEl} className="text-muted">
                STORM
              </span>
              <span
                ref={lockDot}
                className="inline-block h-[5px] w-[5px] rounded-[1px] bg-faint"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* static particle-speckle field */}
          <div aria-hidden="true" className="massy-speckle absolute inset-0 z-0" />

          <div className="relative z-10 flex h-full flex-col pad-x pb-16 pt-24 md:pb-20 md:pt-28">
            <div className="massy-fb-item">{rolesRow()}</div>

            <div className="my-auto">
              <h1 className="massy-fb-item font-display font-bold leading-[.92] tracking-[-.04em] text-[2.6rem] md:text-[clamp(3rem,10.5vw,10rem)]">
                <span className="block">UDAY PRATAP</span>
                <span className="text-stroke block">SINGH PARIHAR</span>
              </h1>
              <p className="massy-fb-item mt-6 max-w-[46ch] text-[.9rem] leading-[1.6] text-muted md:mt-8 md:text-[clamp(.9rem,1.25vw,1.05rem)]">
                {COPY}
              </p>
              <div className="massy-fb-item mt-8 flex gap-4 max-md:flex-col md:items-center">
                {ctas}
              </div>
            </div>

            <div className="massy-fb-item font-mono text-[.6rem] uppercase tracking-[.18em] text-faint">
              ASSEMBLY 100% · <span className="text-accent">LOCKED</span>
            </div>
          </div>
        </>
      )}

      <style>{`
        .massy-cta-bg {
          clip-path: inset(100% 0 0 0);
          transition: clip-path .5s var(--ease);
        }
        .massy-cta--fill:hover .massy-cta-bg,
        .massy-cta--fill:focus-visible .massy-cta-bg {
          clip-path: inset(0 0 0 0);
        }
        .massy-speckle {
          background-image:
            radial-gradient(rgba(204,255,61,.55) 1px, transparent 1.6px),
            radial-gradient(rgba(237,237,240,.28) 1px, transparent 1.6px),
            radial-gradient(rgba(124,92,255,.30) 1px, transparent 1.8px);
          background-size: 96px 96px, 56px 56px, 144px 144px;
          background-position: 14px 22px, 42px 64px, 70px 10px;
          -webkit-mask-image: radial-gradient(70% 60% at 50% 42%, #000 30%, transparent 100%);
          mask-image: radial-gradient(70% 60% at 50% 42%, #000 30%, transparent 100%);
          opacity: .5;
        }
      `}</style>
    </section>
  );
}
