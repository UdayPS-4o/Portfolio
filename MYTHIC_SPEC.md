# MYTHIC SPEC — "uday.exe" control-room portfolio

Single source of truth for the v2 rebuild of the portfolio homepage. Every builder
agent reads this first and follows it exactly. The art direction: **a reverse
engineer's instrument panel** — the site feels like a precision tool that has been
cracked open: boot sequence, HUD readouts, case files, terminal access. Dark,
surgical, kinetic. Confidence through restraint: lots of black space, mono
annotations, one acid accent.

## 0. Hard rules

- Next.js 15 App Router, React 19, TypeScript. All new components are client
  components (`"use client"`).
- Styling: Tailwind utilities with the EXISTING tokens (below) + per-component
  `<style>{`...`}</style>` blocks using a unique class prefix for anything Tailwind
  can't express. **Never edit** `globals.css`, `tailwind.config.ts`, `layout.tsx`,
  `page.tsx`, or any file outside your assigned list. If you need truly global CSS,
  return it in your manifest's `globalCss` instead.
- Deps available: `gsap@^3.12` (core + public plugins only: ScrollTrigger, Observer,
  ScrollToPlugin — assume NO SplitText/ScrambleText club plugins), `lenis@^1.1`,
  `three@^0.160`. **Do not add npm dependencies. Do not run npm/tsc/build.**
- GSAP pattern: `gsap.registerPlugin(ScrollTrigger)` inside `useEffect`, wrap all
  animation setup in `gsap.context(() => {...}, rootRef)` and `return () => ctx.revert()`.
- **Never hide content with CSS initial states.** Set hidden/offset initial states
  from JS only (`gsap.set` / `fromTo`), so the page is fully readable without JS.
- Accessibility: respect `prefersReduced()` (skip scramble/parallax/pins, keep
  simple fades), semantic headings, aria-labels on interactive elements, visible
  focus styles in inputs/dialogs.
- Mobile first-class: every section must look intentional below 768px (no
  horizontal overflow, heavy effects reduced or replaced, `max-md:` variants).
  Custom-cursor-dependent affordances need a touch equivalent.
- Performance: max ONE WebGL context on the page (the hero owns it). All loops via
  `gsap.ticker` or rAF with cleanup. Pause canvases when offscreen
  (IntersectionObserver) and when `document.hidden`.
- Reference code style: look at existing `web/src/components/*.tsx` — match it.

## 1. Design tokens (already configured — use them)

Tailwind colors: `bg #070709`, `bg-soft #0e0e12`, `surface #131318`,
`line rgba(255,255,255,.10)`, `text #ededf0`, `muted #8a8a93`, `faint #54545c`,
`accent #ccff3d` (acid), `accent2 #7c5cff` (violet), `accent3 #ff5c7c` (rose).
Fonts: `font-display` (Space Grotesk), `font-body` (Inter), `font-mono`
(JetBrains Mono). Helpers that exist in globals.css: `.pad-x` (section padding),
`.text-stroke`, `.diamond-list`, `.grain`. CSS vars: `--accent`, `--accent-2`,
`--accent-3`, `--pad`, `--ease: cubic-bezier(.22,1,.36,1)`.
Easing: use `power4.out` for entrances, `expo` for wipes, `elastic.out(1,0.4)`
for magnetic returns. Durations: entrances .8–1.2s, hovers .3–.45s.

Type scale for section titles: `font-display font-bold tracking-[-.03em]
text-[clamp(2.8rem,8vw,7.5rem)] leading-[.92]`. Mono annotations:
`font-mono text-[.65rem] tracking-[.18em] uppercase text-muted`.

## 2. Page structure & section registry

`page.tsx` (written by the orchestrator, not you) mounts in order:

Preloader → Chrome → Nav → main: Hero(#hero) → About(#about) →
Capabilities(#capabilities) → Experience(#work) → Projects(#projects) →
Skills(#skills) → Contact(#contact) + Footer → CommandPalette → Terminal →
LivePresence (existing component, untouched).

Every `<section>` carries `id` and `data-section-name`:

| id | data-section-name | concept |
|----|-------------------|---------|
| hero | 00 / SIGNAL | shader hero |
| about | 01 / DOSSIER | who he is |
| capabilities | 02 / CAPABILITIES | what he does |
| work | 03 / TRACE LOG | experience timeline |
| projects | 04 / CASE FILES | featured projects |
| skills | 05 / ARSENAL | stack |
| contact | 06 / TRANSMIT | contact + footer |

Copy sources (reuse the real content, sharpened to fit the theme — do NOT invent
fake facts): `web/src/components/About.tsx`, `Capabilities.tsx`, `Experience.tsx`,
`Skills.tsx`, `Contact.tsx`, `Marquee.tsx`, and `web/src/lib/projects.ts`
(import `PROJECTS` from `@/lib/projects` — never copy project data inline).
Identity: **Uday Pratap Singh Parihar** — Full-Stack · RPA & Automation · Reverse
Engineering — Indore, India (IST).

## 3. Shared core API (lib/mythic) — exact contract

Built by the core agent; everyone else imports against these signatures.

```ts
// @/lib/mythic/text
export const GLYPHS: string; // "!<>-_\\/[]{}—=+*^?#@$%&░▒▓"
export function splitChars(el: HTMLElement): HTMLElement[];  // spans .mchar, idempotent, spaces -> &nbsp;
export function splitWords(el: HTMLElement): HTMLElement[];  // spans .mword wrapping .mword-inner, idempotent
export function scramble(el: HTMLElement, opts?: { duration?: number; chars?: string; onComplete?: () => void }): () => void;
// scramble: decodes el's text from random GLYPHS to the original (reads el.dataset.text ?? textContent,
// stores original into el.dataset.text on first run). Returns a cancel function. Safe to re-trigger.

// @/lib/mythic/magnetic
export function magnetize(el: HTMLElement, strength?: number): () => void; // default .3, returns cleanup

// @/lib/mythic/motion
export function prefersReduced(): boolean;
export function onBooted(cb: () => void): () => void; // fires immediately if <html>.is-booted, else once on "mythic:booted"; returns unsubscribe
export function setLenis(l: unknown): void;            // called by Chrome only
export function getLenis(): any | null;                // Lenis instance or null
export function lockScroll(): void;                    // lenis.stop() + body overflow hidden
export function unlockScroll(): void;
```

```tsx
// @/components/mythic/SectionHeading  (default export)
// Consistent section header. Renders: mono index/stamp row, huge display title
// (chars split + masked rise on scroll), optional right-aligned sub note.
type Props = { index: string; title: string; sub?: string; className?: string };

// @/components/mythic/VelocityMarquee (default export)
// Infinite marquee whose speed AND direction react to scroll velocity.
type Props = { items: string[]; className?: string; baseSpeed?: number; separator?: string };
```

## 4. Declarative effect attributes (handled globally by Chrome.tsx)

Section agents should lean on these instead of re-implementing common effects:

- `data-reveal` → fade-up in view (y:32→0, opacity, start "top 88%"). Optional `data-reveal-delay="0.2"`.
- `data-split-words` → word-mask stagger reveal in view.
- `data-scramble` → text scramble-decode when scrolled into view (once).
- `data-scramble-hover` → scramble on mouseenter (re-armable).
- `data-parallax="0.2"` → scrubbed y-parallax (value = strength, positive moves slower).
- `data-skew` → subtle skewY from scroll velocity (clamped ±4deg).
- `data-count="500" data-suffix="+"` → numeric counter on enter.
- `data-magnetic` (optional value = strength) → magnetic pull.
- `data-cursor="hover"` → cursor ring grows.
- `data-cursor-label="OPEN"` → cursor morphs into a labeled pill while over the element.
- `data-cursor-stick` → cursor ring snaps to the element's center (nav links).

Chrome initializes these AFTER boot (`onBooted`) and re-scans is NOT supported —
all sections render their markup on mount (no lazy-adding attributes).
Elements inside `#hero` are excluded from `data-reveal`/`data-split-words`
auto-handling (hero choreographs its own entrance).

## 5. Global events & z-index map

Window CustomEvents:
- `"mythic:booted"` — preloader finished (Preloader dispatches; also adds `is-booted` class to `<html>`).
- `"mythic:palette"` — toggle command palette. detail: `{ open?: boolean }`.
- `"mythic:terminal"` — toggle terminal. detail: `{ open?: boolean; cmd?: string }` (cmd = run this command on open).
- `"mythic:konami"` — Chrome dispatches on Konami code; Terminal listens and opens with a secret.

z-index: cursor 9999, grain 9000, preloader 1000, terminal 950, palette 900,
nav 800, HUD 700, project overlay 850. Overlays (palette/terminal/project detail)
must `lockScroll()` on open and `unlockScroll()` on close, close on ESC, and trap focus.

## 6. File ownership (write ONLY your files)

| Agent | Files |
|-------|-------|
| core | `web/src/lib/mythic/text.ts`, `web/src/lib/mythic/magnetic.ts`, `web/src/lib/mythic/motion.ts`, `web/src/components/mythic/Chrome.tsx`, `web/src/components/mythic/SectionHeading.tsx`, `web/src/components/mythic/VelocityMarquee.tsx` |
| hero | `web/src/components/mythic/Preloader.tsx`, `web/src/components/mythic/Hero.tsx`, `web/src/components/mythic/HeroShader.tsx` |
| projects | `web/src/components/mythic/Projects.tsx` (+ optional `ProjectOverlay.tsx`) |
| about | `web/src/components/mythic/About.tsx`, `web/src/components/mythic/Capabilities.tsx` |
| journey | `web/src/components/mythic/Experience.tsx`, `web/src/components/mythic/Skills.tsx` |
| contact | `web/src/components/mythic/Contact.tsx`, `web/src/components/mythic/Footer.tsx` |
| nav | `web/src/components/mythic/Nav.tsx`, `web/src/components/mythic/CommandPalette.tsx` |
| terminal | `web/src/components/mythic/Terminal.tsx` |

Import core via `@/lib/mythic/...` and `@/components/mythic/...` even though the
files may not exist yet while you work — the build happens after all agents land.

## 7. Manifest (what you return)

Return structured output: list of files written, `globalCss` (string, may be empty),
`notes` (mount/integration instructions, props, events used), `risks` (anything
the integrator should double-check). Keep notes terse and concrete.
