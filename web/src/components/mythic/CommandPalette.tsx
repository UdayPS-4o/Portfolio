"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import gsap from "gsap";
import { getLenis, lockScroll, unlockScroll, prefersReduced } from "@/lib/mythic/motion";

const EMAIL = "work@udayps.com";

type Group = "GO" | "RUN" | "LNK";

type Command = {
  id: string;
  group: Group;
  label: string;
  hint: string;
  keywords: string;
  action:
    | { type: "go"; target: string }
    | { type: "copy"; text: string }
    | { type: "terminal" }
    | { type: "reload" }
    | { type: "link"; href: string };
};

const COMMANDS: Command[] = [
  { id: "go-hero", group: "GO", label: "Intro", hint: "00", keywords: "hero home top start intro signal", action: { type: "go", target: "hero" } },
  { id: "go-about", group: "GO", label: "About", hint: "01", keywords: "about bio who dossier profile", action: { type: "go", target: "about" } },
  { id: "go-capabilities", group: "GO", label: "Capabilities", hint: "02", keywords: "services what i do capabilities expertise", action: { type: "go", target: "capabilities" } },
  { id: "go-work", group: "GO", label: "Experience", hint: "03", keywords: "experience work history timeline roles trace log", action: { type: "go", target: "work" } },
  { id: "go-projects", group: "GO", label: "Selected Work", hint: "04", keywords: "projects portfolio selected work case files", action: { type: "go", target: "projects" } },
  { id: "go-skills", group: "GO", label: "Skills", hint: "05", keywords: "skills stack tools tech arsenal technologies", action: { type: "go", target: "skills" } },
  { id: "go-contact", group: "GO", label: "Contact", hint: "06", keywords: "contact email reach transmit", action: { type: "go", target: "contact" } },
  { id: "run-copy-email", group: "RUN", label: "Copy email", hint: EMAIL, keywords: "copy email clipboard mail address", action: { type: "copy", text: EMAIL } },
  { id: "run-terminal", group: "RUN", label: "Open terminal", hint: "tty0", keywords: "terminal shell console tty cli", action: { type: "terminal" } },
  { id: "run-reboot", group: "RUN", label: "Replay boot sequence", hint: "reload", keywords: "boot reboot reload restart preloader replay", action: { type: "reload" } },
  { id: "lnk-github", group: "LNK", label: "GitHub", hint: "↗ /UdayPS-4o", keywords: "github code repos git", action: { type: "link", href: "https://github.com/UdayPS-4o" } },
  { id: "lnk-linkedin", group: "LNK", label: "LinkedIn", hint: "↗ /in/uday-ps", keywords: "linkedin profile network", action: { type: "link", href: "https://www.linkedin.com/in/uday-ps/" } },
  { id: "lnk-resume", group: "LNK", label: "Résumé", hint: "↗ pdf", keywords: "resume cv pdf download", action: { type: "link", href: "/Resume__Uday_PS.pdf" } },
];

const GROUP_TINT: Record<Group, string> = {
  GO: "text-accent",
  RUN: "text-accent2",
  LNK: "text-accent3",
};

function scrollToTarget(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis?.scrollTo) lenis.scrollTo(el, { offset: 0 });
  else el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CommandPalette() {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const closingRef = useRef(false);
  const afterCloseRef = useRef<(() => void) | null>(null);
  const copyTimerRef = useRef<number>(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.group} ${c.label} ${c.keywords}`.toLowerCase().includes(q),
    );
  }, [query]);

  const openPalette = useCallback(() => {
    if (openRef.current) return;
    setQuery("");
    setSelected(0);
    setCopied(false);
    setOpen(true);
  }, []);

  const requestClose = useCallback((after?: () => void) => {
    if (!openRef.current || closingRef.current) return;
    closingRef.current = true;
    if (after) afterCloseRef.current = after;
    window.clearTimeout(copyTimerRef.current);
    const done = () => {
      closingRef.current = false;
      setOpen(false);
    };
    const root = rootRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!root || !panel || !backdrop) {
      done();
      return;
    }
    if (prefersReduced()) {
      gsap.to(root, { opacity: 0, duration: 0.18, ease: "power2.in", onComplete: done });
      return;
    }
    gsap
      .timeline({ onComplete: done })
      .to(panel, { opacity: 0, scale: 0.97, y: 8, duration: 0.2, ease: "power2.in" }, 0)
      .to(backdrop, { opacity: 0, duration: 0.22, ease: "power2.in" }, 0.02);
  }, []);

  /* global triggers: Ctrl/Cmd+K + "mythic:palette" — registered once */
  useEffect(() => {
    const toggle = () => (openRef.current ? requestClose() : openPalette());
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!e.repeat) toggle();
      }
    };
    const onPalette = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      if (detail?.open === true) openPalette();
      else if (detail?.open === false) requestClose();
      else toggle();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mythic:palette", onPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mythic:palette", onPalette);
      window.clearTimeout(copyTimerRef.current);
    };
  }, [openPalette, requestClose]);

  /* open lifecycle: lock scroll, hide custom cursor, entrance, focus */
  useLayoutEffect(() => {
    openRef.current = open;
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    lockScroll();
    document.documentElement.classList.add("palette-open");
    const ctx = gsap.context(() => {
      if (prefersReduced()) {
        gsap.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
        return;
      }
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.96, y: 14 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "expo.out" },
      );
    }, rootRef);
    inputRef.current?.focus();
    return () => {
      ctx.revert();
      document.documentElement.classList.remove("palette-open");
      unlockScroll();
      prevFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  /* deferred action after close (scroll is unlocked by then) */
  useEffect(() => {
    if (open) return;
    const after = afterCloseRef.current;
    afterCloseRef.current = null;
    if (!after) return;
    const raf = requestAnimationFrame(after);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  /* keep selection valid + visible */
  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`mcp-opt-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  const exec = useCallback(
    (cmd: Command | undefined) => {
      if (!cmd) return;
      const a = cmd.action;
      switch (a.type) {
        case "go":
          requestClose(() => scrollToTarget(a.target));
          break;
        case "copy":
          void copyText(a.text).then((ok) => {
            if (!openRef.current) return;
            if (ok) {
              setCopied(true);
              window.clearTimeout(copyTimerRef.current);
              copyTimerRef.current = window.setTimeout(() => requestClose(), 900);
            } else {
              requestClose(() => {
                window.location.href = `mailto:${a.text}`;
              });
            }
          });
          break;
        case "terminal":
          requestClose(() => {
            window.dispatchEvent(new CustomEvent("mythic:terminal", { detail: { open: true } }));
          });
          break;
        case "reload":
          window.location.reload();
          break;
        case "link":
          window.open(a.href, "_blank", "noopener,noreferrer");
          requestClose();
          break;
      }
    },
    [requestClose],
  );

  const onRootKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length) setSelected((s) => (s + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length) setSelected((s) => (s - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      exec(filtered[selected]);
    } else if (e.key === "Tab") {
      /* focus trap: the input is the only tab stop (combobox pattern) */
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[900] cursor-auto"
      onKeyDown={onRootKeyDown}
    >
      <div
        ref={backdropRef}
        aria-hidden
        onClick={() => requestClose()}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
      />

      <div className="pointer-events-none absolute inset-x-0 top-[14vh] flex justify-center px-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="pointer-events-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_50px_140px_-20px_rgba(0,0,0,.85),0_0_80px_-30px_rgba(204,255,61,.12)]"
        >
          {/* input row */}
          <div className="flex items-center gap-3 border-b border-line px-4">
            <span aria-hidden className="font-mono text-[.8rem] text-accent">
              ❯
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="mcp-list"
              aria-activedescendant={filtered.length ? `mcp-opt-${selected}` : undefined}
              aria-label="Type a command"
              placeholder="type a command…"
              spellCheck={false}
              autoComplete="off"
              className="w-full cursor-text bg-transparent py-4 font-mono text-[.85rem] text-text caret-accent outline-none placeholder:text-faint"
            />
            <kbd
              aria-hidden
              className="shrink-0 rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-[.14em] text-faint"
            >
              esc
            </kbd>
          </div>

          {/* results */}
          <ul
            id="mcp-list"
            role="listbox"
            aria-label="Commands"
            data-lenis-prevent
            className="max-h-[min(380px,52vh)] overflow-y-auto overscroll-contain py-2"
          >
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center font-mono text-[.68rem] uppercase tracking-[.18em] text-faint">
                no match — try &quot;go&quot;, &quot;copy&quot; or &quot;open&quot;
              </li>
            )}
            {filtered.map((c, i) => {
              const sel = i === selected;
              const isCopied = copied && c.action.type === "copy";
              return (
                <li
                  key={c.id}
                  id={`mcp-opt-${i}`}
                  role="option"
                  aria-selected={sel}
                  onMouseMove={() => setSelected(i)}
                  onClick={() => exec(c)}
                  className={`relative mx-2 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 ${
                    sel ? "bg-bg-soft" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 h-[55%] w-[2px] -translate-y-1/2 bg-accent transition-opacity duration-150 ${
                      sel ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`w-9 shrink-0 rounded-[3px] border border-line py-0.5 text-center font-mono text-[.52rem] tracking-[.12em] ${GROUP_TINT[c.group]}`}
                  >
                    {c.group}
                  </span>
                  <span className={`flex-1 truncate font-mono text-[.8rem] ${sel ? "text-text" : "text-muted"}`}>
                    {c.label}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[.58rem] tracking-[.1em] ${
                      isCopied ? "text-accent" : "text-faint"
                    }`}
                  >
                    {isCopied ? "✓ copied" : c.hint}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* footer */}
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[.55rem] uppercase tracking-[.18em] text-faint">
            <span>↑↓ navigate · ↵ run</span>
            <span>
              {filtered.length}/{COMMANDS.length} cmds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
