"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { prefersReduced } from "@/lib/mythic/motion";

/**
 * HeroShader — the page's only WebGL context.
 * GPU particle field: simplex-noise flow displacement in the vertex shader,
 * mouse repulsion, depth/noise color mix between accent + accent2, additive
 * soft round points, gentle camera parallax. Pauses offscreen + on tab hide.
 * Reduced motion / WebGL failure → static gradient fallback.
 */

const VERT = /* glsl */ `
attribute float aRand;

uniform float uTime;
uniform vec2  uMouse;     // world-space xy at z=0
uniform float uRadius;    // repulsion radius (world units)
uniform float uHalfW;     // half visible width at z=0
uniform float uPixelRatio;
uniform float uSize;

varying float vMix;
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
  vec3 p = position;

  // slow conveyor drift with seamless wrap across the visible width
  float halfSpan = uHalfW * 1.25;
  p.x = mod(p.x + uTime * 0.22 + halfSpan, halfSpan * 2.0) - halfSpan;

  // pseudo-curl flow: three decorrelated noise fields drive the offset
  vec3 q = p * 0.16;
  float n1 = snoise(q + vec3(0.0,  uTime * 0.05, 0.0));
  float n2 = snoise(q + vec3(13.7, uTime * 0.045, 71.7));
  float n3 = snoise(q * 1.3 + vec3(uTime * 0.04, 37.1, 11.3));
  p += vec3(n1, n2, n3 * 0.6) * 1.35;

  // mouse repulsion (xy plane)
  vec2 d = p.xy - uMouse;
  float dist = length(d);
  float push = 1.0 - smoothstep(0.0, uRadius, dist);
  p.xy += (d / max(dist, 0.001)) * push * push * 1.9;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixelRatio * (uSize / -mv.z) * (0.55 + aRand * 0.9);

  vMix = clamp(0.5 + 0.45 * n2 + p.z * 0.08, 0.0, 1.0);
  vAlpha = (0.3 + 0.7 * aRand) * (0.55 + 0.45 * n1) + push * 0.35;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vMix;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.1, d) * vAlpha;
  gl_FragColor = vec4(mix(uColorA, uColorB, vMix), a * 0.85);
}
`;

export default function HeroShader({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (failed) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    if (prefersReduced()) {
      setFailed(true);
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
      setFailed(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    const CAM_Z = 14;
    camera.position.set(0, 0, CAM_Z);

    // visible extents at z=0 (used for spawn volume + mouse mapping)
    const view = { halfH: 1, halfW: 1 };
    const measure = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      view.halfH = Math.tan(THREE.MathUtils.degToRad(55 / 2)) * CAM_Z;
      view.halfW = view.halfH * camera.aspect;
      uniforms.uHalfW.value = view.halfW;
    };

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 12000 : 35000;

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRadius: { value: isMobile ? 1.6 : 2.3 },
      uHalfW: { value: 1 },
      uPixelRatio: { value: dpr },
      uSize: { value: isMobile ? 30.0 : 36.0 },
      uColorA: { value: new THREE.Color("#ccff3d") },
      uColorB: { value: new THREE.Color("#7c5cff") },
    };

    measure();

    // wide, shallow spawn volume
    const positions = new Float32Array(COUNT * 3);
    const rands = new Float32Array(COUNT);
    const spreadX = view.halfW * 1.25;
    const spreadY = view.halfH * 1.2;
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * spreadX;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * spreadY;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * 4;
      rands[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
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

    // ── mouse: NDC target, smoothed each frame in JS ──
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", measure);

    // ── render loop with offscreen / hidden-tab pausing ──
    let raf = 0;
    let running = false;
    let inView = true;
    let disposed = false;
    let t = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      uniforms.uTime.value = t;
      uniforms.uMouse.value.set(mouse.x * view.halfW, mouse.y * view.halfH);

      camera.position.x = mouse.x * 0.7;
      camera.position.y = mouse.y * 0.45;
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
    io.observe(wrap);

    const onVis = () => setRunning();
    document.addEventListener("visibilitychange", onVis);
    setRunning();

    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", measure);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [failed]);

  if (failed) {
    return (
      <div
        ref={wrapRef}
        aria-hidden="true"
        className={className}
        style={{
          background:
            "radial-gradient(60% 50% at 28% 38%, rgba(204,255,61,.08), transparent 70%)," +
            "radial-gradient(55% 60% at 74% 62%, rgba(124,92,255,.10), transparent 70%)",
        }}
      />
    );
  }

  return (
    <div ref={wrapRef} aria-hidden="true" className={className}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
