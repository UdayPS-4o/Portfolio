# PROJECTS VARIANTS SPEC — 5 candidate designs for "04 / CASE FILES"

Companion to `MYTHIC_SPEC.md` (read that first — tokens, fonts, voice, z-map,
event contracts all bind here too). This document specifies **five complete,
mutually distinct designs** for the Projects section, in enough detail that an
implementer can build any of them without making design decisions. The current
production design (sticky card deck in `web/src/components/mythic/Projects.tsx`)
is the baseline to beat — none of these may resemble it.

---

## 0. Shared foundation (applies to ALL five variants)

### 0.1 Contract

- One file per variant, default export, no required props, `"use client"`:
  - `web/src/components/mythic/projects/Projects01Index.tsx`
  - `web/src/components/mythic/projects/Projects02Transit.tsx`
  - `web/src/components/mythic/projects/Projects03Archive.tsx`
  - `web/src/components/mythic/projects/Projects04Playback.tsx`
  - `web/src/components/mythic/projects/Projects05Vault.tsx`
- Each renders `<section id="projects" data-section-name="04 / CASE FILES">`
  so it can replace the current Projects component on the homepage 1:1.
- Section header: reuse `@/components/mythic/SectionHeading` with
  `index="04"`, `title="CASE FILES"`, and a variant-specific `sub` (given below).
- Data: `import { PROJECTS, Project } from "@/lib/projects"`. Fields:
  `title, client?, year, role, image?, tagline?, desc (HTML with <strong>),
  bullets?[], highlight, stack[]`. Currently 4 projects; **every layout must
  remain correct for 3–8 projects** (rules for extra items given per variant).
- Never hardcode project copy. `desc` renders via `dangerouslySetInnerHTML`;
  style `strong` as `text-accent font-medium` everywhere.
- Available libs: gsap 3.15 (ALL plugins free: ScrollTrigger, SplitText,
  ScrambleTextPlugin, DrawSVGPlugin, MorphSVGPlugin, Flip, CustomEase,
  Physics2D…), Lenis (via `getLenis()` from `@/lib/mythic/motion`),
  `magnetize` from `@/lib/mythic/magnetic`, `scramble/splitChars/splitWords`
  from `@/lib/mythic/text`. **No new npm deps. No WebGL** — the hero owns the
  page's only WebGL context; these variants win with DOM/SVG/Canvas-2D craft.
- Chrome.tsx global systems exist: custom cursor (`data-cursor="hover"`,
  `data-cursor-label="OPEN"`), declarative attrs (`data-reveal`,
  `data-split-words`, `data-scramble`, `data-parallax`, `data-count`,
  `data-magnetic`), film grain overlay, HUD. Use them; don't duplicate them.
- Overlays: z-850, must call `lockScroll()/unlockScroll()` (ref-counted, call in
  pairs), close on ESC + backdrop + X, trap focus, restore focus to the opener.
  Inner scrollable region gets `data-lenis-prevent`.
- Scoped styles: per-component `<style>` blocks with a unique class prefix
  (`p1x-`, `p2x-`, `p3x-`, `p4x-`, `p5x-`). Never edit globals.css.
- No CSS-hidden initial states — set hidden/offset states from JS only, so the
  section is fully readable without JS.

### 0.2 Type & spacing constants (shared vocabulary)

- Display titles: `font-display font-bold tracking-[-.03em]` at the clamp given
  per variant; line-height .95 unless stated.
- Mono annotation: `font-mono text-[.62rem] uppercase tracking-[.18em] text-muted`
  (the "OSD voice"); values/fields in `text-faint` unless active.
- Meta chips (stack): `font-mono text-[.6rem] uppercase tracking-[.12em]
  border border-line rounded px-3 py-1.5 text-muted`, hover → border-accent/60
  text-text (0.3s).
- Hairlines: `border-line` (rgba 255,255,255,.10); active hairlines accent.
- Standard easings: entrances `expo.out` / `power4.out`; wipes `expo.inOut`;
  elastic returns `elastic.out(1,0.4)`; "machine" snaps `steps(1)` or
  `back.out(1.8)` at ≤0.3s. Durations: micro 0.2–0.35s, reveals 0.7–1.1s.

### 0.3 Shared case-detail overlay ("THE RECORD") — used by variants 01, 02, 04, 05

One spec, implemented per-variant (copy the structure; variant may add its
signature garnish):

- **Backdrop**: fixed inset-0, `bg-bg/92 backdrop-blur-[6px]`, fade 0.25s.
- **Panel**: full-viewport on mobile; desktop `inset-x-[6vw] inset-y-[5vh]`
  `bg-bg-soft border border-line rounded-lg overflow-hidden`; enters y 6% →
  0 + opacity, 0.5s expo.out. Internal layout 12-col grid, `pad: clamp(1.5rem,3vw,3.5rem)`.
- **Left rail** (cols 1–3, border-r border-line, mono): `FILE 0X/0N`,
  CLIENT, YEAR, ROLE as label/value pairs (labels text-faint, values text-text);
  a rotated −4° "DECLASSIFIED" chip (border accent3, text accent3,
  text-[.55rem] tracking-[.3em]); below, the stack chips stacked vertically.
- **Body** (cols 4–12, scrollable, `data-lenis-prevent`): title
  `clamp(2.2rem,4.5vw,4.2rem)`; tagline as an accent-ruled line (2px accent rule
  40px wide + italic-feel sentence); full `desc`; ALL bullets in the
  `.diamond-list` style; **highlight** as a stamped pull-quote — border-l-2
  accent, `font-display text-[1.4rem]`, mono caption "PRIMARY RESULT" above.
- **Hero visual**: project image (or placeholder, §0.4) as a 21/9 banner at the
  top of the body, accent reveal-wipe on open (scaleY origin bottom, 0.6s).
- **Close**: X top-right (magnetic, `data-cursor="hover"`), ESC, backdrop click.
- **Content cascade on open**: rail items stagger 0.05, body blocks y 24 →
  0 stagger 0.07 starting 0.15s after panel lands.
- Open state lives in the variant root (`selected: Project | null`).

### 0.4 Missing-image placeholder (shared recipe)

If `project.image` is falsy: render a `bg-bg-soft` panel filled with a CSS
repeating mono glyph watermark (the project's initials + `0x` + `//` at 10%
white, 48px tile, −12° rotation), one accent diagonal hairline corner-to-corner,
and the project title set small in mono at the center. Identical recipe in all
variants so adding a project without art never looks broken.

### 0.5 QA checklist (run for whichever variant ships)

1. 4 projects render with real copy; add a fake 5th in dev to verify scaling.
2. Keyboard-only pass: reach every project, open/close detail, no focus loss.
3. `prefers-reduced-motion`: no pins, no loops, content readable instantly.
4. 375px width: no horizontal overflow, all text legible, tap targets ≥44px.
5. Scroll up THROUGH the section: pinned variants must scrub backwards clean.
6. Resize mid-scroll: ScrollTrigger.refresh() leaves no dead zones.
7. Open overlay, scroll inside, close — page scroll position unchanged.
8. CPU throttle 4×: scrub stays ≥45fps (transforms only — no layout/paint storms).

### 0.6 Audition harness

Mirror `/hero-lab`: a `/projects-lab` client page that mounts the five variants
via `next/dynamic` with a bottom-center switcher (keys 1–5, R = replay).
Because these are scroll-driven sections, the lab page must render filler
blocks (~60vh mono-annotated spacers) above and below the active variant so
pin/scrub choreography can actually run. Set `html.is-booted` on mount.

---

## VARIANT 01 — "INDEX" · the stalked evidence ledger

**Pitch**: the section as a cold case index — four enormous typographic rows,
and a live "evidence preview" panel that stalks the cursor like a surveillance
feed. The drama is typography + the chase; zero pinning, so it reads fast and
ships safest. `SectionHeading sub: "4 records · hover to surveil"`.

### 1.1 Composition (desktop ≥1280)

- Rows stacked full-width inside `pad-x`. Each row: `min-h-[22vh]`,
  `border-t border-line`, last row also `border-b`. Grid per row:
  `[index 64px] [title 1fr] [meta 220px] [arrow 48px]`, items center-aligned
  vertically, `py-10`.
- **Index**: mono `text-[.7rem] text-faint`, `0X` zero-padded; flips to accent
  + `▸` prefix when its row is active.
- **Title**: `clamp(2.6rem,6.5vw,6rem)`, one line, `whitespace-nowrap` with
  `text-overflow: clip` forbidden — if a title would overflow at the clamp,
  allow wrap to 2 lines and the row grows (test with "High-Concurrency
  Ticketing", the longest).
- **Meta column** (right-aligned mono stack): line 1 `CLIENT · YEAR`
  (text-muted), line 2 `ROLE` (text-faint).
- **Arrow**: `→` glyph in a 40px bordered square; rotates −45° and fills
  accent/10 on row hover.
- Between heading and rows: a mono "table header" strip — `NO. / OPERATION /
  ORIGIN / ACTION` aligned to the grid columns, text-faint, border-b.

### 1.2 The stalker preview (signature)

- A fixed-position panel `w-[340px] aspect-[4/3] rounded border border-line
  overflow-hidden z-[650]` (under HUD 700, above content) — `pointer-events-none`.
- Follows the cursor with lerp 0.12 (gsap.ticker), offset +28px x / −20px y
  from pointer; clamps 16px inside viewport edges.
- **Rotation by velocity**: panel rotates `clamp(vx * 0.04, −6, 6)` degrees and
  skews X by half that; eases back to 0 when still (power3.out 0.5s) — the
  panel feels like it's being dragged on a tether.
- Hidden (opacity 0, scale .92) until the first row hover; entering any row
  fades/scales it in 0.25s back.out(1.7).
- **Image swap on row change**: incoming image wipes in via
  `clip-path inset(0 0 100% 0) → inset(0)` 0.35s expo.out over the old one;
  during the first 120ms an RGB-split echo (two absolutely-stacked tinted
  copies, accent2/accent3, mix-blend-screen, ±5px x) flashes and collapses.
- Panel chrome: top-left mono chip `CAM 0X` (X = row index), bottom a 1-line
  mono ticker of the project's `highlight` scrolling at 40px/s, top-right a
  blinking 6px accent3 REC dot. A scanline sweep (1px white/10 gradient)
  traverses the panel every 4s.

### 1.3 Row interactions

- **Hover** (the row is one `<button>` spanning the grid):
  1. all sibling rows tween to opacity .35 (0.3s power2) — spotlight effect;
  2. title slides x +1.25rem and a `.text-stroke` ghost duplicate of the title
     slides from x 0 to −1.25rem behind it at opacity .25 (both 0.45s expo);
  3. meta lines scramble-decode (ScrambleTextPlugin, 0.4s, glyphs from
     `GLYPHS`);
  4. index flips to accent with a 1-frame `steps(1)` color cut;
  5. row background tints `bg-bg-soft` via a scaleY(0→1, origin bottom, 0.35s)
     pseudo-layer, not a background transition.
- **Unhover**: everything returns in 0.4s; preview stays armed for next row.
- **Click/Enter** → shared overlay (§0.3). Cursor over rows shows the
  `data-cursor-label="OPEN"` pill.
- **Focus-visible** (keyboard): row gets a 1px accent outline-offset ring; the
  preview docks (no cursor to follow) at fixed right `right-[6vw]`,
  vertically centered, same swap choreography.

### 1.4 Entrance choreography

On scroll into view (per row, trigger `top 85%`, once): the row's top border
draws (scaleX 0→1, origin left, 0.8s expo.out), then title rises inside an
overflow mask (yPercent 110→0, 0.9s power4.out, 0.05s after border), index +
meta + arrow fade y 16→0 (0.5s, +0.15s). Rows naturally stagger by scroll
position. The table-header strip scrambles in first.

### 1.5 Mobile (<768)

No stalker (touch). Each row becomes a two-line block: `[0X · CLIENT · YEAR]`
mono line, title `clamp(1.9rem,8vw,2.6rem)` wrapping freely, and a 96px-tall
inline image strip (full-bleed, grayscale 60%, right-aligned 40% width) that
sits behind the title at opacity .5. Tap → overlay. Spotlight dimming disabled.

### 1.6 Reduced motion / perf / edges

- Reduced: no preview-follow (focus/hover shows the docked preview statically,
  fade only), no scramble (instant text), borders pre-drawn.
- Perf: one gsap.ticker fn for the follow; rect math cached; preview image
  elements pre-created per project (display toggled, not re-mounted).
- 5–8 projects: rows just stack; preview `CAM 0X` counts up; no other change.

---

## VARIANT 02 — "TRANSIT" · the horizontal evidence wall

**Pitch**: the section pins and the case files travel horizontally — a wall of
evidence panels gliding past a fixed camera, with snap stops at each panel.
The most "awwwards" of the five; maximal spatial drama.
`SectionHeading sub: "lateral traverse — 4 stations"`.

### 2.1 Structure & scroll math

- DOM: `section > heading (normal flow)` then a `pin-wrap` div `h-[100vh]
  overflow-hidden` containing a flex `track` of N panels.
- Panel size `w-[84vw] h-[78vh]`, gap `4vw`, track left-padded `8vw` and
  right-padded `8vw` so first/last panels can center.
- ScrollTrigger: `trigger: pin-wrap, start: "top top", end: () => "+=" +
  (track.scrollWidth - innerWidth), pin: true, scrub: 1, snap: { snapTo:
  1/(N-1), duration: {min:.3,max:.6}, ease: "power2.inOut" }`. Track tween:
  `x: -(scrollWidth - innerWidth), ease: "none"`.
- **Velocity skew**: a quickTo on track `skewX`, fed
  `clamp(self.getVelocity()/-350, -3.5, 3.5)` each onUpdate, lerping to 0 —
  panels shear with momentum.
- Re-measure on `ScrollTrigger.refresh` (resize, font load).

### 2.2 Panel anatomy (each = one case)

12-col internal grid, `bg-bg-soft border border-line rounded-lg overflow-hidden`:

- **Cols 1–7 (content)**, padded `clamp(1.5rem,3vw,3rem)`:
  mono meta row (`FILE 0X/0N · CLIENT · YEAR · ROLE`, dots in accent);
  title `clamp(2.4rem,4.5vw,4.6rem)` (2-line max);
  tagline with the 40px accent rule;
  desc clamped to 3 lines (CSS line-clamp) — full text lives in the overlay;
  first 2 bullets only, diamond-list;
  stack chips row;
  a bordered `OPEN RECORD →` mono button (magnetic) bottom-left.
- **Cols 8–12 (visual)**: image `object-cover h-full` with: a slow Ken-Burns
  scrub (scale 1.08→1 across the panel's traverse, tied to track progress),
  a scanline sweep every 5s, and on hover a 3-slice chromatic jitter (three
  clip-path bands offset ±6px x, accent2/accent3 tints, 0.4s loop while
  hovered; desktop only).
- **Giant ghost numeral**: behind each panel's content, `0X` in
  `text-stroke` at `28vw`, opacity .06, translating at 1.35× track speed
  (parallax — it overtakes the panel as you scroll).
- Whole panel `data-cursor-label="OPEN"`; click → shared overlay.

### 2.3 Progress chrome (fixed inside the pin)

- Top-right mono counter `0X / 0N` — cross-fades digits on snap (old digit
  yPercent −100, new from +100, 0.3s expo, overflow mask).
- Bottom: full-width 2px rail (white/10) with accent fill scaleX = progress
  (scrub-linked), plus N diamond markers (◆) at snap points that flip accent
  when passed.
- Left edge: a vertical mono label `TRAVERSE //: CASE FILES` reading upward,
  fixed, opacity .4.
- Edge fog: 6vw gradient (bg → transparent) on both edges, above panels,
  below chrome — sells depth as panels enter/exit.

### 2.4 Per-panel activation

Track each panel's visibility against the viewport center (onUpdate math, no
extra triggers): the centered panel is **active** — its title chars decode
(ScrambleText 0.6s, once per arrival direction), its border brightens to
white/25, inactive panels sit at opacity .75 / scale .97 (tweened 0.4s). The
heading's mono stamp updates to the active project's client name.

### 2.5 Entrance / exit

Approaching the pin: heading reveals normally (SectionHeading behavior).
The first panel starts pre-offset x +12vw at opacity 0 and slides to rest
during the first 8% of the scrub (composed into the master tween with a
nested timeline, not a separate trigger). Exiting: the last panel decelerates
naturally into the snap; after the pin releases, a thin accent hairline
(scaleX wipe) closes the section.

### 2.6 Mobile (<768)

**No pin.** A native horizontal snap carousel: `overflow-x-auto snap-x
snap-mandatory` track, panels `w-[86vw] snap-center`, same anatomy stacked
(visual on top, aspect 16/10; content below; desc 2-line clamp). A mono
`→ SWIPE` hint with a nudge animation (x 0→8→0, 3 loops then stops). Progress
dots (◆) under the carousel driven by scroll-position listener. Velocity skew,
ghost numerals at 12vw opacity .05 static. Tap → overlay.

### 2.7 Reduced motion / perf / edges

- Reduced: no pin, panels stack vertically at 90% width with simple fades; all
  content (full desc) shown inline since the traverse is gone.
- Perf: the track is ONE tween; everything else hangs off `onUpdate`; images
  `loading="lazy"`; will-change transform on track + ghost numerals only.
- 5–8 projects: traverse end recalculates from scrollWidth; snap divisor N−1;
  chrome counters use 0N. Pin length grows linearly — acceptable to 8.
- Gotcha for implementer: pin must not live inside any transformed ancestor;
  verify against Capabilities' ghost-word section above it.

---

## VARIANT 03 — "ARCHIVE FS" · the decryption file browser

**Pitch**: a fake filesystem console — file tree on the left, and selecting a
case "decrypts" it in the right pane: redaction bars slide off, metadata
types in, the image de-classifies. The most narrative, persona-perfect
variant; scroll OR click drives selection. `SectionHeading sub: "~/cases — ls
-la · decrypt enabled"`.

### 3.1 Structure

- Section height `N × 90vh` (scroll runway). Inside, a **console** that pins
  via `position: sticky; top: 6vh`, `h-[88vh]`, `border border-line rounded-lg
  bg-bg-soft/40 backdrop-blur-[2px] overflow-hidden`, split:
  - **Title bar** (h-11, border-b border-line, mono): traffic dots (reuse the
    terminal's), center `~/cases — 4 objects · aes-256 · MOUNTED`, right a
    blinking block caret.
  - **Left pane** `w-[34%] min-w-[260px] border-r border-line` — the tree.
  - **Right pane** flex-1 — the viewer.
  - **Status ticker** (h-8, border-t, mono, text-faint): scrolls
    `DECRYPTING SECTOR 0X/0N — CHECKSUM 0x{rand} OK — KEY ACCEPTED`, values
    scrambling during transitions, steady-state shows the active project's
    `highlight`.

### 3.2 Selection model

- Scroll position within the section maps to selection: thresholds at
  `i/N ± hysteresis 8vh` — crossing a threshold switches the active file.
- Clicking a tree row (or ↑/↓ when the console is in view, Home/End) calls
  `getLenis().scrollTo(sectionTop + i * 90vh + 1px)` so scroll state and
  selection never diverge. Keyboard events only bind while the console is
  ≥50% visible (IO-gated) and never steal keys from inputs.
- Rapid switching: the decrypt timeline for the outgoing selection is
  `.progress(1).kill()`ed before the new one builds — last input wins, no queue.

### 3.3 The tree (left pane)

Each row, mono `text-[.78rem] leading-9`, grid `[16px caret][1fr name][72px
size][56px tag]`:

```
▸ case-001_ehr.bin            42.7KB  [RE]
▸ case-002_queue.exe          1.2MB   [RPA]
▸ case-003_factory.sh         866KB   [AUTO]
▸ case-004_mirror.sol         313KB   [CHAIN]
```

- Filenames generated from title slug; sizes faked deterministically
  (`(title.length * 1337) % 999` formatted); tag from role's first word.
- **Active row**: caret rotates 90° (0.25s back.out), name flips accent,
  row gets `bg-white/[.04]` + a 2px accent left bar (scaleY in), and a block
  cursor `▌` blinks at the end of the name.
- Inactive hover: name brightens to text-text; cursor `data-cursor="hover"`.
- Below the rows: `.. (parent)` and a faint `drwxr-x--- uday ops` permissions
  line — set dressing, aria-hidden.
- Rows are real `<button role="option" aria-selected>` inside a
  `role="listbox"` with `aria-label="Case files"`.

### 3.4 The viewer decrypt choreography (signature)

On selection change, a single timeline (~1.15s total, interruptible):

1. **Collapse out** (0–0.25s): the previous document's text blocks become
   black redaction bars — each paragraph/bullet gets an absolutely-positioned
   `bg-black` bar that scaleX-grows over it from its left edge (0.18s,
   stagger 0.02), then the whole pane drops 12px + fades.
2. **Header stamp** (0.25–0.5s): mono field table types in, 4 cells
   (`FILE / CLIENT / YEAR / ROLE`) each value scramble-decoding (0.3s,
   stagger 0.06); a rotated `DECLASSIFIED` chip stamps (scale 1.4→1 +
   opacity, back.out(2), 0.25s) top-right.
3. **Title decode** (0.4–1.0s): title at `clamp(2rem,3.6vw,3.4rem)` via
   ScrambleText, left-to-right resolve.
4. **Un-redaction** (0.55–1.0s): `desc` renders pre-covered by black bars
   (one per line-ish block — acceptable to bar the whole paragraph in 3
   horizontal strips); bars slide off to the right (x → 110%, 0.3s expo.in,
   stagger 0.08) revealing text. `<strong>` spans flash accent for 200ms as
   they're revealed, then settle.
5. **Terminal bullets** (0.7s→): each bullet types as a `> ` prefixed mono
   line, 14ms/char, accent `>`; cap at 4 bullets, rest live in… no overlay in
   this variant — show ALL bullets (the viewer is the detail view).
6. **Visual declassify** (parallel, 0.6s): the image panel (right 40% of the
   viewer, or full-width banner if narrow) reveals via the accent overlay
   wipe (scaleY origin bottom), then a one-pass scanline sweep.
7. **Footer** (1.0s): stack chips stamp in (scale .9→1, back.out, stagger
   0.05) and the highlight line slides into the status ticker.

- A **hex gutter** runs down the viewer's left edge: `0x0000, 0x0040, 0x0080…`
  every ~96px, text-faint/50, aria-hidden; it re-randomizes its glyph noise
  during transitions (scramble 0.3s).
- The viewer root is `aria-live="polite"` via an offscreen text node
  announcing "Case 0X decrypted: {title}" after the timeline completes.

### 3.5 Mobile (<768)

The console unpins entirely. Render an **accordion**: each file row (tree
style, full-width, taller py-4) followed by a collapsible document body that
expands inline (gsap height auto, 0.45s expo) running an abbreviated decrypt
(header stamp + title decode + un-redaction only, 0.7s). One open at a time;
first opens by default. The status ticker becomes a thin strip under the
section heading. No scroll-driven selection (tap only).

### 3.6 Reduced motion / perf / edges

- Reduced: selection switches instantly (no bars, no scramble — content just
  swaps with a 0.2s fade); ticker static; caret no blink.
- Perf: ONE timeline alive at a time; tree/viewer are persistent DOM (only
  text content + bars change); IO pauses ticker + blinking when offscreen.
- 5–8 projects: tree scrolls internally (`overflow-y-auto`,
  `data-lenis-prevent`) past 6 rows; runway stays `N × 90vh`.
- Long titles wrap to 2 lines in the viewer; filenames truncate middle
  (`case-00X_…name.bin`).

---

## VARIANT 04 — "PLAYBACK" · the flight-recorder scrub

**Pitch**: the section pins into a forensic playback console — scrolling
scrubs a tape timeline through all four cases; each case assembles on the
stage in hard keyframe cuts like evidence replay, fully reversible because the
scrub IS the playhead. The most cinematic and most engineering-heavy variant.
`SectionHeading sub: "black box recovered — scrub to replay"`.

### 4.1 Structure & scroll math

- Pin runway `N × 120vh`. Pinned viewport = **stage** (full width,
  `h-[calc(100vh-72px)]`) + **timeline bar** (h-[72px], border-t border-line,
  bg-bg-soft/80 backdrop-blur, fixed at the pin's bottom).
- ONE master gsap timeline (paused), scrubbed by ScrollTrigger
  (`scrub: 0.6`). Master = N sequential **segment** timelines, each
  normalized to 1 unit. All animation hangs off this master — never
  independent triggers — so reverse-scrolling plays everything backward for
  free.

### 4.2 The timeline bar (chrome)

- **Left**: timecode `T+00:00:00` mono text-[.8rem]; maps master progress to
  `00:00:00 → 00:0N:00` (1 "minute" per case); digits update via direct
  textContent (no tween) every onUpdate; during fast scrub the final digit
  pair blurs (CSS `text-shadow` flicker class toggled when |velocity| > 800).
- **Center**: a Canvas-2D **waveform strip** (height 36px, full remaining
  width): pseudo-random amplitude bars (2px wide, 1px gap) generated once per
  mount with a seeded PRNG — seed = project index, so each case segment has a
  visibly different "signature"; bars left of the playhead render accent,
  right of it `white/15`; playhead = 2px white notch with a 6px accent
  triangle above. Redraw only when progress delta > 0.0025.
- **Segment markers**: `C01…C0N` mono labels under the waveform at segment
  boundaries; passed markers accent; clicking a marker (or anywhere on the
  bar) seeks — `getLenis().scrollTo(pinStart + clickFraction * runway)`.
- **Right**: status block flipping by state: `SCRUB ▮▮` while scrolling,
  `HOLD ▶` when stationary inside a hold keyframe (velocity < 50 for 400ms).

### 4.3 Segment keyframe script (per case, normalized 0→1)

- **0.00–0.12 · TAPE WIPE**: previous case's stage content streaks out —
  x −8vw, skewX 8°, opacity → 0, with a 2-frame white-noise flash overlay
  (a div with the grain SVG at opacity .25, `steps(2)` 80ms) at the boundary.
- **0.12–0.40 · STAMP-IN**: four corner meta stamps punch in one per ~0.06
  units (`FILE 0X` TL, `CLIENT` TR, `YEAR` BL, `ROLE` BR) — each scale
  1.15→1 with `steps(1)` opacity (hard cut, no fade), mono bordered chips;
  then the title types on: SplitText chars revealed in groups of 2–3 with
  `steps(1)` (typewriter-by-scrub — reversing scroll untypes it).
- **0.40–0.72 · EVIDENCE FRAME**: image panel (centered, `min(52vw, 760px)`,
  4/3, bordered) scales 1.06→1 with a slow Ken-Burns tied to scrub; two
  **callout chips** (bullet #1 and #2, truncated to ~60 chars, mono, bordered,
  bg-bg) fade in anchored left/right of the image with SVG **leader lines**
  drawing from chip to image corner (DrawSVGPlugin 0→100%, 0.12 units each);
  tagline sets underneath in display italic-voice.
- **0.72–0.92 · VERDICT**: lower-third banner slams in — accent bg, bg-color
  text, `font-display font-bold clamp(1.2rem,2.2vw,1.8rem)`, x −100%→0
  expo.out — containing `highlight`; stack chips row fades up under it;
  a `VIEW FULL RECORD →` mono button (bottom-right, magnetic) becomes
  interactive (pointer-events on only during 0.72–1.0 of its segment).
- **0.92–1.00 · HOLD**: everything static (snap-friendly plateau). ScrollTrigger
  `snap` targets these plateaus: snapTo array `[(i+0.96)/N]`, duration .4.

Clicking `VIEW FULL RECORD` opens the shared overlay (§0.3) — pin stays,
lockScroll handles the conflict (overlay above, z-850).

### 4.4 Stage dressing

Persistent (outside segments): corner brackets; a faint 8px-grid backdrop
(2% white) drifting 0.5px/s; top-center mono `EVIDENCE PLAYBACK //:
CASE FILES`; a vertical "tracking" jitter — the whole stage translates y by a
1px noise wobble ONLY while |velocity| > 1200 (tape damage feel), capped and
disabled for reduced motion.

### 4.5 Mobile (<768)

No pin (mandatory). Each case renders as a **still-frame card**: timecode
header strip (`T+00:0X:00 · FILE 0X/0N`), image with the two callout chips
stacked under it (no leader lines), title, tagline, lower-third highlight
banner (static accent bar), chips, `VIEW FULL RECORD` → overlay. A thin
waveform strip (Canvas, 24px) sits under the section heading with the playhead
driven by section scroll progress (IO + scroll listener) — keeps the
flight-recorder identity without the pin.

### 4.6 Reduced motion / a11y / perf / edges

- Reduced: exactly the mobile still-frame treatment at all widths, fades only,
  no waveform playhead animation.
- A11y: all case content exists in DOM order (segments are real sequential
  nodes, only transformed); decorative chrome aria-hidden; provide a
  visually-hidden "Skip playback" anchor before the pin jumping to #skills;
  the seek bar is `role="slider"` (aria-valuemin 0 / max N / now = active
  case, arrow keys seek by case).
- Perf: master timeline transforms/opacity only; ≤14 animated nodes per
  segment; waveform redraws throttled; leader-line SVGs pre-rendered.
- 5–8 projects: runway and waveform segments scale linearly; keep total pin
  ≤ 8×120vh — beyond 6 cases consider reducing to 100vh/case (note to
  implementer: make per-case runway a constant).

---

## VARIANT 05 — "VAULT" · the editorial mosaic with FLIP morph

**Pitch**: a tense, asymmetric editorial grid — four specimen tiles in a
broken-grid composition with ticker strips running between rows; clicking a
tile FLIP-morphs its image seamlessly into the full case record. The most
"design magazine" of the five; strongest if the user wants elegance over
gimmick. `SectionHeading sub: "vault inventory — 4 specimens"`.

### 5.1 Grid composition (desktop ≥1280, 12-col, gap clamp(1rem,2vw,1.5rem))

- **P1**: cols 1–7, aspect 16/10 — the anchor.
- **P2**: cols 8–12, aspect 4/5, `margin-top: 14vh` — staggered drop.
- *Full-width ticker strip A* (between rows): border-y border-line, py-4,
  display-font uppercase `text-[.85rem] tracking-[.2em] text-faint` marquee of
  all four `highlight` strings separated by ◆, 50px/s, reverses direction
  with scroll direction (reuse VelocityMarquee if importable, else local).
- **P3**: cols 1–5, aspect 4/5, `margin-top: -8vh` (pulls up beside the
  ticker overlap — clip allowed).
- **P4**: cols 6–12, aspect 21/9 — the wide closer.
- *Ticker strip B* after, same spec, opposite base direction.
- 5–8 projects: repeat the 4-tile pattern (P5 takes P1's shape, etc.),
  inserting a ticker strip every 2 tiles.

### 5.2 Tile anatomy

`relative rounded-lg overflow-hidden border border-line bg-bg-soft group`,
whole tile a `<button>` with `data-cursor-label="OPEN"`:

- **Image**: absolute inset, object-cover, rest state `grayscale(.7)
  brightness(.85)`, scale 1.0.
- **Scrim**: bottom 45% gradient (bg → transparent).
- **Meta chip** top-left: mono `FILE 0X` bordered chip on bg-bg/70 blur.
- **Title block** bottom-left (over scrim): title `clamp(1.6rem,2.4vw,2.4rem)`
  display bold, below it `CLIENT · YEAR` mono text-muted; an accent underline
  (2px, scaleX 0 origin left) under the title.
- **Corner brackets**: four 14px L-brackets (white/30), opacity 0 at rest.
- **Role tag** vertical along the right edge, mono text-faint, reading up.

### 5.3 Tile interactions

- **Hover**: image → full color + scale 1.05 (0.6s expo.out); underline draws
  (0.35s); brackets fade in with a 1px outward shift; sibling tiles dim to
  opacity .55 (0.35s — opacity only, no blur); a single diagonal sheen
  (45° white/8 gradient band) sweeps across once (0.7s); micro-parallax —
  image translates up to ±6px against cursor position within the tile
  (lerp .15, gsap.ticker, desktop only).
- **Focus-visible**: accent ring + the hover state minus parallax.
- **Idle life**: every 9s one random tile's meta chip scrambles and its
  brackets blink once — the vault feels monitored.

### 5.4 FLIP morph to the record (signature)

Click:
1. Capture `Flip.getState(tileImage)` — the IMG element itself.
2. Mount the overlay (§0.3) with its hero-banner slot empty; reparent the
   actual IMG node into the slot (`Flip.fit` semantics);
   `Flip.from(state, { duration: 0.65, ease: CustomEase.create("vault",
   "0.7,0,0.18,1"), absolute: true, zIndex: 860 })` — the tile image visibly
   travels/resizes into the record's 21/9 banner while the backdrop fades in
   (0.3s) and the panel border draws (scaleX/scaleY hairlines, 0.4s).
3. Body content cascades per §0.3. The vacated tile keeps a dimmed
   placeholder (the §0.4 glyph pattern at opacity .3).
4. **Close** reverses: capture state in the overlay, reparent home,
   `Flip.from` back (0.55s), overlay fades after the image lands. Scroll
   position untouched (lockScroll pair).
5. Guard: a second click during a FLIP is ignored (`isFlipping` flag);
   resize during overlay → skip the return FLIP, fade instead.

### 5.5 Entrance choreography

Per tile (trigger `top 85%`, once): clip-path wipe `inset(0 0 100% 0)` →
`inset(0)` 0.9s expo.out while the image inside counter-scales 1.18→1.05
(parallax-reveal feel); meta chip + title block fade y 16 after 0.3s; document-
order stagger arises naturally from the staggered grid. Ticker strips draw
their borders (scaleX) then start scrolling.

### 5.6 Mobile (<768)

Single column: every tile aspect 16/10, full color always (no grayscale game
on touch), margins reset (no negative offsets), ticker strips kept (they're
cheap and keep the identity). Tap → overlay with a simplified transition:
tile image cross-fades into the banner slot (no FLIP across a reparent on
mobile — slide-up panel per §0.3). Idle-life blinks disabled.

### 5.7 Reduced motion / perf / edges

- Reduced: wipes become 0.3s fades; no FLIP (plain overlay fade); no
  parallax/sheen/idle blinks; tickers static (single row, ellipsized).
- Perf: grayscale filter is static per state (transition the wrapper opacity,
  not the filter, if Chrome paint cost shows); exactly one ticker rAF (shared);
  parallax ticker IO-paused.
- Edge: long titles wrap to 2 lines inside the scrim (scrim grows to 55%);
  missing image → §0.4 placeholder which actually looks PLANNED in this grid.

---

## 6. Comparison & recommendation

| | 01 INDEX | 02 TRANSIT | 03 ARCHIVE | 04 PLAYBACK | 05 VAULT |
|---|---|---|---|---|---|
| Drama | ◆◆◆ | ◆◆◆◆◆ | ◆◆◆◆ | ◆◆◆◆◆ | ◆◆◆ |
| Persona fit (RE/automation) | ◆◆◆ | ◆◆◆ | ◆◆◆◆◆ | ◆◆◆◆ | ◆◆ |
| Content readability | ◆◆◆◆ | ◆◆◆ | ◆◆◆◆◆ | ◆◆ | ◆◆◆◆ |
| Mobile story | ◆◆◆◆ | ◆◆◆◆ | ◆◆◆◆ | ◆◆◆ | ◆◆◆◆◆ |
| Implementation risk | LOW | MED (pin) | MED | HIGH (pin+master TL) | MED (FLIP reparent) |
| Scroll cost (runway added) | none | ~N×100vh | N×90vh | N×120vh | none |

- Want the safest big upgrade → **01 INDEX**.
- Want maximum spectacle → **02 TRANSIT** or **04 PLAYBACK**.
- Want the most *him* (reverse-engineer narrative) → **03 ARCHIVE FS**.
- Want editorial elegance → **05 VAULT**.

Build order suggestion for the lab: 01, 05, 03, 02, 04 (cheapest-first so
there's always something to compare against the incumbent deck).
