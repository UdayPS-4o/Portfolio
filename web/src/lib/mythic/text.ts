/**
 * mythic/text — splitting + scramble-decode primitives.
 * Pure DOM helpers; no GSAP dependency so they can run before boot.
 */

export const GLYPHS = "!<>-_\\/[]{}—=+*^?#@$%&░▒▓";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Split an element's text into per-character spans (`.mchar`).
 * Idempotent — re-calling returns the existing spans. Spaces become &nbsp;.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.msplit !== "chars") {
    const text = el.textContent ?? "";
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const frag = document.createDocumentFragment();
    for (const ch of Array.from(text)) {
      const s = document.createElement("span");
      s.className = "mchar";
      s.setAttribute("aria-hidden", "true");
      s.style.display = "inline-block";
      s.style.willChange = "transform";
      if (/\s/.test(ch)) s.innerHTML = "&nbsp;";
      else s.textContent = ch;
      frag.appendChild(s);
    }
    el.appendChild(frag);
    el.dataset.msplit = "chars";
  }
  return Array.from(el.querySelectorAll<HTMLElement>(".mchar"));
}

/**
 * Split an element's text into masked word spans:
 * `.mword` (inline-block, overflow hidden) wrapping `.mword-inner` (the part
 * you animate with yPercent). Idempotent — returns the inner spans.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.msplit !== "words") {
    el.setAttribute(
      "aria-label",
      (el.textContent ?? "").replace(/\s+/g, " ").trim()
    );

    const makeWord = (word: string): HTMLElement => {
      const outer = document.createElement("span");
      outer.className = "mword";
      outer.setAttribute("aria-hidden", "true");
      outer.style.display = "inline-block";
      outer.style.overflow = "hidden";
      outer.style.verticalAlign = "top";
      // descender room without changing layout height
      outer.style.paddingBottom = ".12em";
      outer.style.marginBottom = "-.12em";
      const inner = document.createElement("span");
      inner.className = "mword-inner";
      inner.style.display = "block";
      inner.style.willChange = "transform";
      inner.textContent = word;
      outer.appendChild(inner);
      return outer;
    };

    // walk in place so nested inline elements (<em>, <strong>…) keep their styling
    const walk = (node: Node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const text = child.textContent ?? "";
        if (!text.trim()) return; // keep pure-whitespace nodes untouched
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
          else frag.appendChild(makeWord(part));
        });
        node.replaceChild(frag, child);
      });
    };
    walk(el);
    el.dataset.msplit = "words";
  }
  return Array.from(el.querySelectorAll<HTMLElement>(".mword-inner"));
}

/** one active scramble per element; re-triggering cancels the previous run */
const activeScrambles = new WeakMap<HTMLElement, () => void>();

/**
 * Decode `el`'s text from random GLYPHS to the original, resolving
 * left-to-right with a ~30ms glyph shuffle. Reads `el.dataset.text` ??
 * `textContent`, stores the original into `el.dataset.text` on first run.
 * Returns a cancel function (restores the original text). Safe to re-trigger.
 * NOTE: if you change the element's text, update `el.dataset.text` too.
 */
export function scramble(
  el: HTMLElement,
  opts: { duration?: number; chars?: string; onComplete?: () => void } = {}
): () => void {
  const original = el.dataset.text ?? el.textContent ?? "";
  el.dataset.text = original;

  // cancel any in-flight run on this element first
  activeScrambles.get(el)?.();

  if (!original || reducedMotion()) {
    el.textContent = original;
    opts.onComplete?.();
    return () => {};
  }

  const glyphs = Array.from(opts.chars ?? GLYPHS);
  const src = Array.from(original);
  const durationMs =
    (opts.duration ?? Math.min(1.4, Math.max(0.5, src.length * 0.045))) * 1000;

  let raf = 0;
  let done = false;
  let last = 0;
  const start = performance.now();

  const frame = (now: number) => {
    if (done) return;
    if (now - last >= 30) {
      last = now;
      const p = Math.min(1, (now - start) / durationMs);
      const resolved = Math.floor(p * src.length);
      let out = "";
      for (let i = 0; i < src.length; i++) {
        const c = src[i];
        out +=
          i < resolved || c === " "
            ? c
            : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
      if (p >= 1) {
        done = true;
        activeScrambles.delete(el);
        el.textContent = original;
        opts.onComplete?.();
        return;
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const cancel = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    activeScrambles.delete(el);
    el.textContent = original;
  };
  activeScrambles.set(el, cancel);
  return cancel;
}
