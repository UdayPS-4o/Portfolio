"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Nav from "@/components/Nav";

// Mock Dashboard Component to be styled differently in each variation
function DashboardMock({ variation }: { variation: number }) {
  return (
    <div className="w-full max-w-4xl rounded-2xl bg-[#131318] border border-white/10 shadow-2xl overflow-hidden text-sm">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4 bg-[#0e0e12]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="font-mono text-xs opacity-50 tracking-widest uppercase">Admin Panel // V{variation}</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">Live Users</div>
              <div className="text-4xl font-display font-bold text-accent">1,402</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">Server Load</div>
              <div className="text-4xl font-display font-bold text-red-400">84%</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-48 flex items-end gap-2">
            {[40, 70, 30, 80, 50, 90, 20, 60].map((h, i) => (
              <div key={i} className="flex-1 bg-accent/40 hover:bg-accent transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-full">
            <div className="text-xs text-muted uppercase tracking-wider mb-4">Recent Alerts</div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-xs opacity-80">New deployment successful</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      
      // Variation 1: Depth Parallax
      gsap.fromTo(".d1-card",
        { y: 150, rotateX: 20, scale: 0.9, opacity: 0 },
        { y: 0, rotateX: 0, scale: 1, opacity: 1, duration: 1.5, ease: "power3.out", scrollTrigger: ".dash-1" }
      );
      
      // Variation 2: 3D Isometric Float
      gsap.to(".d2-card", {
        y: -30,
        rotateX: 55,
        rotateZ: -45,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
      // Entrance for Isometric
      gsap.fromTo(".d2-container", 
        { opacity: 0, y: 100 }, 
        { opacity: 1, y: 0, duration: 1, scrollTrigger: ".dash-2" }
      );

      // Variation 3: Scroll-driven 3D Unfold
      gsap.fromTo(".d3-card",
        { rotateX: -90, transformOrigin: "top center", opacity: 0 },
        { 
          rotateX: 0, 
          opacity: 1, 
          ease: "none", 
          scrollTrigger: {
            trigger: ".dash-3",
            start: "top 60%",
            end: "center center",
            scrub: true
          }
        }
      );

      // Variation 4: Interactive Tilt (Mouse)
      const d4 = document.querySelector(".dash-4") as HTMLElement;
      const d4Card = document.querySelector(".d4-card") as HTMLElement;
      if (d4 && d4Card) {
        d4.addEventListener("mousemove", (e) => {
          const rect = d4.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(d4Card, {
            rotateY: px * 30,
            rotateX: -py * 30,
            duration: 0.5,
            ease: "power2.out"
          });
        });
        d4.addEventListener("mouseleave", () => {
          gsap.to(d4Card, { rotateY: 0, rotateX: 0, duration: 1, ease: "elastic.out(1, 0.4)" });
        });
      }

      // Variation 5: 3D Exploded Layers
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".dash-5",
          start: "top center",
          end: "bottom bottom",
          scrub: true
        }
      });
      
      tl.fromTo(".d5-layer-1", { z: 0 }, { z: 200, ease: "none" }, 0);
      tl.fromTo(".d5-layer-2", { z: 0 }, { z: 100, ease: "none" }, 0);
      tl.fromTo(".d5-layer-3", { z: 0 }, { z: 0, ease: "none" }, 0);
      tl.to(".d5-container", { rotateX: 30, rotateY: -20, ease: "none" }, 0);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-[#070709] min-h-screen text-[#ededf0] overflow-hidden">
      <Nav />
      
      {/* ─── Variation 1: Depth Parallax ─── */}
      <section className="dash-1 min-h-screen flex flex-col justify-center items-center relative perspective-[1200px] border-b border-white/10 pt-20">
        <div className="text-center mb-12">
          <div className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Dashboard 01</div>
          <h2 className="text-4xl font-display">Subtle Depth Reveal</h2>
          <p className="text-muted mt-2">Smooth GSAP Entrance with X-Axis Rotation</p>
        </div>
        <div className="d1-card w-full max-w-5xl px-4 flex justify-center">
          <DashboardMock variation={1} />
        </div>
      </section>

      {/* ─── Variation 2: Isometric Hover ─── */}
      <section className="dash-2 min-h-screen flex flex-col justify-center items-center relative perspective-[2000px] bg-[#0a0a0c] border-b border-white/10">
        <div className="text-center mb-20">
          <div className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Dashboard 02</div>
          <h2 className="text-4xl font-display">Isometric Floating</h2>
          <p className="text-muted mt-2">Continuous Sine Animation on 3 Axes</p>
        </div>
        <div className="d2-container w-full max-w-5xl px-4 flex justify-center perspective-[2000px]">
          <div className="d2-card" style={{ transformStyle: "preserve-3d", transform: "rotateX(55deg) rotateZ(-45deg)" }}>
            <DashboardMock variation={2} />
          </div>
        </div>
      </section>

      {/* ─── Variation 3: Scroll Unfold ─── */}
      <section className="dash-3 min-h-[150vh] flex flex-col pt-[30vh] items-center relative perspective-[1500px] border-b border-white/10">
        <div className="text-center mb-12 sticky top-32 z-10">
          <div className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Dashboard 03</div>
          <h2 className="text-4xl font-display">Scrubbed Unfold</h2>
          <p className="text-muted mt-2">ScrollTrigger tied directly to RotationX</p>
        </div>
        <div className="w-full max-w-5xl px-4 flex justify-center">
          <div className="d3-card w-full flex justify-center">
            <DashboardMock variation={3} />
          </div>
        </div>
      </section>

      {/* ─── Variation 4: Interactive Mouse Tilt ─── */}
      <section className="dash-4 min-h-screen flex flex-col justify-center items-center relative perspective-[1000px] bg-[#0a0a0c] border-b border-white/10">
        <div className="text-center mb-12 pointer-events-none">
          <div className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Dashboard 04</div>
          <h2 className="text-4xl font-display">Magnetic Tilt</h2>
          <p className="text-muted mt-2">Move your mouse to rotate the UI in 3D space</p>
        </div>
        <div className="w-full max-w-5xl px-4 flex justify-center pointer-events-none">
          <div className="d4-card w-full flex justify-center">
            <DashboardMock variation={4} />
          </div>
        </div>
      </section>

      {/* ─── Variation 5: Exploded Layers ─── */}
      <section className="dash-5 min-h-[200vh] flex flex-col relative perspective-[2000px]">
        <div className="text-center sticky top-32 z-10 mb-12">
          <div className="text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Dashboard 05</div>
          <h2 className="text-4xl font-display">Exploded View</h2>
          <p className="text-muted mt-2">Scroll down to separate the UI layers in Z-space</p>
        </div>
        
        <div className="sticky top-1/2 -translate-y-1/2 w-full max-w-5xl mx-auto px-4 flex justify-center">
          <div className="d5-container relative w-full h-[600px] flex justify-center items-center" style={{ transformStyle: "preserve-3d" }}>
            
            <div className="d5-layer-1 absolute w-full max-w-4xl shadow-2xl bg-[#ccff3d]/10 backdrop-blur-md border border-[#ccff3d]/20 rounded-2xl p-8" style={{ transform: "translateZ(0px)" }}>
              <div className="h-40 border border-dashed border-[#ccff3d]/30 rounded-lg flex items-center justify-center text-[#ccff3d] font-mono text-sm">Foreground Metrics</div>
            </div>

            <div className="d5-layer-2 absolute w-full max-w-4xl shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 translate-y-8" style={{ transform: "translateZ(0px)" }}>
              <div className="h-60 mt-40 border border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/50 font-mono text-sm">Midground Charts</div>
            </div>

            <div className="d5-layer-3 absolute w-full max-w-4xl shadow-2xl bg-[#131318] border border-white/5 rounded-2xl p-8 translate-y-16" style={{ transform: "translateZ(0px)" }}>
               <div className="h-80 mt-[260px] border border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/30 font-mono text-sm">Background Canvas</div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
