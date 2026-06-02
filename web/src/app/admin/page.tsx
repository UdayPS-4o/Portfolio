"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────── types ────────────────────────── */

interface DashboardData {
  visits: Visit[];
  identities: Identity[];
  chatMessages: ChatMsg[];
  liveConnections: LiveConn[];
  stats: Stats;
}

interface Stats {
  totalVisits: number;
  uniqueVisitors: number;
  liveConnections: number;
  totalMessages: number;
}

interface Visit {
  id: string;
  visitorId: string;
  ip: string;
  city: string;
  country: string;
  device: string;
  os: string;
  browser: string;
  gpu: string;
  fingerprint: string;
  createdAt: string;
}

interface Identity {
  fingerprint: string;
  ip: string;
  visitorId: string;
  device: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  hits: number;
}

interface LiveConn {
  id: string;
  visitorId: string;
  device: string;
  ip: string;
  fingerprint: string;
}

interface ChatMsg {
  id?: string;
  name: string;
  text: string;
  ts: string;
  isAdmin?: boolean;
  visitorId?: string;
}

/* ────────────────────────── constants ────────────────────── */

const API_BASE =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:4000";
const WS_URL =
  process.env.NODE_ENV === "production"
    ? `wss://${typeof window !== "undefined" ? window.location.host : ""}/ws`
    : "ws://localhost:4000/ws";

const TABS = ["Live", "Visits", "Identity Graph", "Chat"] as const;
type Tab = (typeof TABS)[number];

/* ────────────────────────── component ────────────────────── */

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("Live");
  const [chatInput, setChatInput] = useState("");
  const [wsMessages, setWsMessages] = useState<ChatMsg[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    document.body.style.cursor = "default";

    const savedToken = localStorage.getItem("admin_token");
    setToken(savedToken);

    const checkAuth = async () => {
      try {
        const headers: HeadersInit = {};
        if (savedToken) {
          headers["Authorization"] = `Bearer ${savedToken}`;
        }
        const res = await fetch(`${API_BASE}/api/admin/auth-status`, { headers });
        if (res.ok) {
          const status = await res.json();
          setIsSetupRequired(status.setupRequired);
          if (status.authenticated && savedToken) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();

    return () => {
      document.body.style.cursor = "none";
    };
  }, []);

  /* ── fetch dashboard ── */
  const fetchDashboard = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          localStorage.removeItem("admin_token");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboard();
      const iv = setInterval(fetchDashboard, 5000);
      return () => clearInterval(iv);
    }
  }, [fetchDashboard, isAuthenticated]);

  /* ── websocket ── */
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const params = new URLSearchParams({
      vid: "admin-udayps",
      device: "pc",
      fp: "admin",
      token: token,
    });
    const ws = new WebSocket(`${WS_URL}?${params}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "name", name: "udayps" }));
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "chat") {
          const chat = msg.message;
          if (chat) {
            setWsMessages((prev) => [
              ...prev,
              {
                name: chat.name ?? "anon",
                text: chat.text,
                ts: chat.ts ?? new Date().toISOString(),
                isAdmin: !!(chat.isAdmin || chat.name === "udayps" || chat.visitorId === "admin-udayps"),
                visitorId: chat.visitorId,
              },
            ]);
          }
        } else if (msg.type === "history") {
          setWsMessages([]);
          if (data) {
            setData((prev) => prev ? { ...prev, chatMessages: msg.messages || [] } : null);
          }
        }
      } catch {
        /* ignore non-json frames */
      }
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, token]);

  /* auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wsMessages, data?.chatMessages]);

  /* ── login/setup submission ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Login failed");
      }
      localStorage.setItem("admin_token", resData.token);
      setToken(resData.token);
      setIsAuthenticated(true);
      setIsSetupRequired(false);
      setLoginPassword("");
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  /* ── logout ── */
  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      localStorage.removeItem("admin_token");
      setToken(null);
      setIsAuthenticated(false);
      // Re-check setup status
      try {
        const res = await fetch(`${API_BASE}/api/admin/auth-status`);
        const status = await res.json();
        setIsSetupRequired(status.setupRequired);
      } catch {}
    }
  };

  /* ── clear chat cache ── */
  const clearChatCache = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to clear the active chat room? The messages will remain saved in the database, but cleared from the live screen.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/clear-chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setWsMessages([]);
        if (data) {
          setData({
            ...data,
            chatMessages: [],
          });
        }
      } else {
        alert("Failed to clear chat room");
      }
    } catch (err) {
      console.error(err);
      alert("Error calling clear-chat");
    }
  };

  /* ── send chat ── */
  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({
        type: "chat",
        text: chatInput.trim(),
        name: "udayps",
        isAdmin: true,
      })
    );
    setChatInput("");
    inputRef.current?.focus();
  };

  /* ── helpers ── */
  const truncate = (s: string, n = 10) =>
    s && s.length > n ? s.slice(0, n) + "…" : s ?? "—";

  const fmtTime = (s: string | number) => {
    try {
      return new Date(Number(s)).toLocaleString();
    } catch {
      return String(s);
    }
  };

  const stats = data?.stats;

  /* ── merge chat: API history + live ws ── */
  const allChat: ChatMsg[] = [
    ...(data?.chatMessages ?? []),
    ...wsMessages.filter(
      (wm) =>
        !(data?.chatMessages ?? []).some(
          (dm) => dm.ts === wm.ts && dm.text === wm.text
        )
    ),
  ].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  /* ────────────────────────── render ────────────────────────── */

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709] text-[#ededf0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ccff3d] border-t-transparent" />
          <span className="text-sm font-medium tracking-widest text-[#8a8a93] uppercase">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#131318] p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-wider uppercase" style={{ color: "#ccff3d" }}>
              {isSetupRequired ? "Create Admin Credentials" : "Admin Login"}
            </h1>
            <p className="mt-2 text-xs text-[#8a8a93]">
              {isSetupRequired
                ? "Setup username and password to secure your admin panel"
                : "Enter credentials to access the admin dashboard"}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#8a8a93] mb-1.5 font-semibold">Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#ededf0] placeholder-[#54545c] outline-none transition-colors focus:border-[#ccff3d]/40 focus:bg-white/[0.06]"
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#8a8a93] mb-1.5 font-semibold">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#ededf0] placeholder-[#54545c] outline-none transition-colors focus:border-[#ccff3d]/40 focus:bg-white/[0.06]"
              />
            </div>

            {loginError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full rounded-lg bg-[#ccff3d] py-3 text-sm font-bold text-black transition-all hover:brightness-110"
            >
              {isSetupRequired ? "Create & Sign In" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-12">
      {/* ── header ── */}
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wider" style={{ color: "#ccff3d" }}>
              ADMIN PANEL
            </h1>
            <p className="mt-1 text-sm text-[#8a8a93]">
              Portfolio dashboard &middot;{" "}
              <span className={wsConnected ? "text-green-400" : "text-red-400"}>
                {wsConnected ? "WS connected" : "WS disconnected"}
              </span>
              {error && (
                <span className="ml-3 text-red-400">API: {error}</span>
              )}
            </p>
          </div>

          {/* stats bar & logout */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: "Visits", value: stats?.totalVisits ?? "—" },
              { label: "Unique", value: stats?.uniqueVisitors ?? "—" },
              {
                label: "Live",
                value: stats?.liveConnections ?? "—",
                live: true,
              },
              { label: "Messages", value: stats?.totalMessages ?? "—" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#131318]/80 px-4 py-2 backdrop-blur-sm"
              >
                {s.live && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
                <span className="text-xs uppercase tracking-widest text-[#8a8a93]">
                  {s.label}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {s.value}
                </span>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#ccff3d]/20 bg-[#ccff3d]/5 hover:bg-[#ccff3d]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#ccff3d] transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* tab switcher */}
        <div className="mt-6 flex gap-1 rounded-xl border border-white/[0.06] bg-[#0e0e12]/60 p-1 backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-2 text-sm font-medium tracking-wide transition-all ${
                tab === t
                  ? "bg-[#ccff3d]/10 text-[#ccff3d] shadow-inner"
                  : "text-[#8a8a93] hover:bg-white/[0.04] hover:text-[#ededf0]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* ── panels ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#131318]/60 shadow-2xl shadow-black/40 backdrop-blur-md">
        {/* ─── Live ─── */}
        {tab === "Live" && (
          <Panel title="Live Connections" count={data?.liveConnections?.length}>
            <Table
              heads={["ID", "Visitor ID", "Device", "IP", "Fingerprint"]}
              rows={(data?.liveConnections ?? []).map((c) => [
                truncate(c.id, 12),
                truncate(c.visitorId, 16),
                c.device || "—",
                c.ip || "—",
                truncate(c.fingerprint, 14),
              ])}
              emptyMsg="No active connections"
            />
          </Panel>
        )}

        {/* ─── Visits ─── */}
        {tab === "Visits" && (
          <Panel title="Recent Visits" count={data?.visits?.length}>
            <Table
              heads={[
                "Time",
                "Visitor ID",
                "IP",
                "City",
                "Country",
                "Device",
                "OS",
                "Browser",
                "GPU",
                "Fingerprint",
              ]}
              rows={(data?.visits ?? []).map((v) => [
                fmtTime(v.createdAt),
                truncate(v.visitorId, 14),
                v.ip || "—",
                v.city || "—",
                v.country || "—",
                v.device || "—",
                v.os || "—",
                v.browser || "—",
                truncate(v.gpu, 20),
                truncate(v.fingerprint, 14),
              ])}
              emptyMsg="No visits recorded yet"
            />
          </Panel>
        )}

        {/* ─── Identity Graph ─── */}
        {tab === "Identity Graph" && (
          <Panel title="Identity Graph" count={data?.identities?.length}>
            <IdentityTable identities={data?.identities ?? []} />
          </Panel>
        )}

        {/* ─── Chat ─── */}
        {tab === "Chat" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
            {/* sub-header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[#8a8a93]">
                Live Chat Cache
              </h2>
              <button
                onClick={clearChatCache}
                className="rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-400 transition-colors"
              >
                Clear Live Room
              </button>
            </div>
            {/* messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {allChat.length === 0 && (
                <div className="flex h-full items-center justify-center text-[#54545c]">
                  No messages yet
                </div>
              )}
              <div className="space-y-3">
                {allChat.map((m, i) => {
                  const isAdmin = m.isAdmin || m.name === "udayps";
                  return (
                    <div
                      key={`${m.ts}-${i}`}
                      className={`group flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[70%] rounded-xl px-4 py-2.5 ${
                          isAdmin
                            ? "rounded-br-sm bg-gradient-to-br from-[#ccff3d]/[0.12] to-[#ccff3d]/[0.05] border border-[#ccff3d]/30"
                            : "rounded-bl-sm bg-white/[0.04] border border-white/[0.06]"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isAdmin ? "text-[#ccff3d]" : "text-[#8a8a93]"
                            }`}
                          >
                            {m.name || "anon"}
                          </span>
                          <span className="ml-auto text-[10px] text-[#54545c] opacity-0 transition-opacity group-hover:opacity-100">
                            {fmtTime(m.ts)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[#ededf0]">
                          {m.text}
                        </p>
                        {m.visitorId && (
                          <span className="mt-1 block text-[10px] text-[#54545c]">
                            vid: {truncate(m.visitorId, 16)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* input bar */}
            <div className="border-t border-white/[0.06] bg-[#0e0e12]/80 p-4 backdrop-blur-sm">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Send as admin…"
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#ededf0] placeholder-[#54545c] outline-none transition-colors focus:border-[#ccff3d]/40 focus:bg-white/[0.06]"
                  style={{ cursor: "text" }}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || !wsConnected}
                  className="rounded-lg bg-[#ccff3d] px-6 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── sub-components ────────────────── */

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#8a8a93]">
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs tabular-nums text-[#ccff3d]">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Table({
  heads,
  rows,
  emptyMsg,
}: {
  heads: string[];
  rows: string[][];
  emptyMsg: string;
}) {
  return (
    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-[#131318]">
          <tr>
            {heads.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-white/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#54545c]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={heads.length}
                className="px-4 py-16 text-center text-[#54545c]"
              >
                {emptyMsg}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#ededf0]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function IdentityTable({ identities }: { identities: Identity[] }) {
  /* group by IP */
  const grouped = new Map<string, Identity[]>();
  for (const id of identities) {
    const key = id.ip || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(id);
  }

  const heads = [
    "Fingerprint",
    "IP",
    "Visitor ID",
    "Device",
    "Name",
    "First Seen",
    "Last Seen",
    "Hits",
  ];

  const fmtTime = (s: string | number) => {
    try {
      return new Date(Number(s)).toLocaleString();
    } catch {
      return String(s);
    }
  };

  const truncate = (s: string, n = 14) =>
    s && s.length > n ? s.slice(0, n) + "…" : s ?? "—";

  return (
    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-[#131318]">
          <tr>
            {heads.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-white/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#54545c]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {identities.length === 0 ? (
            <tr>
              <td
                colSpan={heads.length}
                className="px-4 py-16 text-center text-[#54545c]"
              >
                No identity data
              </td>
            </tr>
          ) : (
            Array.from(grouped.entries()).map(([ip, group], gi) =>
                group.map((id, i) => (
                  <tr
                    key={`${ip}-${i}-${gi}`}
                    className={`border-b transition-colors hover:bg-white/[0.02] ${
                      i === 0 && gi > 0
                        ? "border-t-2 border-t-[#ccff3d]/20 border-b-white/[0.03]"
                        : "border-b-white/[0.03]"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#ededf0]">
                      {truncate(id.fingerprint)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#ededf0]">
                      {i === 0 && (
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#ccff3d]/40" />
                      )}
                      {id.ip || "—"}
                      {group.length > 1 && i === 0 && (
                        <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#8a8a93]">
                          {group.length}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#ededf0]">
                      {truncate(id.visitorId, 16)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#ededf0]">
                      {id.device || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#ededf0]">
                      {id.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#8a8a93]">
                      {fmtTime(id.firstSeen)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#8a8a93]">
                      {fmtTime(id.lastSeen)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold tabular-nums text-[#ccff3d]">
                      {id.hits}
                    </td>
                  </tr>
                ))
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
