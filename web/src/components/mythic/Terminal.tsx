"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PROJECTS } from "@/lib/projects";
import { prefersReduced } from "@/lib/mythic/motion";

/* ------------------------------------------------------------------ */
/* static data + pure helpers                                          */
/* ------------------------------------------------------------------ */

const PROMPT = "uday@portfolio:~$";
const KONAMI_SENTINEL = "__konami__";
const MATRIX_GLYPHS = "アイウエオカキクケコサシスセソタチツテト0123456789!<>-_\\/[]{}=+*^?#";

type QItem =
  | { kind: "line"; text: string; cls?: string; instant?: boolean; pre?: boolean }
  | { kind: "html"; html: string; cls?: string; pre?: boolean }
  | { kind: "pause"; ms: number }
  | { kind: "action"; run: (done: () => void) => void };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const slugOf = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const li = (text: string, cls?: string, instant?: boolean, pre?: boolean): QItem => ({
  kind: "line",
  text,
  cls,
  instant,
  pre,
});

const hi = (html: string, cls?: string): QItem => ({ kind: "html", html, cls, pre: true });

const lcp = (arr: string[]) => {
  let p = arr[0] ?? "";
  for (const s of arr.slice(1)) while (p && !s.startsWith(p)) p = p.slice(0, -1);
  return p;
};

const SLUGS = PROJECTS.map((p) => slugOf(p.title));

const COMPLETIONS = [
  "cat ",
  "clear",
  "contact",
  "exit",
  "help",
  "history",
  "ls projects",
  "ls",
  "matrix",
  "queue --bypass",
  "social",
  "stack",
  "sudo hire-me",
  "whoami",
];

const COMMANDS_HELP: [string, string][] = [
  ["help", "this menu"],
  ["whoami", "identity check"],
  ["ls projects", "list the case files"],
  ["cat <file>", "open a case file"],
  ["stack", "toolkit, grouped"],
  ["contact", "email + links"],
  ["history", "everything you typed"],
  ["clear", "wipe the buffer"],
  ["sudo hire-me", "escalate privileges"],
  ["queue --bypass", "a bookmyshow story"],
  ["matrix", "follow the white rabbit"],
  ["exit", "close the window"],
];

const HELP_ITEMS: QItem[] = COMMANDS_HELP.map(([c, d]) =>
  hi(`  <span class="text-accent">${esc(c.padEnd(16))}</span><span class="text-muted">${esc(d)}</span>`),
);

const WHOAMI_ITEMS: QItem[] = [
  li("uday pratap singh parihar", "text-text"),
  li("full-stack · rpa & automation · reverse engineering", "text-muted"),
  li("indore, india · IST", "text-muted"),
  li("turns closed systems into programmable ones — and queues into suggestions.", "text-faint"),
];

const LS_ITEMS: QItem[] = (() => {
  const pad = Math.max(...SLUGS.map((s) => s.length)) + 3;
  return [
    li(`total ${PROJECTS.length} case files`, "text-faint", true),
    ...PROJECTS.map((p, i) =>
      hi(
        `<span class="text-faint">-rw-------</span>  <span class="text-text">${esc(
          SLUGS[i].padEnd(pad),
        )}</span><span class="text-accent">${esc(p.year)}</span>  <span class="text-muted">${esc(
          p.client ?? "",
        )}</span>`,
      ),
    ),
    hi(
      `<span class="text-faint">hint: cat &lt;name&gt; — substrings work, e.g. </span><span class="text-accent">cat ehr</span>`,
    ),
  ];
})();

const STACK_GROUPS: [string, string][] = [
  ["rpa · automation · reverse engineering", "RPA & bot frameworks · API/Android RE · Puppeteer · Appium · SSL proxying · Burp Suite · Frida · Dify"],
  ["frontend", "React · Next.js · TypeScript · Tailwind · React Native"],
  ["backend & db", "Node.js · Python · PHP · PostgreSQL · MongoDB"],
  ["cloud & infra", "GCP (Compute · Cloud Run) · AWS (ECS · Lambda) · Docker · CI/CD · Nginx · Linux/VPS"],
];

const STACK_ITEMS: QItem[] = STACK_GROUPS.flatMap(([title, items], i) => [
  hi(
    `<span class="text-accent">${String.fromCharCode(65 + i)}/</span> <span class="text-text">${esc(title)}</span>`,
  ),
  li(`   ${items}`, "text-muted", true),
]);

const CONTACT_LINKS: [string, string, string][] = [
  ["email", "work@udayps.com", "mailto:work@udayps.com"],
  ["phone", "+91 8819923334", "tel:+918819923334"],
  ["github", "github.com/UdayPS-4o", "https://github.com/UdayPS-4o"],
  ["linkedin", "linkedin.com/in/uday-ps", "https://www.linkedin.com/in/uday-ps/"],
  ["résumé", "Resume__Uday_PS.pdf", "/Resume__Uday_PS.pdf"],
];

const CONTACT_ITEMS: QItem[] = [
  ...CONTACT_LINKS.map(([label, text, href]) => {
    const ext = href.startsWith("http") || href.endsWith(".pdf");
    return hi(
      `<span class="text-faint">${esc(label.padEnd(10))}</span><a class="mterm-link" href="${href}"${
        ext ? ' target="_blank" rel="noopener"' : ""
      }>${esc(text)}</a>`,
    );
  }),
  li("response time: fast — faster if it's interesting.", "text-faint"),
];

const BANNER_ITEMS: QItem[] = [
  hi(`<span class="text-text">uday.exe</span><span class="text-faint"> — interactive shell [v2.6.0]</span>`),
  li("no public api? give me a minute.", "text-muted"),
  hi(
    `<span class="text-muted">type </span><span class="text-accent">help</span><span class="text-muted"> to list commands · tab completes · esc closes</span>`,
  ),
  { kind: "pause", ms: 120 },
];

const KONAMI_ITEMS: QItem[] = [
  hi(`<span class="text-accent2">↑↑↓↓←→←→BA — konami accepted. cheat mode: still just hard work.</span>`),
];

function buildCat(rawArg: string): QItem[] {
  const q = rawArg.trim().toLowerCase();
  if (!q) return [li("usage: cat <case-file> — try 'cat ehr' or 'ls'", "text-muted", true)];
  const slugQ = q.replace(/\s+/g, "-");
  const matches = PROJECTS.filter(
    (p, i) =>
      SLUGS[i].includes(slugQ) ||
      p.title.toLowerCase().includes(q) ||
      (p.client ?? "").toLowerCase().includes(q),
  );
  if (!matches.length) return [li(`cat: ${q}: no such case file — try 'ls'`, "text-accent3", true)];
  if (matches.length > 1)
    return [
      li(`cat: '${q}' is ambiguous (${matches.length} matches):`, "text-muted", true),
      ...matches.map((p) => hi(`  <span class="text-accent">${esc(slugOf(p.title))}</span>`)),
    ];
  const p = matches[0];
  return [
    hi(
      `<span class="text-text">${esc(p.title)}</span><span class="text-faint"> · ${esc(
        p.client ?? "independent",
      )} · ${esc(p.year)} · ${esc(p.role)}</span>`,
    ),
    li(`"${p.tagline ?? p.highlight}"`, "text-muted"),
    hi(`<span class="text-faint">outcome  </span><span class="text-accent">${esc(p.highlight)}</span>`),
    hi(`<span class="text-faint">stack    </span><span class="text-muted">${esc(p.stack.join(" · "))}</span>`),
  ];
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function Terminal() {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);

  const winRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);

  const openRef = useRef(false);
  const closingRef = useRef(false);
  const bootedRef = useRef(false);
  const savedRef = useRef("");
  const pendingRef = useRef<string | null>(null);
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef(0);
  const queueRef = useRef<QItem[]>([]);
  const busyRef = useRef(false);
  // input keys are handled NATIVELY on the input element: the window root's
  // keydown stopPropagation (anti-hotkey-leak) would otherwise kill React's
  // root-delegated synthetic onKeyDown before it ever fires.
  const inputKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const timersRef = useRef<Set<number>>(new Set());
  const matrixCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* ---------------- timers ---------------- */

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timersRef.current.delete(t);
      fn();
    }, ms);
    timersRef.current.add(t);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const scrollEnd = useCallback(() => {
    const out = outRef.current;
    if (out) out.scrollTop = out.scrollHeight;
  }, []);

  /* ---------------- output engine ---------------- */

  const pump = useCallback(() => {
    if (busyRef.current) return;
    const item = queueRef.current.shift();
    if (!item) return;
    const out = outRef.current;
    if (!out) {
      queueRef.current = [];
      return;
    }
    busyRef.current = true;
    const done = () => {
      busyRef.current = false;
      pump();
    };

    if (item.kind === "pause") {
      schedule(done, prefersReduced() ? 40 : item.ms);
      return;
    }
    if (item.kind === "action") {
      item.run(done);
      return;
    }

    const el = document.createElement("div");
    el.className = ["mterm-line", item.pre ? "is-pre" : "", item.cls ?? ""].filter(Boolean).join(" ");

    if (item.kind === "html") {
      el.innerHTML = item.html;
      out.appendChild(el);
      scrollEnd();
      schedule(done, 12);
      return;
    }

    out.appendChild(el);
    const text = item.text;
    if (item.instant || prefersReduced() || !text.length) {
      el.textContent = text;
      scrollEnd();
      schedule(done, 12);
      return;
    }
    const node = document.createTextNode("");
    el.appendChild(node);
    const per = text.length > 64 ? 7 : text.length > 32 ? 13 : 22;
    let i = 0;
    const step = () => {
      i += 1;
      node.data = text.slice(0, i);
      scrollEnd();
      if (i < text.length) schedule(step, per);
      else schedule(done, 60);
    };
    schedule(step, per);
  }, [schedule, scrollEnd]);

  const pushOut = useCallback(
    (items: QItem[]) => {
      queueRef.current.push(...items);
      pump();
    },
    [pump],
  );

  const echo = useCallback(
    (cmd: string) => {
      pushOut([
        hi(
          `<span class="text-accent">${PROMPT}</span> <span class="text-text">${esc(cmd)}</span>`,
          "mterm-echo",
        ),
      ]);
    },
    [pushOut],
  );

  /* ---------------- open / close ---------------- */

  const requestClose = useCallback(() => {
    if (!openRef.current || closingRef.current) return;
    closingRef.current = true;
    const win = winRef.current;
    const finish = () => {
      setOpen(false);
      launchRef.current?.focus({ preventScroll: true });
    };
    if (!win) {
      finish();
      return;
    }
    if (prefersReduced()) {
      gsap.to(win, { opacity: 0, duration: 0.2, ease: "power2.in", onComplete: finish });
      return;
    }
    gsap.to(win, { y: 26, opacity: 0, scale: 0.985, duration: 0.32, ease: "power3.in", onComplete: finish });
  }, []);

  /* ---------------- playful command builders ---------------- */

  const buildSudo = useCallback(
    (arg: string): QItem[] => {
      if (!arg) return [li("usage: sudo hire-me", "text-muted", true)];
      if (arg !== "hire-me")
        return [li("visitor is not in the sudoers file. this incident will be reported.", "text-accent3")];
      return [
        li("[sudo] password for visitor:", "text-muted"),
        {
          kind: "action",
          run: (done) => {
            const el = outRef.current?.lastElementChild as HTMLElement | null;
            if (!el) {
              done();
              return;
            }
            const node = document.createTextNode(" ");
            el.appendChild(node);
            if (prefersReduced()) {
              node.data = " ********";
              schedule(done, 80);
              return;
            }
            let n = 0;
            const step = () => {
              n += 1;
              node.data = ` ${"*".repeat(n)}`;
              if (n < 8) schedule(step, 110);
              else schedule(done, 300);
            };
            schedule(step, 340);
          },
        },
        hi(`<span class="text-accent">ACCESS GRANTED.</span>`),
        li("drafting offer letter… reviewing comp band… done.", "text-muted"),
        hi(
          `<span class="text-muted">next step: </span><span class="text-accent">contact</span><span class="text-muted"> has the routing info.</span>`,
        ),
      ];
    },
    [schedule],
  );

  const buildQueue = useCallback(
    (): QItem[] => [
      li("target: bookmyshow · queue-it waiting room", "text-muted"),
      li("spawning 50 sessions… ok", "text-muted"),
      {
        kind: "action",
        run: (done) => {
          const out = outRef.current;
          if (!out) {
            done();
            return;
          }
          const el = document.createElement("div");
          el.className = "mterm-line is-pre text-text";
          const node = document.createTextNode("position in queue: 1,000,000");
          el.appendChild(node);
          out.appendChild(el);
          scrollEnd();
          if (prefersReduced()) {
            node.data = "position in queue: 1";
            schedule(done, 120);
            return;
          }
          const t0 = performance.now();
          const step = () => {
            const p = Math.min(1, (performance.now() - t0) / 2200);
            const v = Math.max(1, Math.round(1_000_000 * Math.pow(1 - p, 5)));
            node.data = `position in queue: ${v.toLocaleString("en-US")}`;
            scrollEnd();
            if (p < 1) schedule(step, 28);
            else schedule(done, 420);
          };
          schedule(step, 28);
        },
      },
      hi(`<span class="text-text">position: </span><span class="text-accent">1</span><span class="text-text"> — was there ever a queue?</span>`),
    ],
    [schedule, scrollEnd],
  );

  const buildMatrix = useCallback(
    (): QItem[] => [
      li("entering the matrix — press any key to wake up.", "text-muted"),
      {
        kind: "action",
        run: (done) => {
          const host = wrapRef.current;
          if (!host || prefersReduced()) {
            done();
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.className = "mterm-matrix";
          canvas.setAttribute("aria-hidden", "true");
          host.appendChild(canvas);
          const c2d = canvas.getContext("2d");
          if (!c2d) {
            canvas.remove();
            done();
            return;
          }
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = host.clientWidth;
          const h = host.clientHeight;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          c2d.scale(dpr, dpr);
          c2d.fillStyle = "#0b0b0e";
          c2d.fillRect(0, 0, w, h);
          const fs = 14;
          const cols = Math.max(1, Math.ceil(w / fs));
          const drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -40));
          let raf = 0;
          let last = 0;
          let ended = false;
          const draw = (t: number) => {
            raf = requestAnimationFrame(draw);
            if (t - last < 50) return;
            last = t;
            c2d.fillStyle = "rgba(11,11,14,.16)";
            c2d.fillRect(0, 0, w, h);
            c2d.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
            for (let i = 0; i < cols; i++) {
              const y = drops[i] * fs;
              if (y > 0) {
                c2d.fillStyle = Math.random() < 0.06 ? "#f1ffc4" : "rgba(204,255,61,.8)";
                c2d.fillText(MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0], i * fs, y);
              }
              drops[i] = y > h && Math.random() > 0.975 ? 0 : drops[i] + 1;
            }
          };
          const onKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            stopRain();
          };
          const cancel = () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("keydown", onKey, true);
          };
          const stopRain = () => {
            if (ended) return;
            ended = true;
            cancel();
            matrixCancelRef.current = null;
            gsap.to(canvas, { opacity: 0, duration: 0.45, ease: "power2.out", onComplete: () => canvas.remove() });
            done();
          };
          matrixCancelRef.current = cancel;
          window.addEventListener("keydown", onKey, true);
          raf = requestAnimationFrame(draw);
          schedule(stopRain, 6000);
        },
      },
      { kind: "pause", ms: 250 },
      li("wake up, recruiter.", "text-accent"),
    ],
    [schedule],
  );

  /* ---------------- interpreter ---------------- */

  const run = useCallback(
    (raw: string) => {
      const lower = raw.trim().toLowerCase();
      const [head = "", ...rest] = lower.split(/\s+/);
      const arg = rest.join(" ");
      switch (head) {
        case "help":
          pushOut(HELP_ITEMS);
          break;
        case "whoami":
          pushOut(WHOAMI_ITEMS);
          break;
        case "ls":
          pushOut(
            !arg || arg === "projects" || arg === "-l" || arg === "-la"
              ? LS_ITEMS
              : [li(`ls: cannot access '${arg}' — it's 'ls projects' here`, "text-accent3", true)],
          );
          break;
        case "cat":
          pushOut(buildCat(arg));
          break;
        case "stack":
        case "skills":
          pushOut(STACK_ITEMS);
          break;
        case "contact":
        case "social":
          pushOut(CONTACT_ITEMS);
          break;
        case "history": {
          const h = historyRef.current;
          pushOut(
            h.length
              ? h.map((c, i) => hi(`<span class="text-faint">${String(i + 1).padStart(4, " ")}</span>  ${esc(c)}`))
              : [li("history: empty", "text-faint", true)],
          );
          break;
        }
        case "clear":
          pushOut([
            {
              kind: "action",
              run: (done) => {
                if (outRef.current) outRef.current.innerHTML = "";
                done();
              },
            },
          ]);
          break;
        case "sudo":
          pushOut(buildSudo(arg));
          break;
        case "queue":
          pushOut(arg === "--bypass" ? buildQueue() : [li("usage: queue --bypass", "text-muted", true)]);
          break;
        case "matrix":
          pushOut(buildMatrix());
          break;
        case "exit":
        case "quit":
          pushOut([
            {
              kind: "action",
              run: (done) => {
                requestClose();
                done();
              },
            },
          ]);
          break;
        default:
          pushOut([li(`command not found: ${head} — try 'help'`, "text-accent3", true)]);
      }
    },
    [pushOut, buildSudo, buildQueue, buildMatrix, requestClose],
  );

  const execTyped = useCallback(
    (cmd: string) => {
      echo(cmd);
      historyRef.current.push(cmd);
      histIdxRef.current = historyRef.current.length;
      run(cmd);
    },
    [echo, run],
  );

  /* ---------------- global triggers ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" && e.key !== "~") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))
        return;
      e.preventDefault();
      if (openRef.current) requestClose();
      else setOpen(true);
    };
    const onTerminal = (e: Event) => {
      const d = (e as CustomEvent<{ open?: boolean; cmd?: string }>).detail ?? {};
      const cmd = d.cmd?.trim() || null;
      if (openRef.current) {
        if (d.open === false || (d.open === undefined && !cmd)) {
          requestClose();
          return;
        }
        if (cmd) execTyped(cmd);
      } else {
        if (d.open === false) return;
        pendingRef.current = cmd;
        setOpen(true);
      }
    };
    const onKonami = () => {
      if (openRef.current) {
        pushOut(KONAMI_ITEMS);
        return;
      }
      pendingRef.current = KONAMI_SENTINEL;
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mythic:terminal", onTerminal as EventListener);
    window.addEventListener("mythic:konami", onKonami);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mythic:terminal", onTerminal as EventListener);
      window.removeEventListener("mythic:konami", onKonami);
    };
  }, [requestClose, execTyped, pushOut]);

  /* ---------------- window lifecycle ---------------- */

  useLayoutEffect(() => {
    if (!open) return;
    const win = winRef.current;
    const out = outRef.current;
    if (!win || !out) return;
    closingRef.current = false;
    if (savedRef.current) out.innerHTML = savedRef.current;
    out.scrollTop = out.scrollHeight;

    const ctx = gsap.context(() => {
      if (prefersReduced()) {
        gsap.fromTo(win, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
      } else {
        gsap.fromTo(
          win,
          { y: 28, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "expo.out" },
        );
      }
    }, win);

    if (!bootedRef.current) {
      bootedRef.current = true;
      pushOut(BANNER_ITEMS);
    }
    schedule(() => {
      const p = pendingRef.current;
      pendingRef.current = null;
      if (!p) return;
      if (p === KONAMI_SENTINEL) pushOut(KONAMI_ITEMS);
      else execTyped(p);
    }, 360);
    inputRef.current?.focus({ preventScroll: true });

    /* ESC closes; everything else must not leak to global hotkey handlers */
    const onWinKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      e.stopPropagation();
    };
    win.addEventListener("keydown", onWinKey);

    const inputEl = inputRef.current;
    const onInKey = (e: KeyboardEvent) => inputKeyRef.current(e);
    inputEl?.addEventListener("keydown", onInKey);

    return () => {
      savedRef.current = out.innerHTML;
      win.removeEventListener("keydown", onWinKey);
      inputEl?.removeEventListener("keydown", onInKey);
      ctx.revert();
      clearTimers();
      matrixCancelRef.current?.();
      matrixCancelRef.current = null;
      queueRef.current = [];
      busyRef.current = false;
    };
  }, [open, pushOut, execTyped, requestClose, schedule, clearTimers]);

  /* ---------------- input handlers ---------------- */

  const setLine = (v: string) => {
    setVal(v);
    setCaret(v.length);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(v.length, v.length));
  };

  const submit = () => {
    const raw = val;
    setLine("");
    echo(raw);
    const cmd = raw.trim();
    if (!cmd) return;
    historyRef.current.push(cmd);
    histIdxRef.current = historyRef.current.length;
    run(cmd);
  };

  const navHist = (dir: -1 | 1) => {
    const h = historyRef.current;
    if (!h.length) return;
    const i = Math.max(0, Math.min(h.length, histIdxRef.current + dir));
    histIdxRef.current = i;
    setLine(i === h.length ? "" : h[i]);
  };

  const complete = () => {
    const lower = val.toLowerCase();
    const pool = lower.startsWith("cat ")
      ? SLUGS.map((s) => `cat ${s}`).filter((s) => s.startsWith(lower))
      : COMPLETIONS.filter((c) => c.startsWith(lower) && c.length > lower.length);
    if (!pool.length) return;
    if (pool.length === 1) {
      setLine(pool[0]);
      return;
    }
    const p = lcp(pool);
    if (p.length > val.length) setLine(p);
    else pushOut([hi(`<span class="text-faint">${esc(pool.map((s) => s.trim()).join("   "))}</span>`)]);
  };

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      navHist(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navHist(1);
      return;
    }
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      complete();
      return;
    }
    if (e.key.toLowerCase() === "c" && e.ctrlKey && !e.metaKey) {
      const el = inputRef.current;
      if (el && el.selectionStart === el.selectionEnd) {
        e.preventDefault();
        pushOut([
          hi(
            `<span class="text-accent">${PROMPT}</span> <span class="text-text">${esc(val)}</span><span class="text-faint">^C</span>`,
            "mterm-echo",
          ),
        ]);
        setLine("");
      }
      return;
    }
    if (e.key.toLowerCase() === "l" && e.ctrlKey) {
      e.preventDefault();
      if (outRef.current) outRef.current.innerHTML = "";
    }
  };
  inputKeyRef.current = onInputKey;

  const caretPos = Math.min(caret, val.length);
  const before = val.slice(0, caretPos);
  const atChar = val.charAt(caretPos);
  const after = val.slice(caretPos + 1);

  return (
    <>
      <style>{`
        .mterm-line { min-height: 1.25em; white-space: pre-wrap; word-break: break-word; }
        .mterm-line.is-pre { white-space: pre; word-break: normal; }
        .mterm-echo { margin-top: .7em; }
        .mterm-echo:first-child { margin-top: 0; }
        .mterm-link { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(204,255,61,.4); transition: color .2s, text-decoration-color .2s; }
        .mterm-link:hover { color: #fff; text-decoration-color: #fff; }
        .mterm-out { overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.16) transparent; }
        .mterm-out::-webkit-scrollbar { width: 8px; height: 8px; }
        .mterm-out::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 4px; }
        .mterm-out::-webkit-scrollbar-track { background: transparent; }
        .mterm-caret { display: inline-block; min-width: .6ch; background: var(--accent); color: #000; animation: mterm-blink 1.1s step-end infinite; }
        .mterm-caret.is-idle { animation: none; background: transparent; box-shadow: inset 0 0 0 1px var(--accent); color: inherit; }
        .mterm-real::selection { background: transparent; }
        .mterm-matrix { position: absolute; inset: 0; z-index: 5; background: #0b0b0e; }
        .mterm-launch { animation: mterm-ping 10s cubic-bezier(.22,1,.36,1) infinite 5s; }
        .mterm-launch.is-quiet { animation: none; }
        @keyframes mterm-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes mterm-ping {
          0%, 88% { box-shadow: 0 0 0 0 rgba(204,255,61,0); }
          90% { box-shadow: 0 0 0 0 rgba(204,255,61,.35); }
          100% { box-shadow: 0 0 0 14px rgba(204,255,61,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mterm-launch { animation: none; }
          .mterm-caret { animation: none; }
        }
      `}</style>

      {/* launcher removed per request — the terminal still opens via the
          backtick/tilde key, the ⌘K command palette ("Open terminal"), the
          footer version string, and the "mythic:terminal" event. launchRef
          stays declared (its .focus() calls are safe no-ops while null). */}

      {/* window */}
      {open && (
        <div
          ref={winRef}
          role="dialog"
          aria-label="Interactive terminal — uday@portfolio"
          className="terminal-open fixed z-[950] flex flex-col overflow-hidden rounded-lg border border-line bg-[#0b0b0e]/95 shadow-2xl backdrop-blur max-md:inset-x-3 max-md:bottom-3 max-md:top-[20%] md:bottom-28 md:left-6 md:h-[min(440px,70vh)] md:w-[min(620px,92vw)]"
          onClick={() => {
            const sel = document.getSelection();
            if (sel && !sel.isCollapsed) return;
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          {/* title bar */}
          <div className="flex items-center justify-between gap-3 border-b border-line bg-bg-soft/60 px-4 py-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90" />
            </div>
            <span className="select-none font-mono text-[.66rem] tracking-[.08em] text-muted">
              uday@portfolio: ~
            </span>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close terminal"
              className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors duration-200 hover:text-accent3 focus-visible:text-accent3 focus-visible:outline-none"
            >
              <span aria-hidden className="text-[.85rem] leading-none">
                ✕
              </span>
            </button>
          </div>

          {/* output */}
          <div ref={wrapRef} className="relative min-h-0 flex-1">
            <div
              ref={outRef}
              role="log"
              aria-live="off"
              data-lenis-prevent
              className="mterm-out h-full overflow-y-auto overflow-x-auto p-4 pb-2 font-mono text-[.8rem] leading-relaxed text-muted max-md:text-[.72rem]"
            />
          </div>

          {/* prompt */}
          <div className="flex items-center gap-2 border-t border-line px-4 py-3">
            <span className="shrink-0 select-none font-mono text-[.8rem] text-accent">{PROMPT}</span>
            <div className="relative min-w-0 flex-1 font-mono text-[.8rem] leading-[1.5] text-text">
              <span aria-hidden className="pointer-events-none block overflow-hidden whitespace-pre">
                {before}
                <span className={`mterm-caret${focused ? "" : " is-idle"}`}>{atChar || " "}</span>
                {after}
              </span>
              <input
                ref={inputRef}
                value={val}
                onChange={(e) => {
                  setVal(e.target.value);
                  setCaret(e.target.selectionStart ?? e.target.value.length);
                }}
                onSelect={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="send"
                aria-label="Terminal command input"
                className="mterm-real absolute inset-0 h-full w-full border-0 bg-transparent p-0 font-mono text-[.8rem] text-transparent caret-transparent outline-none max-md:text-[16px]"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
