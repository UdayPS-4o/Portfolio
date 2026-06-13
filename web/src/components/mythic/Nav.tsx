"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitChars } from "@/lib/mythic/text";
import { getLenis, lockScroll, unlockScroll, prefersReduced } from "@/lib/mythic/motion";

const LINKS = [
  { label: "About", id: "about" },
  { label: "Work", id: "work" },
  { label: "Projects", id: "projects" },
  { label: "Skills", id: "skills" },
  { label: "Contact", id: "contact" },
] as const;

/** sections observed for the active-link dot (non-link sections clear it) */
const OBSERVED_SECTIONS = ["hero", "capabilities", ...LINKS.map((l) => l.id)];

const SOCIALS = [
  { label: "work@udayps.com", href: "mailto:work@udayps.com" },
  { label: "GitHub", href: "https://github.com/UdayPS-4o" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/uday-ps/" },
  { label: "Résumé ↓", href: "/Resume__Uday_PS.pdf" },
];

/** lenis smooth-scroll to a section id, or to the top when id is null */
function scrollToSection(id: string | null) {
  const lenis = getLenis();
  if (id === null) {
    if (lenis?.scrollTo) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis?.scrollTo) lenis.scrollTo(el, { offset: 0 });
  else el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
}

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent";

export default function Nav() {
  const headerRef = useRef<HTMLElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const pendingIdRef = useRef<string | null>(null);

  const [active, setActive] = useState("");
  const [isMac, setIsMac] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  /* platform check for the palette shortcut label */
  useEffect(() => {
    const p = navigator.platform || navigator.userAgent || "";
    setIsMac(/mac|iphone|ipad|ipod/i.test(p));
  }, []);

  /* hide on scroll down / reveal on scroll up + hairline once past the hero */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const header = headerRef.current;
      const border = borderRef.current;
      if (!header) return;
      if (border) gsap.set(border, { opacity: 0 });

      const reduced = prefersReduced();
      let lastY = 0;
      let hidden = false;
      let pastHero = false;
      let heroLimit = 0;

      const measure = () => {
        const hero = document.getElementById("hero");
        heroLimit = (hero?.offsetHeight ?? window.innerHeight) * 0.75;
      };
      measure();

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onRefresh: measure,
        onUpdate(self) {
          const y = self.scroll();
          if (!reduced) {
            const shouldHide = y > lastY + 2 && y > 220;
            const shouldShow = y < lastY - 2 || y <= 220;
            if (shouldHide && !hidden) {
              hidden = true;
              gsap.to(header, { yPercent: -130, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            } else if (shouldShow && hidden) {
              hidden = false;
              gsap.to(header, { yPercent: 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            }
          }
          if (border) {
            const past = y > heroLimit;
            if (past !== pastHero) {
              pastHero = past;
              gsap.to(border, { opacity: past ? 1 : 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
            }
          }
          lastY = y;
        },
      });
    }, headerRef);
    return () => ctx.revert();
  }, []);

  /* active section tracking: IntersectionObserver + hashchange fallback */
  useEffect(() => {
    const sections = OBSERVED_SECTIONS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const linkIds = new Set<string>(LINKS.map((l) => l.id));
    let io: IntersectionObserver | null = null;

    if (sections.length && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const id = (entry.target as HTMLElement).id;
            setActive(linkIds.has(id) ? id : "");
          }
        },
        { rootMargin: "-42% 0px -52% 0px", threshold: 0 },
      );
      sections.forEach((s) => io?.observe(s));
    }

    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (linkIds.has(id)) setActive(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      io?.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  /* after the mobile menu unmounts (scroll unlocked), run the deferred jump */
  const menuWasOpenRef = useRef(false);
  useEffect(() => {
    if (menuOpen) {
      menuWasOpenRef.current = true;
      return;
    }
    if (!menuWasOpenRef.current) return;
    const id = pendingIdRef.current;
    pendingIdRef.current = null;
    const raf = requestAnimationFrame(() => {
      if (id) scrollToSection(id);
      else burgerRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [menuOpen]);

  const openPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent("mythic:palette", { detail: { open: true } }));
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const navigateFromMenu = useCallback((id: string) => {
    pendingIdRef.current = id;
    setMenuOpen(false);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed left-0 top-0 z-[800] flex w-full items-center justify-between gap-4 pad-x py-5 mix-blend-difference"
      >
        {/* brand */}
        <a
          href="#hero"
          data-cursor="hover"
          aria-label="uday-ps — back to top"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(null);
          }}
          className={`inline-flex items-center font-mono text-[.95rem] font-medium tracking-[.01em] ${FOCUS_RING}`}
        >
          <span>
            <span className="text-accent">~/</span>uday-ps
          </span>
          <span
            aria-hidden
            className="ml-[.3rem] inline-block h-[1.05em] w-2 animate-blink bg-accent motion-reduce:animate-none"
          />
        </a>

        {/* center links */}
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              data-cursor-stick
              aria-current={active === l.id ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(l.id);
              }}
              className={`relative font-mono text-[.78rem] uppercase tracking-[.15em] text-text transition-colors duration-300 hover:text-accent ${FOCUS_RING}`}
            >
              {/* scramble target is the text-only span so the dot never gets clobbered */}
              <span data-scramble-hover>{l.label}</span>
              <span
                aria-hidden
                className={`absolute -bottom-[.6rem] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rotate-45 bg-accent transition-all duration-300 ease-ease ${
                  active === l.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
                }`}
              />
            </a>
          ))}
        </nav>

        {/* right: palette trigger + burger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPalette}
            data-cursor="hover"
            aria-label="Open command palette"
            className={`rounded-[3px] border border-line px-2.5 py-1.5 font-mono text-[.6rem] tracking-[.18em] text-muted transition-colors duration-300 hover:border-accent hover:text-accent ${FOCUS_RING}`}
          >
            {isMac ? "⌘ K" : "CTRL K"}
          </button>

          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            data-cursor="hover"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={`flex h-9 w-9 flex-col items-center justify-center gap-[6px] md:hidden ${FOCUS_RING}`}
          >
            <span aria-hidden className="block h-px w-5 bg-text" />
            <span aria-hidden className="block h-px w-5 bg-text" />
          </button>
        </div>

        {/* hairline that fades in past the hero (opacity set from JS) */}
        <div
          ref={borderRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
        />
      </header>

      {menuOpen && <MobileMenu active={active} onClose={closeMenu} onNavigate={navigateFromMenu} />}
    </>
  );
}

/* ============================== mobile menu ============================== */

type MobileMenuProps = {
  active: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
};

function MobileMenu({ active, onClose, onNavigate }: MobileMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onCloseRef.current = onClose;
    onNavigateRef.current = onNavigate;
  }, [onClose, onNavigate]);

  const requestClose = useCallback((after?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const root = rootRef.current;
    const finish = () => {
      if (after) after();
      else onCloseRef.current();
    };
    if (!root || prefersReduced()) {
      finish();
      return;
    }
    gsap.to(root, { autoAlpha: 0, duration: 0.3, ease: "power2.in", onComplete: finish });
  }, []);

  /* entrance: overlay fade + per-link char mask-rise (.06 link stagger) */
  useLayoutEffect(() => {
    lockScroll();
    const ctx = gsap.context(() => {
      const root = rootRef.current;
      if (!root) return;
      if (prefersReduced()) {
        gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power2.out" });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0);

      root.querySelectorAll<HTMLElement>(".mnav-label").forEach((label, i) => {
        const chars = splitChars(label);
        tl.fromTo(
          chars,
          { yPercent: 120 },
          { yPercent: 0, duration: 0.9, stagger: 0.022 },
          0.1 + i * 0.06,
        );
      });
      tl.fromTo(
        ".mnav-index",
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.06 },
        0.2,
      );
      tl.fromTo(
        ".mnav-meta",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.06 },
        0.45,
      );
    }, rootRef);
    return () => {
      ctx.revert();
      unlockScroll();
    };
  }, []);

  /* ESC + focus trap */
  useEffect(() => {
    const root = rootRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!current || current === first || !root.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (!current || current === last || !root.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-0 z-[850] flex flex-col bg-bg"
    >
      {/* top row */}
      <div className="flex items-center justify-between pad-x py-5">
        <span className="mnav-meta font-mono text-[.62rem] uppercase tracking-[.22em] text-muted">
          <span className="text-accent">menu</span> // navigation
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={() => requestClose()}
          data-cursor="hover"
          aria-label="Close menu"
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-line font-mono text-sm text-muted transition-colors duration-300 hover:border-accent hover:text-accent ${FOCUS_RING}`}
        >
          <span aria-hidden>✕</span>
        </button>
      </div>

      {/* massive link list */}
      <nav aria-label="Mobile" className="pad-x flex flex-1 flex-col justify-center">
        {LINKS.map((l, i) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            aria-current={active === l.id ? "location" : undefined}
            onClick={(e) => {
              e.preventDefault();
              requestClose(() => onNavigateRef.current(l.id));
            }}
            className={`group flex items-baseline gap-4 py-[.35rem] ${FOCUS_RING}`}
          >
            <span className="mnav-index w-7 shrink-0 font-mono text-[.68rem] tracking-[.12em] text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="block overflow-hidden pb-[.08em] -mb-[.08em]">
              <span className="mnav-label block font-display text-[clamp(2.2rem,10vw,4rem)] font-bold leading-[1.02] tracking-[-.03em] text-text transition-colors duration-300 group-hover:text-accent">
                {l.label}
              </span>
            </span>
            {active === l.id && (
              <span aria-hidden className="h-[6px] w-[6px] shrink-0 rotate-45 bg-accent" />
            )}
          </a>
        ))}
      </nav>

      {/* social row */}
      <div className="pad-x pb-8 pt-4">
        <div className="mnav-meta flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") || s.href.endsWith(".pdf") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`font-mono text-[.68rem] uppercase tracking-[.14em] text-muted transition-colors duration-300 hover:text-accent ${FOCUS_RING}`}
            >
              {s.label}
            </a>
          ))}
        </div>
        <p className="mnav-meta mt-4 font-mono text-[.56rem] uppercase tracking-[.24em] text-faint">
          Indore · India · IST
        </p>
      </div>
    </div>
  );
}
