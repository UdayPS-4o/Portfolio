"use client";

import { useEffect, useState, useRef } from "react";
import Hero3D from "@/components/Hero3D";

export default function HeroVariationsPage() {
  const [mounted, setMounted] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync clock time
  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
      setClockTime(fmt.format(new Date()));
    };
    updateTime();
    const iv = setInterval(updateTime, 1000);
    return () => clearInterval(iv);
  }, []);

  // simulated console logs for Terminal variant
  useEffect(() => {
    if (!mounted) return;
    const logPool = [
      "sys_init: boot core services... OK",
      "identity_graph: linking visitor session hashes... SUCCESS",
      "presence: active connection list synced",
      "telemetry: active locationइंदौर / India",
      "rpa_engine: executing automation schedule #296",
      "security: checking session privileges... ADMIN",
      "stack_audit: nodejs / typescript / python active",
      "reverse_eng: decompiling client canvas vectors... DONE",
      "ai_agent: active chat monitor running",
    ];
    let i = 0;
    const addLog = () => {
      setTerminalLogs((prev) => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${logPool[i]}`]);
      i = (i + 1) % logPool.length;
    };
    addLog();
    const iv = setInterval(addLog, 2200);
    return () => clearInterval(iv);
  }, [mounted]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  if (!mounted) return null;

  return (
    <div className="bg-[#070709] text-[#ededf0] selection:bg-[#ccff3d] selection:text-black min-h-screen">
      {/* ── top header navigation bar ── */}
      <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-[#ccff3d] uppercase">Hero Screens Preview</h1>
          <p className="text-[10px] text-[#8a8a93] uppercase mt-0.5">5 Premium Layout Variations</p>
        </div>
        <nav className="hidden md:flex gap-4">
          {["Cosmic Split", "Cyber-Grid", "Retro CLI", "Bento Grid", "Vibrant Nebula"].map((name, i) => (
            <a
              key={name}
              href={`#var-${i + 1}`}
              className="text-xs uppercase tracking-wider text-[#8a8a93] hover:text-[#ccff3d] transition-colors"
            >
              V{i + 1}: {name}
            </a>
          ))}
        </nav>
      </header>

      {/* ── VARIATION 1 ── */}
      <section
        id="var-1"
        className="relative h-[90vh] border-b border-white/[0.06] flex items-center overflow-hidden"
      >
        <div className="absolute top-6 left-6 z-[10] rounded bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#ccff3d]">
          Variation 1: Cosmic Split
        </div>
        {/* Canvas background on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-[55%] pointer-events-none z-[1] select-none opacity-80">
          <Hero3D />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-[55%] bg-gradient-to-r from-[#070709] via-transparent to-transparent pointer-events-none z-[2]" />
        
        <div className="relative z-[3] max-w-4xl pad-x pointer-events-none flex flex-col gap-6">
          <div className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.25em] text-[#ccff3d]">
            <span>Full-Stack</span>
            <span className="text-white/20">·</span>
            <span>RPA / AI Workflows</span>
            <span className="text-white/20">·</span>
            <span>Reverse Engineering</span>
          </div>
          <h2 className="font-display text-[clamp(2rem,6vw,5.5rem)] font-semibold leading-[1.0] tracking-[-.02em]">
            Uday Pratap <br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1px #ededf0" }}>Singh Parihar</span>
          </h2>
          <p className="max-w-[44ch] text-sm md:text-base leading-relaxed text-[#8a8a93] pointer-events-auto">
            I ship production features and design autonomous workflows. Building AI products and system integrations that solve complex technical bottlenecks.
          </p>
          <div className="flex gap-8 font-display text-xs tracking-wider text-[#8a8a93]">
            <span>Indore, India</span>
            <span>{clockTime}</span>
          </div>
        </div>
      </section>

      {/* ── VARIATION 2 ── */}
      <section
        id="var-2"
        className="relative h-[90vh] border-b border-white/[0.06] flex items-center overflow-hidden bg-[#070709]"
      >
        <div className="absolute top-6 left-6 z-[10] rounded bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#ccff3d]">
          Variation 2: Cyber-Grid &amp; Telemetry
        </div>
        
        {/* Cyber perspective grid lines in background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none z-[1]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(204, 255, 61, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(204, 255, 61, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            transform: "perspective(500px) rotateX(60deg) translateY(-200px) translateZ(-100px)",
            transformOrigin: "top center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent pointer-events-none z-[2]" />

        <div className="relative z-[3] w-full pad-x grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-5 pointer-events-none">
            <span className="font-mono text-xs text-[#ccff3d] tracking-widest uppercase border border-[#ccff3d]/30 bg-[#ccff3d]/5 px-3 py-1 rounded w-fit">
              System Operator // Live
            </span>
            <h2 className="font-mono text-[clamp(2rem,5vw,4.5rem)] font-bold uppercase tracking-tight leading-[0.95]">
              Uday Pratap <br />
              <span className="text-[#ccff3d]">Singh Parihar</span>
            </h2>
            <p className="font-mono max-w-[48ch] text-xs md:text-sm text-[#8a8a93] leading-relaxed mt-2">
              &gt; Shifting tech barriers through deep reverse engineering, server automation pipelines, and robust full-stack logic architectures.
            </p>
          </div>

          <div className="lg:col-span-5 relative pointer-events-auto">
            {/* Glassmorphic Live Diagnostic telemetry box */}
            <div className="rounded-xl border border-white/[0.08] bg-[#131318]/50 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
                <span className="font-mono text-xs uppercase tracking-widest text-[#ccff3d] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ccff3d] animate-ping" />
                  Telemetry Node
                </span>
                <span className="font-mono text-[10px] text-[#54545c]">UPtime: v2.6.2</span>
              </div>
              <ul className="space-y-2.5 font-mono text-[11px] text-[#8a8a93]">
                <li className="flex justify-between">
                  <span>Host Location:</span>
                  <span className="text-white">Indore, India</span>
                </li>
                <li className="flex justify-between">
                  <span>Target Stack:</span>
                  <span className="text-white">Node / Python / TS</span>
                </li>
                <li className="flex justify-between">
                  <span>Connection:</span>
                  <span className="text-[#ccff3d]">100% SECURE_WS</span>
                </li>
                <li className="flex justify-between">
                  <span>Current Time:</span>
                  <span className="text-white">{clockTime}</span>
                </li>
              </ul>
              <div className="mt-4 border-t border-white/[0.06] pt-4 flex gap-2">
                <span className="text-[10px] bg-white/[0.04] px-2.5 py-1 rounded text-white border border-white/[0.08]">#rpa</span>
                <span className="text-[10px] bg-white/[0.04] px-2.5 py-1 rounded text-white border border-white/[0.08]">#reverse-engineering</span>
                <span className="text-[10px] bg-[#ccff3d]/10 px-2.5 py-1 rounded text-[#ccff3d] border border-[#ccff3d]/20">#ai-agents</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VARIATION 3 ── */}
      <section
        id="var-3"
        className="relative h-[90vh] border-b border-white/[0.06] flex items-center overflow-hidden bg-[#070709]"
      >
        <div className="absolute top-6 left-6 z-[10] rounded bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#ccff3d]">
          Variation 3: Retro CLI Console
        </div>
        
        {/* CRT Scanline / Dot background */}
        <div 
          className="absolute inset-0 pointer-events-none z-[1] opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, #ccff3d 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-[3] w-full pad-x flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex flex-col gap-4 max-w-xl">
            <h2 className="font-mono text-[3rem] md:text-[4.5rem] font-bold tracking-wider leading-[1.0] text-white">
              UDAY.PS<span className="animate-pulse text-[#ccff3d]">_</span>
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-[#ccff3d]/80 leading-relaxed">
              [+] Specialist in autonomous RPA workflows, AI tool chains, and application analysis.
            </p>
          </div>

          {/* Interactive Shell Terminal */}
          <div className="w-full md:w-[480px] rounded-lg border border-white/[0.08] bg-[#0c0c10] overflow-hidden shadow-2xl font-mono text-xs pointer-events-auto">
            <div className="bg-[#131318] px-4 py-2 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-white text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                udayps@terminal:~
              </span>
              <span className="text-[9px] text-[#54545c]">ttyS001</span>
            </div>
            
            <div className="p-4 space-y-2 h-[220px] overflow-y-auto text-[#8a8a93] scrollbar-none">
              <p className="text-white">Connecting to udayps.dev:443...</p>
              <p className="text-green-400">Connection established. Loading modules.</p>
              {terminalLogs.map((log, index) => (
                <p key={index} className="text-[#ededf0] leading-snug">{log}</p>
              ))}
              <div ref={terminalEndRef} />
            </div>
            
            <div className="border-t border-white/[0.06] px-4 py-2 flex items-center bg-[#070709] text-[#ccff3d]">
              <span className="mr-2">&gt;</span>
              <input 
                type="text" 
                disabled 
                placeholder="RPA monitor daemon active..."
                className="bg-transparent border-none outline-none text-xs text-[#ededf0] w-full font-mono placeholder-[#54545c] cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── VARIATION 4 ── */}
      <section
        id="var-4"
        className="relative min-h-[90vh] border-b border-white/[0.06] flex items-center py-12 overflow-hidden bg-[#070709]"
      >
        <div className="absolute top-6 left-6 z-[10] rounded bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#ccff3d]">
          Variation 4: Premium Bento Grid
        </div>

        <div className="relative z-[3] w-full pad-x mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 pointer-events-auto">
          {/* Main Title Tile */}
          <div className="md:col-span-3 rounded-2xl border border-white/[0.06] bg-[#131318]/50 p-8 flex flex-col justify-between min-h-[220px] backdrop-blur hover:border-[#ccff3d]/30 transition-all duration-300">
            <span className="text-xs uppercase tracking-widest text-[#8a8a93]">Principal Engineer</span>
            <div>
              <h2 className="font-display text-[2.8rem] md:text-[4.5rem] font-bold leading-[1.0] tracking-tight">
                Uday Pratap <span className="text-[#ccff3d]">Singh Parihar</span>
              </h2>
            </div>
          </div>

          {/* Stats Tile */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#131318]/50 p-6 flex flex-col justify-between backdrop-blur hover:border-[#ccff3d]/30 transition-all duration-300">
            <span className="text-xs uppercase tracking-widest text-[#8a8a93]">Node telemetry</span>
            <div className="space-y-1">
              <div className="text-4xl font-bold font-mono tracking-tight text-[#ccff3d]">24H</div>
              <p className="text-[10px] uppercase text-[#8a8a93] tracking-widest">Active Automation Loops</p>
            </div>
          </div>

          {/* Tagline Tile */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#131318]/50 p-6 flex flex-col justify-between backdrop-blur hover:border-[#ccff3d]/30 transition-all duration-300">
            <span className="text-xs uppercase tracking-widest text-[#8a8a93]">Philosophy</span>
            <p className="text-xs text-[#ededf0] leading-relaxed">
              I program workflows that connect databases, APIs, LLMs, and systems into automated nodes.
            </p>
          </div>

          {/* Stack Tile */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-[#131318]/50 p-6 flex flex-col justify-between backdrop-blur hover:border-[#ccff3d]/30 transition-all duration-300">
            <span className="text-xs uppercase tracking-widest text-[#8a8a93]">Stack Capabilities</span>
            <div className="flex flex-wrap gap-2 mt-4">
              {["TypeScript", "Python", "Express", "SQLite", "Three.js", "Docker", "RPA Pipelines"].map((s) => (
                <span key={s} className="text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded text-white hover:border-[#ccff3d]/40 transition-colors">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Contact / Clock Tile */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#131318]/50 p-6 flex flex-col justify-between backdrop-blur hover:border-[#ccff3d]/30 transition-all duration-300">
            <span className="text-xs uppercase tracking-widest text-[#8a8a93]">Time Sync</span>
            <div>
              <div className="text-lg font-semibold text-white font-mono tracking-tight">{clockTime}</div>
              <p className="text-[10px] uppercase text-[#8a8a93] tracking-widest mt-1">Indore / IST</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VARIATION 5 ── */}
      <section
        id="var-5"
        className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-[#070709]"
      >
        <div className="absolute top-6 left-6 z-[10] rounded bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#ccff3d]">
          Variation 5: Vibrant Nebula Gradient
        </div>

        {/* Ambient moving gradient nebula blobs in background */}
        <div className="absolute inset-0 pointer-events-none z-[1] select-none filter blur-[120px] opacity-40">
          <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-[#ccff3d]/25 animate-[pulse_10s_infinite]" />
          <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-[#7c5cff]/20 animate-[pulse_12s_infinite_1.5s]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/20 to-[#070709] pointer-events-none z-[2]" />

        <div className="relative z-[3] max-w-4xl text-center flex flex-col items-center gap-6 pointer-events-none">
          <div className="reveal-fade flex gap-2 font-display text-[10px] uppercase tracking-[0.3em] text-[#ccff3d]">
            <span>Full-Stack Builder</span>
            <span className="text-white/20">//</span>
            <span>RPA Engineer</span>
            <span className="text-white/20">//</span>
            <span>System Automation</span>
          </div>
          
          <h2 className="font-display text-[3.2rem] md:text-[6.5rem] font-extrabold leading-[0.9] tracking-tighter">
            UDAY PRATAP <br />
            <span className="text-transparent" style={{ WebkitTextStroke: "1.5px #ccff3d" }}>SINGH PARIHAR</span>
          </h2>
          
          <p className="max-w-[48ch] text-xs md:text-sm text-[#8a8a93] leading-relaxed mt-2 pointer-events-auto">
            I craft performance-driven backends, interactive user experiences, and automated system pipelines. Helping teams bridge the gap between software stacks and business logic.
          </p>

          <div className="flex gap-4 pointer-events-auto mt-4">
            <a 
              href="#var-1"
              className="px-5 py-2 rounded-full border border-white/[0.08] hover:border-[#ccff3d]/40 text-xs font-semibold uppercase tracking-wider text-[#ededf0] bg-[#131318]/40 hover:bg-[#131318]/80 transition-all"
            >
              Get In Touch
            </a>
            <a 
              href="#var-4"
              className="px-5 py-2 rounded-full bg-[#ccff3d] hover:brightness-110 text-xs font-semibold uppercase tracking-wider text-black transition-all"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
