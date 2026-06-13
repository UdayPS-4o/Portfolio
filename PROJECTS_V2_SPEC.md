# PROJECTS V2 SPEC — 5 vertical-only "CASE FILES" candidates

Companion to `MYTHIC_SPEC.md` (read it first — tokens, fonts, voice, z-map).
This replaces the deleted V1 set. Five NEW designs for the Projects section,
specified so an implementer never guesses. The bar to beat is the current
homepage sticky-deck (`web/src/components/mythic/Projects.tsx`) — match or
exceed its craft.

## ⛔ HARD DIRECTION CHANGES FROM V1 (read twice)

1. **VERTICAL SCROLL ONLY.** No horizontal traverse, no pinned-horizontal
   panels, no x-axis "wall" or carousel of any kind on desktop OR mobile. Every
   variant advances on the y-axis. (The old "TRANSIT" horizontal concept is
   banned.)
2. **NO "DECLASSIFIED". NO classified/redaction/spy theming.** Remove that word
   entirely. No DECLASSIFIED chips, no redaction bars, no "decrypt", no
   "classified". The tone is **engineering / instrument / editorial**, not
   espionage. (If you need a status chip, use neutral engineering language:
   `SHIPPED`, `VERIFIED`, `RESULT`, a sheet/rev number — never "declassified".)
3. **Detail shown INLINE — no modal overlay.** Do NOT import or reuse
   `ProjectOverlay` (it contains the banned stamp). With only ~4 projects there
   is room to render full content (desc + ALL bullets + stack + highlight)
   inline within the section. No "read the full file" modal.
4. **Self-drive ALL animation** with your own `gsap.context(()=>{…}, rootRef)` +
   your own `ScrollTrigger`s. Do **NOT** rely on Chrome.tsx declarative
   attributes (`data-reveal`, `data-split-words`, `data-scramble`,
   `data-parallax`, `data-count`) — they are ABSENT in the audition lab
   (`/projects-lab` has no Chrome), so anything depending on them won't animate
   there. You MAY keep `data-cursor="hover"` / `data-cursor-label` for the
   homepage cursor (harmless no-op in the lab). Content must be readable with JS
   off (set hidden/offset states from JS only).

## 0. Shared foundation (ALL five)

### 0.1 Contract
- One file per variant, default export, no props, `"use client"`:
  - `web/src/components/mythic/projects/ProjectsSchematic.tsx`
  - `web/src/components/mythic/projects/ProjectsLedger.tsx`
  - `web/src/components/mythic/projects/ProjectsConsole.tsx`
  - `web/src/components/mythic/projects/ProjectsAtlas.tsx`
  - `web/src/components/mythic/projects/ProjectsMonolith.tsx`
- Each renders `<section id="projects" data-section-name="04 / CASE FILES">` so
  it drops into the homepage 1:1.
- Header: `@/components/mythic/SectionHeading` with `index="04"`,
  `title="CASE FILES"`, and the variant's `sub` (given per variant — must NOT
  contain "declassified").
- Data: `import { PROJECTS, type Project } from "@/lib/projects"`. Fields:
  `title, client?, year, role, image?, tagline?, desc (HTML w/ <strong>),
  bullets?[], highlight, stack[]`. Never hardcode copy. Render `desc` via
  `dangerouslySetInnerHTML`; style `strong` as `text-accent font-medium`. The 4
  images are SVG panels at `/assets/project-*.svg` (radar/lock, queue chart,
  dot-grid, candlesticks) — already technical-looking.
- Must stay correct for **3–8 projects** and a project with **no image**
  (placeholder recipe §0.4). Currently 4.

### 0.2 Confirmed shared signatures (exist on disk)
- `@/lib/mythic/motion`: `prefersReduced()`, `onBooted(cb)`, `getLenis()`,
  `lockScroll()`, `unlockScroll()` (ref-counted, pair them).
- `@/lib/mythic/magnetic`: `magnetize(el, strength=0.3)` → cleanup (no-ops on
  touch/reduced).
- `@/lib/mythic/text`: `GLYPHS`, `splitChars(el)` (.mchar, idempotent),
  `splitWords(el)` (.mword/.mword-inner, preserves nested `<em>/<strong>`),
  `scramble(el,{duration?,chars?,onComplete?})` → cancelFn.
- `@/components/mythic/SectionHeading` default `{index,title,sub?,className?}`.
- `@/components/mythic/VelocityMarquee` default `{items,className?,baseSpeed?,separator?}`.
- gsap 3.15 with ALL club plugins free: `gsap/ScrollTrigger`, `gsap/SplitText`,
  `gsap/ScrambleTextPlugin`, `gsap/DrawSVGPlugin`, `gsap/MorphSVGPlugin`,
  `gsap/Flip`, `gsap/Observer`, `gsap/ScrollToPlugin`, `gsap/CustomEase`,
  `gsap/CustomWiggle`, `gsap/Physics2DPlugin`. Register in `useEffect`.
- **No new npm deps. No WebGL** (hero owns the only context). DOM/SVG/Canvas-2D + GSAP.

### 0.3 Tokens & vocabulary
- Colors: `bg #070709`, `bg-soft #0e0e12`, `surface #131318`,
  `line rgba(255,255,255,.10)`, `text #ededf0`, `muted #8a8a93`,
  `faint #54545c`, `accent #ccff3d`, `accent2 #7c5cff`, `accent3 #ff5c7c`.
  **Accent is surgical.** Fonts: `font-display` (Space Grotesk), `font-body`
  (Inter), `font-mono` (JetBrains Mono).
- Display titles: `font-display font-bold tracking-[-.03em]`, lh .92–.95.
- Mono "OSD voice": `font-mono text-[.62rem] uppercase tracking-[.18em] text-muted`.
- Stack chips: `font-mono text-[.6rem] uppercase tracking-[.12em] border
  border-line rounded px-3 py-1.5 text-muted`, hover → `border-accent/60 text-text`.
- Easings: entrances `expo.out`/`power4.out`; wipes `expo.inOut`; magnetic
  return `elastic.out(1,.4)`; signature moves may use `CustomEase`. Durations:
  micro .2–.35s, reveals .7–1.1s.
- Helpers in globals: `.pad-x`, `.text-stroke`, `.diamond-list`, `.grain`,
  `--ease: cubic-bezier(.22,1,.36,1)`, `--pad`.

### 0.4 Missing-image placeholder (shared)
If `!project.image`: a `bg-bg-soft` panel with a repeating mono glyph watermark
(project initials + `0x` + `//`, ~10% white, 48px tile, −12° rotation), one
accent diagonal hairline, project title small-mono centered. Same in all five.

### 0.5 Universal requirements
- **Perf**: animate transform/opacity only (no layout thrash); cache rects;
  one `gsap.ticker`/rAF where you can; pause loops offscreen (IntersectionObserver)
  AND on `document.hidden`; full cleanup — `ctx.revert()`, kill ScrollTriggers,
  remove listeners, cancel rAF/IO. Use `gsap.matchMedia` for desktop/mobile/reduced splits.
- **prefers-reduced-motion**: branch early — no pins/scrubs/loops; content
  appears with at most simple fades, fully readable.
- **Mobile (<768)**: each variant's mobile treatment is specified; no horizontal
  overflow; tap targets ≥44px; no hover-only payoffs on touch.
- **A11y**: real `<button>`/heading/list semantics, `aria-label`s, visible
  focus-visible rings, keyboard parity. No focus traps needed (no modals).
- Component-scoped `<style>` with a unique prefix (`psc-`, `pld-`, `pcn-`,
  `pat-`, `pmn-`). Production TS, strict, compiles clean (correct gsap callback/
  ref/handler types, no unused imports).

### 0.6 Audition harness
`/projects-lab` will be rewritten by the integrator to mount these five via
`next/dynamic` with vertical scroll spacers above/below. You don't touch it.

---

## VARIANT A — "SCHEMATIC" · self-drafting engineering sheets  ⟶ the requested one

**Pitch**: each project is a technical engineering drawing that PLOTS ITSELF as
it scrolls into view — blueprint grid, titleblock, construction + dimension
lines drawn with DrawSVG, the image framed as a "detail view" with leader-line
callouts. Hairline precision; accent only on the plotter head + measurements.
File: `ProjectsSchematic.tsx`. `sub="engineering sheets · 04 drawings"`.

### A.1 Layout (desktop)
- Vertical stack of N "sheets", each a full-width section ~`min-h-[96vh]`,
  separated by a 1px `border-line` with corner registration ticks.
- Backdrop per sheet: a blueprint grid (CSS `repeating-linear-gradient`, 8px
  minor / 80px major at 3–4% white) that drifts ~6px on mouse parallax.
- Sheet grid: LEFT 7 cols = the drawing (title + annotations), RIGHT 5 cols =
  the "detail view" (framed image). A **titleblock** table pinned bottom-left
  (mono, bordered cells): `PROJECT / {title}`, `CLIENT / {client}`,
  `ROLE / {role}`, `YEAR / {year}`, `SHEET / 0X OF 0N`, `SCALE / 1:1`,
  `REV / 2.0`. Top-right corner: a thin-stroke reticle/gear SVG slowly rotating.

### A.2 The plot choreography (per sheet, ScrollTrigger `top 78%`, once)
A single timeline (~1.6s):
1. **Construction lines** (0–.4): two full-width hairlines (h/v) sweep in via
   DrawSVG `0→100%`, settling around the title baseline + image frame.
2. **Title plot** (.3–1.0): the title (display, `clamp(2.6rem,5.5vw,6rem)`,
   two lines if long) is revealed by an accent **plotter-head dot** racing along
   each baseline, leaving a `clip-path` inset wipe behind it (the letters appear
   in the dot's wake). Dot is a 6px accent circle with a faint trail.
3. **Dimension lines** (.6–1.2): DrawSVG dimension lines with arrowheads + mono
   measurements annotate real metrics pulled from the project (derive from
   stack/highlight/bullets — e.g. EHR → "UI-FREE", BMS → "1M+ QUEUED" /
   "50 SESSIONS", ecom → "≈2s" / "500+", trading → "NEXT BLOCK"). 2–3 per sheet.
4. **Detail view** (.7–1.3): the image frame draws its border (DrawSVG), the
   image fades/scales 1.04→1 inside, a corner "DETAIL A · SCALE 2:1" mono label
   stamps, and one **leader line** draws from a callout note (bullet #1, mono,
   bordered) to a point on the image.
5. **Tagline + desc + remaining bullets + stack** (1.0→): fade/rise in under the
   title (`y 20→0`, stagger .06). Show FULL desc, ALL bullets (as mono
   annotation notes with tiny diamond bullets), and stack chips.

### A.3 Interactions / life
- Mouse moves the blueprint grid parallax + a faint full-width crosshair that
  follows the cursor within the active sheet, with a mono coord chip
  (`X 0421 / Y 0285`). Desktop only.
- Idle: the reticle does a 90° snap every ~7s; one dimension measurement
  re-scrambles and resolves (`scramble`) every ~8s. IO + `document.hidden` gated.
- Whole sheet `data-cursor="hover"` (no modal — everything's inline).

### A.4 Mobile (<768)
Single column: titleblock becomes a compact mono header; the drawing plots with
construction lines + title clip-wipe + ONE dimension line (reduced density);
image detail-view full-width above the text; no crosshair/grid-parallax; tap
nothing (all inline). Reduced motion: everything pre-drawn static (full sheet
visible, no plot animation, no loops). **Hairline discipline** — 1px strokes,
white/10–25, accent only on plotter head + measurements + the active leader line.

---

## VARIANT B — "LEDGER" · vertical expanding spec-directory

**Pitch**: a clean engineering directory — a vertical list of N rows; the row in
focus EXPANDS inline to its full record (image + desc + all bullets + stack),
the rest stay collapsed. Single-open, driven by scroll position AND click. No
classified theming — think a precise spec sheet / changelog. File:
`ProjectsLedger.tsx`. `sub="4 records · expand to read"`.

### B.1 Layout
- A vertical list inside `pad-x`. Each row is a `<button>` (`role` semantics)
  spanning full width, `border-t border-line` (last also `border-b`).
- **Collapsed row** (height ~`clamp(5.5rem,11vh,8rem)`), grid
  `[index 56px][title 1fr][meta auto][+ 40px]`: mono index `0X`; title
  `clamp(1.6rem,3.4vw,3rem)` display; right mono meta `CLIENT · YEAR` over
  `ROLE`; a `+`/`−` toggle glyph (rotates on open).
- **Expanded body** (gsap height auto, `.55s expo.out`): a 12-col inner grid —
  cols 1–7 tagline (accent rule) + full desc + ALL bullets (diamond-list) +
  stack chips; cols 8–12 the image in a bordered viewport with a subtle
  scanline sweep + a mono `RESULT: {highlight}` caption strip. Inner content
  rises (`y 18→0`, stagger .05) after the height settles.

### B.2 Selection model
- One open at a time; first row open on mount (set from JS).
- **Scroll-driven**: as the section scrolls, the row nearest viewport center
  becomes the open one (hysteresis to avoid flicker) — feels like the ledger
  "reads itself" as you pass. **Click** toggles a row open (and closes others).
  Keyboard: Enter/Space toggles; ↑/↓ move focus between rows.
- On open: index flips accent, title slides x +.5rem, a `.text-stroke` ghost of
  the title drifts behind at opacity .12, the toggle rotates, row bg → `bg-soft`.

### B.3 Mobile (<768)
Same list, tap-to-toggle only (no scroll-driven open — too jumpy on touch),
expanded body stacks (image on top aspect 16/10, text below). One open at a time.
Reduced motion: instant open/close (no height tween), fades only.

### B.4 Perf/a11y
`aria-expanded`/`aria-controls`/`role="region"` on bodies; height-auto tween
re-set to `auto` onComplete for resize safety; debounce a `ScrollTrigger.refresh`
after toggles since the section height changes. One IntersectionObserver gates
the scroll-driven logic + scanline.

---

## VARIANT C — "CONSOLE" · sticky instrument bezel, channels tune through it

**Pitch**: a single fixed instrument console (bezel, corner brackets, telemetry
rails) that stays put while you scroll vertically; the project inside it TUNES
from one to the next — visual + title + stats swap with a CRT-ish channel-change
transition. The most "instrument panel" of the five, on-theme with the mythic
HUD. File: `ProjectsConsole.tsx`. `sub="4 channels · live readout"`.

### C.1 Structure
- Section height `N × 100vh` runway. Inside, a `position: sticky; top: 7vh`
  console, `h-[86vh]`, `border border-line rounded-lg bg-bg-soft/40
  backdrop-blur-[2px] overflow-hidden`, with:
  - **Bezel top bar** (mono): `CH 0X/0N` (left), center the project `title`
    small, right a live readout (`SIGNAL ███░ · {role}`) + blinking dot.
  - **Main viewport**: split — left 5 cols = the project image on a "scope"
    (faint scope grid overlay + scanlines + a sweeping reticle line), right 7
    cols = title `clamp(2.2rem,4vw,4.4rem)`, tagline (accent rule), desc (full),
    bullets (diamond), stack chips.
  - **Bottom telemetry rail** (mono, text-faint): scrolls
    `{client} · {year} · {highlight}` + a row of fake live values (deterministic
    per project; no scramble-spam — a gentle tick).
  - **Left vertical channel ladder**: `C01…C0N` ticks; the active one accent.

### C.2 Tune transition (scroll-driven channel change)
- Scroll position → active channel (thresholds at `i/N` with hysteresis). On
  change, ONE interruptible timeline (~.7s): outgoing content does a 2-frame
  horizontal "sync tear" + fades/streaks out (x small, NOT a full horizontal
  slide — it's an in-place glitch, not a traverse); a 120ms RGB-split flash;
  incoming title `scramble`-decodes, image cross-fades behind a quick scope-line
  wipe, stats/telemetry update. Reverse scroll tunes back (kill outgoing tl on
  re-trigger; last input wins).
- Click a channel ladder tick (or ↑/↓ when console ≥50% visible) seeks via
  `getLenis()?.scrollTo(runwayTop + i*100vh)` with a native-scroll fallback.

### C.3 Mobile (<768)
Console unpins; render each channel as a stacked card (bezel header, scope image
aspect 16/10, title, full content) in normal vertical flow — tap nothing, all
inline. The tune-glitch becomes a one-shot flicker on scroll-in. Reduced motion:
relative position, instant swaps, no scope sweep/flicker, no telemetry tick.

### C.4 Perf
Persistent DOM (one viewport, content swaps — don't remount per channel); one
timeline alive; scope sweep + telemetry on a single rAF, IO + hidden gated.

---

## VARIANT D — "ATLAS" · flowing editorial spreads

**Pitch**: an awwwards editorial layout — continuous vertical scroll, each
project an asymmetric full-bleed spread with massive type, parallax imagery, and
the highlight as a clean stamped pull-quote (caption `RESULT`, never
"declassified"). Flowing (not pinned/snapped). The most "magazine". File:
`ProjectsAtlas.tsx`. `sub="selected work · 04 entries"`.

### D.1 Composition (alternate per project, i even/odd)
Each spread ~`min-h-[110vh]`, generous whitespace:
- A giant index numeral `0X` in `.text-stroke` at `22vw`, opacity .06,
  `data-parallax`-style scrubbed via your OWN ScrollTrigger (moves slower than
  scroll).
- Title `clamp(2.8rem,7vw,7rem)` split into words, mask-rise on enter.
- Image: large (≈`58vw`/`46vw` alternating), parallax (image translates within
  an `overflow-hidden` frame, scrubbed −8%→8%), with a clip-path reveal wipe
  (`inset(0 0 100% 0)→inset(0)`, expo.out) on enter and a counter-scaling image.
- Text column: client/year/role mono row, tagline (display, accent rule), full
  desc, all bullets (diamond), stack chips.
- **Pull-quote**: the `highlight` as a large stamped statement — `border-l-2
  accent`, `font-display text-[clamp(1.4rem,2.4vw,2.2rem)]`, with a mono caption
  `RESULT` above. (This replaces the old DECLASSIFIED stamp energy with a clean
  editorial result callout.)
- Between spreads: a thin `VelocityMarquee` of that project's stack OR a hairline
  rule with a mono `// next` marker.

### D.2 Motion
Per-spread ScrollTriggers (own, not Chrome's): numeral parallax (scrub), title
word-rise (`top 82%`), image clip-reveal + counter-scale, text stagger
(`y 24→0`). Subtle scroll-velocity `skewY` on the image frame (clamp ±3deg,
lerp back). Hover the image: slow color/scale lift + a one-pass diagonal sheen
(desktop). Idle: none (editorial calm).

### D.3 Mobile (<768)
Single column, image-on-top per spread (aspect 4/3), numerals at 30vw opacity
.05, no skew/parallax (or very light), clip-reveal kept. Reduced motion: fades
only, no parallax/skew/sheen.

---

## VARIANT E — "MONOLITH" · full-viewport scroll-snap gallery

**Pitch**: one project fills the screen at a time — a vertical scroll-snap
gallery of immersive, image-dominant chapters with a bold entrance each. Gallery
/ exhibition feel; minimal text over big imagery, "read more" expands inline.
File: `ProjectsMonolith.tsx`. `sub="4 operations"`.

### E.1 Structure
- A vertical `scroll-snap` container is risky to nest under Lenis; instead use
  **regular vertical sections** (`min-h-[100svh]` each) and a per-section
  ScrollTrigger that pins NOTHING — the "snap" feel comes from each chapter
  filling the viewport with a strong enter/exit, not CSS snap. (If you do use CSS
  scroll-snap, scope it to the section and `data-lenis-prevent`-free; prefer the
  no-snap approach for Lenis compatibility.)
- Each chapter: full-bleed image (object-cover) as the backdrop with a
  bottom-up `bg` gradient scrim for legibility; content lower-third.

### E.2 Per-chapter choreography (own ScrollTrigger)
- **Enter** (`top 70%`): image clip-reveals (`inset` wipe) while counter-scaling
  1.12→1; a huge index numeral `0X` (display, `18vw`, `.text-stroke`) rises;
  title (`clamp(3rem,8vw,8rem)`) chars mask-rise; mono meta row fades.
- **Through** (scrubbed): the backdrop image parallaxes slowly (scale/position),
  selling depth as you pass; the numeral drifts.
- **Read-more**: a mono `+ DETAILS` button (bottom-right, magnetic) expands an
  inline panel (gsap height/opacity) over the lower portion with tagline, full
  desc, all bullets, stack, and `RESULT: {highlight}`. One open at a time;
  collapses on leaving the chapter.

### E.3 Mobile (<768)
Each chapter `min-h-[88svh]`, image backdrop, content lower third, title
`clamp(2.4rem,10vw,3.4rem)`; `+ DETAILS` expands inline; no parallax scrub
(static backdrop), keep the clip-reveal. Reduced motion: static chapters, fades,
no parallax, details still expandable.

### E.4 Perf/a11y
Backdrop parallax transform-only; images `loading="lazy"`; pause any sweep when
chapter offscreen; `+ DETAILS` is a real `<button aria-expanded>`; numerals
aria-hidden; titles are the `<h3>`s.

---

## 6. Notes for the integrator (me)
- Rewrite `/projects-lab` to mount: schematic, ledger, console, atlas, monolith
  (keys 1–5), each wrapped in ~55vh spacers; set `html.is-booted`.
- These are inline-detail (no ProjectOverlay), so no lockScroll/focus-trap needed.
- After all land: `tsc --noEmit`, then live-verify each in a real browser
  (scroll through; confirm vertical-only, no "declassified" anywhere, schematic
  plots, console tunes, ledger expands, atlas/monolith reveal).
- Build order (cheapest-first): LEDGER, ATLAS, MONOLITH, SCHEMATIC, CONSOLE.
