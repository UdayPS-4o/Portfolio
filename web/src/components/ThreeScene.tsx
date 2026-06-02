"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type ThreeMode = "globe" | "field" | "wave" | "tunnel" | "rings";

/** Soft round sprite so points glow instead of being square. */
function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const PALETTE = [new THREE.Color("#ccff3d"), new THREE.Color("#7c5cff"), new THREE.Color("#ff5c7c")];

/** Reusable particle backdrop with several 3D modes. Rebuilds when `mode` changes. */
export default function ThreeScene({ mode = "globe", className = "" }: { mode?: ThreeMode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !window.WebGLRenderingContext) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 8;

    const tex = makeSprite();
    const group = new THREE.Group();
    scene.add(group);
    const objects: THREE.Points[] = [];
    const meta: { spin: number }[] = [];

    const build = (pos: Float32Array, pick: (i: number) => THREE.Color, size: number) => {
      const n = pos.length / 3;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const c = pick(i);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const m = new THREE.PointsMaterial({
        size,
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true,
      });
      const p = new THREE.Points(g, m);
      group.add(p);
      objects.push(p);
      return p;
    };

    let count = 0;
    let base: Float32Array | null = null;

    if (mode === "globe") {
      count = 2600;
      const pos = new Float32Array(count * 3);
      const R = 3.1;
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        pos[i * 3] = Math.cos(phi) * r * R;
        pos[i * 3 + 1] = y * R;
        pos[i * 3 + 2] = Math.sin(phi) * r * R;
      }
      build(pos, (i) => PALETTE[i % 3], 0.07);
    } else if (mode === "field") {
      count = 1700;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * 11;
        pos[i * 3 + 1] = (Math.random() * 2 - 1) * 7;
        pos[i * 3 + 2] = Math.random() * 16 - 8;
      }
      build(pos, (i) => PALETTE[i % 3], 0.08);
    } else if (mode === "wave") {
      const gx = 90,
        gy = 56;
      count = gx * gy;
      const pos = new Float32Array(count * 3);
      base = new Float32Array(count * 3);
      let k = 0;
      for (let ix = 0; ix < gx; ix++)
        for (let iz = 0; iz < gy; iz++) {
          const x = (ix / (gx - 1) - 0.5) * 18;
          const z = (iz / (gy - 1) - 0.5) * 13;
          pos[k * 3] = x;
          pos[k * 3 + 2] = z;
          base[k * 3] = x;
          base[k * 3 + 2] = z;
          k++;
        }
      const p = build(pos, (i) => PALETTE[i % 3], 0.055);
      p.rotation.x = -0.95;
      p.position.y = -1.5;
    } else if (mode === "tunnel") {
      count = 2200;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = 3.2 + Math.random() * 0.8;
        pos[i * 3] = Math.cos(a) * rr;
        pos[i * 3 + 1] = Math.sin(a) * rr;
        pos[i * 3 + 2] = Math.random() * 34 - 22;
      }
      build(pos, (i) => PALETTE[i % 3], 0.07);
      camera.position.z = 11;
    } else if (mode === "rings") {
      const defs = [
        { R: 2.6, n: 620, rotX: Math.PI / 2.3, rotY: 0, spin: 0.0016 },
        { R: 3.6, n: 820, rotX: Math.PI / 3.4, rotY: 0.5, spin: -0.0012 },
        { R: 4.7, n: 1040, rotX: Math.PI / 5, rotY: -0.4, spin: 0.0009 },
      ];
      defs.forEach((d, idx) => {
        const pos = new Float32Array(d.n * 3);
        for (let i = 0; i < d.n; i++) {
          const a = (i / d.n) * Math.PI * 2;
          pos[i * 3] = Math.cos(a) * d.R;
          pos[i * 3 + 1] = Math.sin(a) * d.R;
          pos[i * 3 + 2] = (Math.random() * 2 - 1) * 0.05;
        }
        const p = build(pos, () => PALETTE[idx], 0.06);
        p.rotation.x = d.rotX;
        p.rotation.y = d.rotY;
        meta[objects.length - 1] = { spin: d.spin };
      });
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      if (mode === "globe") {
        group.rotation.y = t * 0.08 + mouse.x * 0.4;
        group.rotation.x = mouse.y * 0.25;
        group.scale.setScalar(1 + Math.sin(t * 0.6) * 0.03);
      } else if (mode === "field" || mode === "tunnel") {
        const arr = objects[0].geometry.attributes.position.array as Float32Array;
        const speed = mode === "tunnel" ? 0.07 : 0.02;
        const lim = mode === "tunnel" ? 11 : 8;
        const wrap = mode === "tunnel" ? -22 : -8;
        for (let i = 0; i < count; i++) {
          arr[i * 3 + 2] += speed;
          if (arr[i * 3 + 2] > lim) arr[i * 3 + 2] = wrap;
        }
        objects[0].geometry.attributes.position.needsUpdate = true;
        if (mode === "tunnel") {
          group.rotation.z = t * 0.05;
          camera.position.x = mouse.x * 0.6;
          camera.position.y = mouse.y * 0.6;
          camera.lookAt(0, 0, 0);
        } else {
          group.rotation.y = mouse.x * 0.18;
          group.rotation.x = mouse.y * 0.12;
        }
      } else if (mode === "wave") {
        const p = objects[0];
        const arr = p.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          const x = base![i * 3];
          const z = base![i * 3 + 2];
          arr[i * 3 + 1] = Math.sin(x * 0.5 + t) * 0.6 + Math.cos(z * 0.5 + t * 0.8) * 0.6;
        }
        p.geometry.attributes.position.needsUpdate = true;
        group.rotation.y = mouse.x * 0.2;
      } else if (mode === "rings") {
        objects.forEach((p, i) => {
          p.rotation.z += meta[i]?.spin ?? 0.001;
        });
        group.rotation.y = t * 0.05 + mouse.x * 0.3;
        group.rotation.x = mouse.y * 0.2;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      objects.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      tex.dispose();
      renderer.dispose();
    };
  }, [mode]);

  return <canvas ref={ref} className={`pointer-events-none ${className}`} />;
}
