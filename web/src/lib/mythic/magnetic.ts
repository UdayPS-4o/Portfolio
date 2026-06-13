/**
 * mythic/magnetic — magnetic pull for buttons/links.
 * No-ops on touch devices and under prefers-reduced-motion, so callers
 * can attach unconditionally.
 */

import gsap from "gsap";

export function magnetize(el: HTMLElement, strength = 0.3): () => void {
  if (typeof window === "undefined") return () => {};
  if (
    window.matchMedia("(hover: none)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return () => {};
  }

  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - r.left - r.width / 2) * strength,
      y: (e.clientY - r.top - r.height / 2) * strength * 1.2,
      duration: 0.45,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  const onLeave = () => {
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: 0.9,
      ease: "elastic.out(1,0.4)",
      overwrite: "auto",
    });
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    gsap.killTweensOf(el, "x,y");
    gsap.set(el, { x: 0, y: 0 });
  };
}
