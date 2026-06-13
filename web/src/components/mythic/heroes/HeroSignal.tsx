"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { RoughEase } from "gsap/EasePack";
import { magnetize } from "@/lib/mythic/magnetic";
import { onBooted, prefersReduced } from "@/lib/mythic/motion";

/**
 * HeroSignal — 00 / SIGNAL — "SIGNAL INTRUSION".
 * A hijacked CRT broadcast. The entire backdrop is one fullscreen-quad GLSL
 * pass: barrel distortion, drifting sync bands (bent by the cursor), fbm
 * interference, film grain, phosphor scanlines + slot mask, and frame-counted
 * signal tears. The NAME LIVES INSIDE THE SHADER — drawn to an offscreen
 * canvas, sampled as a texture, chromatic-split with accent-green ghosting
 * that spikes during glitch events. Boot: 0.6s of pure static → "CHANNEL
 * ACQUIRED" OSD flash → the name tunes in from heavy distortion over ~1.4s.
 * Click = manual glitch burst. Reduced motion / WebGL fail = static test card.
 */

const COPY =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

const TESTCARD_BARS = [
  "#ededf0",
  "#ccff3d",
  "#7c5cff",
  "#ff5c7c",
  "#8a8a93",
  "#54545c",
  "#1c1c22",
];

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2 vUv;

uniform float uTime;
uniform sampler2D uTex;
uniform vec2  uRes;
uniform float uMouseX;  // 0..1, smoothed
uniform float uGlitch;  // burst envelope 0..1
uniform float uTune;    // 1 = detuned, 0 = locked
uniform float uStatic;  // 1 = pure snow (boot)
uniform float uTearY;
uniform float uTearH;
uniform float uTearAmp;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p *= 2.17;
    a *= 0.5;
  }
  return v;
}

void main() {
  // ── tube curvature ──
  vec2 cc = vUv - 0.5;
  float r2 = dot(cc, cc);
  vec2 uv = 0.5 + cc * (1.0 + 0.055 * r2 + 0.09 * r2 * r2);

  // black bezel outside the curved raster
  vec2 bz = abs(uv - 0.5);
  float mask = smoothstep(0.503, 0.498, bz.x) * smoothstep(0.503, 0.498, bz.y);

  // ── vertical-hold hunting + frame slips while detuned ──
  float tune2 = uTune * uTune;
  float hunt = sin(uTime * 1.7) * 0.16 + sin(uTime * 0.83 + 1.7) * 0.09;
  float slip = (hash21(vec2(floor(uTime * 9.0), 3.7)) - 0.5) * 0.7;
  uv.y += (hunt + slip) * tune2;
  uv.x += sin(uv.y * 36.0 + uTime * 9.0) * 0.013 * uTune;

  // ── drifting sync bands, bent toward the cursor ──
  float bp = uv.y * 6.0 - uTime * 0.32;
  float band = sin(bp) * sin(bp * 0.31 + uTime * 0.18);
  float bend = (uMouseX - 0.5) * 2.0;
  float syncAmp = 0.0014 + 0.0045 * uTune + 0.004 * uGlitch;
  uv.x += band * band * band * syncAmp * (1.0 + 1.4 * bend);

  // ── per-scanline jitter during glitch bursts ──
  float ln = floor(vUv.y * uRes.y * 0.4);
  float lr = hash21(vec2(ln, floor(uTime * 24.0)));
  uv.x += (lr - 0.5) * 0.09 * uGlitch
        * step(0.78, hash21(vec2(ln * 1.91, floor(uTime * 24.0) + 7.0)));

  // ── signal tear: one band displaced for 2-3 frames ──
  float tear = step(abs(vUv.y - uTearY), uTearH);
  uv.x += tear * uTearAmp
        * (0.7 + 0.6 * hash21(vec2(floor(vUv.y * uRes.y), floor(uTime * 90.0))));

  // ── background: breathing tube glow + interference wash ──
  vec3 bgA = vec3(0.0275, 0.0275, 0.0353);  // #070709
  vec3 bgB = vec3(0.0510, 0.0392, 0.0941);  // #0d0a18
  vec3 col = mix(bgA, bgB, 0.5 + 0.5 * sin(uTime * 0.17));
  float intf = fbm(vec2(uv.x * 3.0 + uTime * 0.05, uv.y * 9.0 - uTime * 0.35));
  col += intf * vec3(0.024, 0.020, 0.050);
  col += smoothstep(0.55, 1.0, band * band) * vec3(0.012, 0.011, 0.028);
  col += (1.0 - smoothstep(0.0, 0.55, r2)) * vec3(0.012, 0.011, 0.022);

  // ── the broadcast feed (name texture), chromatic-split ──
  float ca = 0.0011 + 0.011 * uGlitch + 0.016 * uTune + tear * abs(uTearAmp) * 0.25;
  vec4 tr = texture2D(uTex, uv + vec2(ca, 0.0));
  vec4 tg = texture2D(uTex, uv);
  vec4 tb = texture2D(uTex, uv - vec2(ca, ca * 0.4));
  col.r = mix(col.r, tr.r, tr.a);
  col.g = mix(col.g, tg.g, tg.a);
  col.b = mix(col.b, tb.b, tb.a);

  // accent-green phosphor ghost during instability
  float gho = clamp(uGlitch * 0.9 + uTune * 0.6 + tear * 0.5, 0.0, 1.0);
  vec4 tgh = texture2D(uTex, uv + vec2(-ca * 2.6, ca * 1.4));
  col += tgh.a * gho * vec3(0.80, 1.0, 0.24) * 0.4;

  // ── film grain ──
  float gr = hash21(vUv * uRes * 0.6
           + vec2(fract(uTime * 13.7) * 91.0, fract(uTime * 7.3) * 57.0));
  col += (gr - 0.5) * (0.055 + 0.22 * uTune + 0.18 * uGlitch);

  // ── full static snow (boot phase / heavy detune) ──
  float sAmt = clamp(uStatic + uTune * 0.5, 0.0, 1.0);
  if (sAmt > 0.001) {
    float sn  = hash21(vUv * uRes * 0.8 + floor(uTime * 60.0) * vec2(3.7, 9.3));
    float sn2 = hash21(vUv * uRes * 0.8 + floor(uTime * 60.0) * vec2(7.1, 1.3));
    vec3 snow = vec3(sn * 0.85 + sn2 * 0.15) * vec3(0.82, 0.86, 0.95);
    snow *= 0.55 + 0.45 * sin(vUv.y * 9.0 + uTime * 7.0);
    col = mix(col, snow, sAmt * 0.92);
  }

  // ── phosphor scanlines + slot mask ──
  col *= 0.88 + 0.12 * sin(vUv.y * uRes.y * 1.9);
  col *= 0.97 + 0.03 * sin(vUv.x * uRes.x * 2.4);

  // ── vignette + bezel ──
  col *= mix(0.62, 1.0, 1.0 - smoothstep(0.18, 0.62, r2));
  col *= mask;

  gl_FragColor = vec4(col, 1.0);
}
`;

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

export default function HeroSignal() {
  const root = useRef<HTMLElement>(null);
  const glWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);
  const osdTL = useRef<HTMLDivElement>(null);
  const osdTR = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState(false);

  /* ── always-on: IST broadcast clock + magnetic CTAs ── */
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    const offs: Array<() => void> = [];

    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const dateFmt = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const tickClock = () => {
      const d = new Date();
      if (clockRef.current)
        clockRef.current.textContent = `${timeFmt.format(d)} IST`;
      if (dateRef.current)
        dateRef.current.textContent = dateFmt.format(d).replace(/\//g, ".");
    };
    tickClock();
    const clockId = window.setInterval(tickClock, 1000);
    offs.push(() => window.clearInterval(clockId));

    rootEl
      .querySelectorAll<HTMLElement>(".hsig-cta")
      .forEach((el) => offs.push(magnetize(el, 0.3)));

    return () => offs.forEach((f) => f());
  }, []);

  /* ── the broadcast: WebGL CRT pass, or the test-card fallback ── */
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    /* —— fallback: static test card, simple fade —— */
    if (fallback) {
      const ctx = gsap.context(() => {}, rootEl);
      const offs: Array<() => void> = [];
      const items = rootEl.querySelectorAll<HTMLElement>(".hsig-fade");
      ctx.add(() => gsap.set(items, { autoAlpha: 0 }));
      offs.push(
        onBooted(() => {
          ctx.add(() => {
            gsap.to(items, {
              autoAlpha: 1,
              duration: 0.8,
              ease: "power2.out",
              stagger: 0.08,
            });
          });
        })
      );
      return () => {
        offs.forEach((f) => f());
        ctx.revert();
      };
    }

    /* —— GL path —— */
    if (prefersReduced()) {
      setFallback(true);
      return;
    }
    const wrap = glWrap.current;
    const canvas = canvasRef.current;
    const flashEl = flashRef.current;
    const lowerEl = lowerRef.current;
    const tlEl = osdTL.current;
    const trEl = osdTR.current;
    if (!wrap || !canvas || !flashEl || !lowerEl || !tlEl || !trEl) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }

    gsap.registerPlugin(CustomEase, RoughEase);
    // lower-third slide: fast attack, +0.5% overshoot, broadcast-snap settle
    if (!CustomEase.get("hsigSlide"))
      CustomEase.create(
        "hsigSlide",
        "M0,0 C0.16,0.7 0.2,1.02 0.42,1.02 0.7,1.02 0.82,1 1,1"
      );

    const ctx = gsap.context(() => {}, rootEl);
    const offs: Array<() => void> = [];
    let disposed = false;

    /* render at 0.7x internal resolution on mobile, upscaled by the canvas */
    const clampDpr = () =>
      Math.min(window.devicePixelRatio || 1, 1.75) *
      (window.innerWidth < 768 ? 0.7 : 1);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);

    /* ── offscreen text texture: the broadcast content ── */
    const texCanvas = document.createElement("canvas");
    const tex = new THREE.CanvasTexture(texCanvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const cssVar = (n: string, fb: string) => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(n)
        .trim();
      return v || fb;
    };
    const dispFam = cssVar("--font-display", "system-ui, sans-serif");
    const monoFam = cssVar("--font-mono", "ui-monospace, monospace");

    const drawFeed = () => {
      const w = wrap.clientWidth || window.innerWidth || 1;
      const h = wrap.clientHeight || window.innerHeight || 1;
      const portrait = w < 768;
      const tw = portrait ? 896 : 1600;
      const th = Math.min(2048, Math.max(512, Math.round((tw * h) / w)));
      texCanvas.width = tw;
      texCanvas.height = th;
      const c = texCanvas.getContext("2d") as Ctx2D | null;
      if (!c) return;
      c.clearRect(0, 0, tw, th);
      c.textBaseline = "alphabetic";
      c.textAlign = "center";

      const lines = portrait
        ? ["UDAY PRATAP", "SINGH", "PARIHAR"]
        : ["UDAY PRATAP", "SINGH PARIHAR"];

      // fit the widest line to the frame
      let size = th * 0.2;
      c.letterSpacing = `${(-0.035 * size).toFixed(2)}px`;
      c.font = `700 ${size}px ${dispFam}`;
      const widest = Math.max(...lines.map((l) => c.measureText(l).width));
      size = Math.min(
        (size * tw * (portrait ? 0.92 : 0.85)) / widest,
        th * (portrait ? 0.17 : 0.26)
      );
      c.letterSpacing = `${(-0.035 * size).toFixed(2)}px`;
      c.font = `700 ${size}px ${dispFam}`;

      const lh = size * 0.96;
      let roleSize = portrait ? tw * 0.026 : Math.max(15, tw * 0.0095);
      const gap = size * (portrait ? 0.5 : 0.42);
      const total = lh * lines.length + gap + roleSize;
      const top = th * (portrait ? 0.4 : 0.46) - total / 2;

      lines.forEach((ln, i) => {
        const y = top + lh * i + size * 0.8;
        if (i === lines.length - 1) {
          // outlined last line — echoes the site's .text-stroke motif
          c.lineWidth = Math.max(1.5, size * 0.02);
          c.strokeStyle = "#ededf0";
          c.strokeText(ln, tw / 2, y);
        } else {
          c.fillStyle = "#ededf0";
          c.fillText(ln, tw / 2, y);
        }
      });

      // roles, mono, with accent separators
      const parts: Array<[string, string]> = [
        ["FULL-STACK", "#b9b9c3"],
        ["  ·  ", "#ccff3d"],
        ["RPA & AUTOMATION", "#b9b9c3"],
        ["  ·  ", "#ccff3d"],
        ["REVERSE ENGINEERING", "#b9b9c3"],
      ];
      const measureRoles = () => {
        c.letterSpacing = `${(0.2 * roleSize).toFixed(2)}px`;
        c.font = `500 ${roleSize}px ${monoFam}`;
        return parts.reduce((s, [t]) => s + c.measureText(t).width, 0);
      };
      let rw = measureRoles();
      if (rw > tw * 0.94) {
        roleSize *= (tw * 0.94) / rw;
        rw = measureRoles();
      }
      c.textAlign = "left";
      const ry = top + lh * lines.length + gap + roleSize * 0.8;
      let px = (tw - rw) / 2;
      parts.forEach(([t, col]) => {
        c.fillStyle = col;
        c.fillText(t, px, ry);
        px += c.measureText(t).width;
      });
      c.letterSpacing = "0px";
      tex.needsUpdate = true;
    };

    const uniforms = {
      uTime: { value: 0 },
      uTex: { value: tex },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouseX: { value: 0.5 },
      uGlitch: { value: 0 },
      uTune: { value: 1 },
      uStatic: { value: 1 },
      uTearY: { value: 0.5 },
      uTearH: { value: 0 },
      uTearAmp: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(geo, mat);
    quad.frustumCulled = false;
    scene.add(quad);

    const setSizes = () => {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      renderer.setPixelRatio(clampDpr());
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(uniforms.uRes.value);
      drawFeed();
    };
    setSizes();

    // redraw once the real display/mono fonts are in (canvas won't pull them)
    Promise.all([
      document.fonts.load(`700 100px ${dispFam}`),
      document.fonts.load(`500 32px ${monoFam}`),
    ])
      .then(() => {
        if (!disposed) drawFeed();
      })
      .catch(() => undefined);

    /* ── glitch machinery ── */
    let tearFrames = 0;
    let armed = false;
    let nextTearAt = 0;
    let burstTO = 0;

    const spawnTear = (s: number) => {
      uniforms.uTearY.value = 0.12 + Math.random() * 0.72;
      uniforms.uTearH.value = 0.008 + Math.random() * 0.05 * s;
      uniforms.uTearAmp.value =
        (Math.random() < 0.5 ? -1 : 1) * (0.035 + 0.12 * Math.random()) * s;
      tearFrames = 2 + ((Math.random() * 2) | 0); // held 2-3 frames
    };
    const kick = (v: number) => {
      ctx.add(() => {
        gsap.to(uniforms.uGlitch, {
          value: v,
          duration: 0.07,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            gsap.to(uniforms.uGlitch, {
              value: 0,
              duration: 0.5,
              ease: "power3.out",
            });
          },
        });
      });
    };
    const burst = (s: number) => {
      spawnTear(s);
      kick(s);
      // OSD channel label flickers with the hit
      ctx.add(() => {
        gsap.fromTo(
          tlEl,
          { opacity: 1 },
          {
            opacity: 0.25,
            duration: 0.06,
            repeat: 3,
            yoyo: true,
            ease: "none",
            clearProps: "opacity",
          }
        );
      });
      window.clearTimeout(burstTO);
      burstTO = window.setTimeout(() => {
        if (!disposed) spawnTear(s * 0.6);
      }, 90);
    };

    const isTouch = window.matchMedia("(hover: none)").matches;
    let touchTO = 0;
    const scheduleTouchBurst = () => {
      touchTO = window.setTimeout(() => {
        if (disposed) return;
        if (running) burst(0.6 + Math.random() * 0.3);
        scheduleTouchBurst();
      }, 4500 + Math.random() * 4000);
    };

    /* ── input ── */
    let mouseTarget = 0.5;
    const onMove = (e: PointerEvent) => {
      mouseTarget = e.clientX / Math.max(1, window.innerWidth);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const onDown = () => {
      if (armed) burst(0.85 + Math.random() * 0.15);
    };
    rootEl.addEventListener("pointerdown", onDown);

    let rsTO = 0;
    const onResize = () => {
      window.clearTimeout(rsTO);
      rsTO = window.setTimeout(() => {
        if (!disposed) setSizes();
      }, 150);
    };
    window.addEventListener("resize", onResize);

    /* ── render loop, paused offscreen + on hidden tab ── */
    let raf = 0;
    let running = false;
    let inView = true;
    let t = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      uniforms.uTime.value = t;
      uniforms.uMouseX.value += (mouseTarget - uniforms.uMouseX.value) * 0.06;

      if (tearFrames > 0) {
        tearFrames -= 1;
        if (tearFrames === 0) uniforms.uTearAmp.value = 0;
      }
      if (armed && t >= nextTearAt) {
        spawnTear(0.4 + Math.random() * 0.5);
        if (Math.random() < 0.6) kick(0.18 + Math.random() * 0.22);
        nextTearAt = t + 3.5 + Math.random() * 5.5;
      }

      renderer.render(scene, cam);
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

    /* ── pre-boot state: chrome hidden, raw static on the tube ── */
    ctx.add(() => {
      gsap.set([tlEl, trEl, flashEl], { autoAlpha: 0 });
      gsap.set(lowerEl, { yPercent: 112 });
    });

    /* ── boot: static → CHANNEL ACQUIRED → tune-in → chrome ── */
    offs.push(
      onBooted(() => {
        ctx.add(() => {
          const tl = gsap.timeline();
          // 0.6s of pure snow, then the carrier collapses
          tl.to(uniforms.uStatic, { value: 0, duration: 0.25, ease: "power3.in" }, 0.6);
          // OSD flash: two blinks, hold, decay
          tl.fromTo(flashEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.52)
            .to(flashEl, { autoAlpha: 0, duration: 0.04 }, 0.68)
            .to(flashEl, { autoAlpha: 1, duration: 0.05 }, 0.78)
            .to(flashEl, { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, 1.55);
          // the name tunes in: rough hunting, then the lock
          tl.fromTo(
            uniforms.uTune,
            { value: 1 },
            {
              value: 0.22,
              duration: 0.95,
              ease: "rough({strength: 2, points: 24, template: power2.out, randomize: true})",
            },
            0.78
          );
          tl.to(uniforms.uTune, { value: 0, duration: 0.5, ease: "expo.out" }, 1.73);
          // lower third slides up; OSD chrome wakes
          tl.fromTo(
            lowerEl,
            { yPercent: 112 },
            { yPercent: 0, duration: 0.95, ease: "hsigSlide" },
            1.85
          );
          tl.fromTo(
            [tlEl, trEl],
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.5, stagger: 0.12, ease: "power2.out" },
            1.95
          );
          // punctuation tear on lock, then arm ambient glitches
          tl.call(
            () => {
              armed = true;
              nextTearAt = t + 2.5;
              burst(0.5);
              if (isTouch) scheduleTouchBurst();
            },
            undefined,
            2.3
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      rootEl.removeEventListener("pointerdown", onDown);
      window.clearTimeout(burstTO);
      window.clearTimeout(touchTO);
      window.clearTimeout(rsTO);
      offs.forEach((f) => f());
      ctx.revert();
      tex.dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, [fallback]);

  return (
    <section
      ref={root}
      id="hero"
      data-section-name="00 / SIGNAL"
      className="relative h-[100svh] min-h-[640px] overflow-hidden bg-bg"
    >
      {/* ── the tube: page's only WebGL context / test-card fallback ── */}
      {!fallback ? (
        <div ref={glWrap} aria-hidden="true" className="absolute inset-0 z-0">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      ) : (
        <div aria-hidden="true" className="hsig-testcard absolute inset-0 z-0" />
      )}

      {/* the visible name lives inside the shader texture — real h1 for SEO/AT */}
      {!fallback && (
        <h1 className="sr-only">
          UDAY PRATAP SINGH PARIHAR — FULL-STACK · RPA &amp; AUTOMATION ·
          REVERSE ENGINEERING
        </h1>
      )}

      {/* ── fallback test card: DOM type over CSS scanlines ── */}
      {fallback && (
        <div className="hsig-fade relative z-10 flex h-full flex-col justify-center pad-x pb-[15rem] pt-24 md:pb-56">
          <div className="mb-5 flex h-1.5 w-40 md:mb-7 md:w-56" aria-hidden="true">
            {TESTCARD_BARS.map((c) => (
              <span key={c} className="h-full flex-1" style={{ background: c }} />
            ))}
          </div>
          <h1 className="font-display font-bold leading-[.95] tracking-[-.03em] text-[2.8rem] md:text-[clamp(3rem,8.5vw,8rem)]">
            <span className="block">UDAY PRATAP</span>
            <span className="text-stroke block">SINGH PARIHAR</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:mt-6 md:text-[.65rem]">
            <span>Full-Stack</span>
            <span aria-hidden="true" className="text-accent">·</span>
            <span>RPA &amp; Automation</span>
            <span aria-hidden="true" className="text-accent">·</span>
            <span>Reverse Engineering</span>
          </div>
        </div>
      )}

      {/* ── broadcast OSD chrome ── */}
      <div
        ref={osdTL}
        aria-hidden="true"
        className="hsig-fade pointer-events-none absolute left-5 top-[5rem] z-20 flex items-center gap-2.5 font-mono text-[.6rem] uppercase tracking-[.22em] text-muted md:left-8 md:top-[5.5rem] md:text-[.65rem]"
      >
        <span className="inline-block h-[7px] w-[7px] border border-accent" />
        <span>
          CH 00 <span className="text-faint">·</span>{" "}
          <span className="text-text">SIGNAL</span>
        </span>
      </div>
      <div
        ref={osdTR}
        aria-hidden="true"
        className="hsig-fade pointer-events-none absolute right-5 top-[5rem] z-20 flex items-center gap-2.5 font-mono text-[.6rem] tracking-[.18em] text-muted md:right-8 md:top-[5.5rem] md:text-[.65rem]"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-accent3 animate-blink motion-reduce:animate-none" />
        <span className="text-accent3">REC</span>
        <span ref={dateRef} className="tabular-nums max-md:hidden">
          --.--.----
        </span>
        <span ref={clockRef} className="tabular-nums">
          --:--:-- IST
        </span>
      </div>

      {/* ── CHANNEL ACQUIRED flash (GL boot only) ── */}
      {!fallback && (
        <div
          ref={flashRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-center"
        >
          <div className="border border-accent/50 bg-bg/70 px-6 py-3.5 font-mono text-[.7rem] uppercase tracking-[.34em] text-accent md:px-8 md:text-[.8rem]">
            Channel acquired
          </div>
          <div className="mt-2.5 font-mono text-[.55rem] uppercase tracking-[.3em] text-faint">
            RF 671.25 MHz · AV-1
          </div>
        </div>
      )}

      {/* ── lower third: paragraph + CTAs on a translucent bar ── */}
      <div ref={lowerRef} className="hsig-fade absolute inset-x-0 bottom-0 z-20">
        <div className="border-t border-line bg-bg/55 backdrop-blur-md">
          <div className="pad-x flex flex-col gap-4 py-5 md:flex-row md:items-end md:justify-between md:gap-10 md:py-7">
            <div className="max-w-[54ch]">
              <div className="mb-2.5 flex items-center gap-2 font-mono text-[.52rem] uppercase tracking-[.3em] text-faint md:text-[.55rem]">
                <span
                  aria-hidden="true"
                  className="inline-block h-[6px] w-[6px] bg-accent3"
                />
                <span>Signal intrusion · live feed</span>
              </div>
              <p className="text-[.85rem] leading-[1.55] text-muted md:text-[clamp(.88rem,1.15vw,1rem)]">
                {COPY}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 md:items-center">
              <a
                href="#projects"
                data-cursor="hover"
                className="hsig-cta hsig-cta--main relative inline-flex flex-1 items-center justify-center overflow-hidden bg-accent px-5 py-3.5 font-mono text-[.6rem] uppercase tracking-[.2em] text-bg md:flex-none md:px-7 md:py-4 md:text-[.66rem] md:tracking-[.24em]"
              >
                <span className="hsig-cta-label relative z-10">
                  View case files
                </span>
                <span aria-hidden="true" className="hsig-cta-scan absolute inset-0" />
              </a>
              <a
                href="#contact"
                data-cursor="hover"
                className="hsig-cta inline-flex flex-1 items-center justify-center border border-line px-5 py-3.5 font-mono text-[.6rem] uppercase tracking-[.2em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent md:flex-none md:px-7 md:py-4 md:text-[.66rem] md:tracking-[.24em]"
              >
                Transmit
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hsig-testcard {
          background:
            radial-gradient(80% 60% at 50% 36%, rgba(124,92,255,.07), transparent 70%),
            repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px),
            #070709;
        }
        .hsig-cta-scan {
          background: repeating-linear-gradient(0deg, rgba(7,7,9,.28) 0 1px, transparent 1px 3px);
          opacity: 0;
          transition: opacity .25s var(--ease);
        }
        .hsig-cta--main:hover .hsig-cta-scan,
        .hsig-cta--main:focus-visible .hsig-cta-scan {
          opacity: 1;
        }
        @media (prefers-reduced-motion: no-preference) {
          .hsig-cta--main:hover .hsig-cta-label {
            animation: hsig-jolt .3s steps(2) 1;
          }
        }
        @keyframes hsig-jolt {
          0%   { transform: translateX(0); }
          33%  { transform: translateX(-2px); }
          66%  { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
