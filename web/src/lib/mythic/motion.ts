/**
 * mythic/motion — shared motion/scroll state.
 * Chrome.tsx owns the Lenis instance and calls setLenis(); everyone else
 * reads it via getLenis() and the lock helpers. All functions are SSR-safe.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let lenis: any = null;

export function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Run `cb` once the preloader has finished. Fires synchronously if
 * `<html>` already carries `.is-booted`, otherwise once on "mythic:booted".
 * Returns an unsubscribe function (safe to call either way).
 */
export function onBooted(cb: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.documentElement.classList.contains("is-booted")) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener("mythic:booted", handler, { once: true });
  return () => window.removeEventListener("mythic:booted", handler);
}

/** Called by Chrome only (pass null on teardown). */
export function setLenis(l: unknown): void {
  lenis = l;
}

/** The live Lenis instance, or null (reduced motion / before Chrome mounts). */
export function getLenis(): any | null {
  return lenis;
}

/* Ref-counted scroll lock so stacked overlays (palette over terminal, …)
   don't unlock each other early. */
let locks = 0;

export function lockScroll(): void {
  if (typeof document === "undefined") return;
  locks += 1;
  if (locks > 1) return;
  lenis?.stop?.();
  document.body.style.overflow = "hidden";
}

export function unlockScroll(): void {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  lenis?.start?.();
  document.body.style.overflow = "";
}
