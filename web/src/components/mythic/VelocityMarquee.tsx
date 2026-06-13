"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { getLenis, prefersReduced } from "@/lib/mythic/motion";

type Props = {
  items: string[];
  className?: string;
  /** base drift in px/s (scroll velocity multiplies it) */
  baseSpeed?: number;
  separator?: string;
};

const COPIES = 4; // track = 4 identical groups; shifting one group width == seamless wrap

export default function VelocityMarquee({
  items,
  className = "",
  baseSpeed = 90,
  separator = "◆",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const group = groupRef.current;
    if (!wrap || !track || !group) return;
    if (prefersReduced()) return; // static, readable row

    let groupW = group.offsetWidth || 1;
    const ro = new ResizeObserver(() => {
      groupW = group.offsetWidth || 1;
    });
    ro.observe(group);

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: "120px" }
    );
    io.observe(wrap);

    const setX = gsap.quickSetter(track, "xPercent");
    const wrapX = gsap.utils.wrap(-100 / COPIES, 0);

    let x = 0; // accumulated xPercent
    let dir = 1; // lerped direction (1 = leftwards drift)
    let boost = 0; // lerped |velocity| multiplier
    let lastY = getLenis()?.scroll ?? window.scrollY;

    const tick = (_time: number, deltaMs: number) => {
      const y = getLenis()?.scroll ?? window.scrollY;
      if (!visible || document.hidden) {
        lastY = y;
        return;
      }
      const dt = Math.min(deltaMs, 100) / 1000; // clamp tab-switch spikes
      if (dt <= 0) return;

      const vel = (y - lastY) / dt; // px/s
      lastY = y;

      // direction follows scroll direction, holds the last one when idle
      const targetDir = vel < -40 ? -1 : vel > 40 ? 1 : dir >= 0 ? 1 : -1;
      dir += (targetDir - dir) * Math.min(1, dt * 4);

      const targetBoost = Math.min(Math.abs(vel) / 300, 4);
      boost += (targetBoost - boost) * Math.min(1, dt * 5);

      const pxPerSec = baseSpeed * (1 + boost);
      x -= ((dir * pxPerSec * dt) / groupW) * (100 / COPIES);
      setX(wrapX(x));
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      gsap.set(track, { xPercent: 0 });
    };
  }, [baseSpeed]);

  const renderGroup = (copy: number) => (
    <div
      key={copy}
      ref={copy === 0 ? groupRef : undefined}
      className="flex shrink-0 items-center"
      aria-hidden={copy > 0 || undefined}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-[1.1em]">{item}</span>
          <span className="text-[.55em] text-accent" aria-hidden="true">
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className={`overflow-hidden whitespace-nowrap ${className}`}
      aria-label={items.join(" · ")}
    >
      <div ref={trackRef} className="flex w-max items-center will-change-transform">
        {Array.from({ length: COPIES }, (_, i) => renderGroup(i))}
      </div>
    </div>
  );
}
