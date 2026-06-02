"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Nav from "@/components/Nav";
import Hero3D from "@/components/Hero3D";

// A small mock chat widget to satisfy "all should include the chat section"
function ChatWidget({ theme = "dark" }: { theme?: "dark" | "light" | "glass" }) {
  return (
    <div className={`mt-8 w-full max-w-md rounded-2xl border p-4 backdrop-blur-md ${
      theme === "dark" ? "bg-black/40 border-white/10" : 
      theme === "light" ? "bg-white/90 border-black/10 text-black" :
      "bg-white/5 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    }`}>
      <div className="flex items-center gap-2 mb-4 border-b border-inherit pb-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold tracking-widest uppercase opacity-70">Live Chat</span>
      </div>
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-2">
          <div className="text-[10px] uppercase tracking-wider opacity-50 mt-1">Anon</div>
          <div className={`text-sm px-3 py-2 rounded-lg ${theme === "light" ? "bg-black/5" : "bg-white/5"}`}>
            Amazing hero section!
          </div>
        </div>
        <div className="flex items-start gap-2 flex-row-reverse">
          <div className="text-[10px] uppercase text-accent font-bold tracking-wider mt-1">Uday</div>
          <div className="text-sm px-3 py-2 rounded-lg bg-accent text-black">
            Glad you like it! Try scrolling.
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Type a message..." className={`flex-1 text-sm bg-transparent border rounded-md px-3 py-1.5 outline-none focus:border-accent ${theme === "light" ? "border-black/20" : "border-white/10"}`} />
        <button className="bg-accent text-black px-4 py-1.5 rounded-md text-sm font-semibold hover:opacity-80 transition-opacity">Send</button>
      </div>
    </div>
  );
}

export default function HeroesPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      // Hero 1 Animations
      gsap.fromTo(".h1-text", 
        { y: 100, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: "power4.out", scrollTrigger: ".hero-1" }
      );

      // Hero 2 Kinetic Text
      gsap.to(".h2-marquee", {
        xPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-2",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });

      // Hero 4 Grid 3D
      gsap.utils.toArray(".h4-card").forEach((card: any) => {
        gsap.fromTo(card,
          { rotateX: 45, y: 100, opacity: 0 },
          { rotateX: 0, y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 80%" } }
        );
      });

      // Hero 5 Spotlight (Mouse Move)
      const h5 = document.querySelector(".hero-5") as HTMLElement;
      if (h5) {
        h5.addEventListener("mousemove", (e) => {
          const rect = h5.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          h5.style.setProperty("--mouse-x", `${x}px`);
          h5.style.setProperty("--mouse-y", `${y}px`);
        });
      }

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-[#070709] min-h-screen text-[#ededf0]">
      <Nav />
      
      {/* ─── Hero 1: Classic Refined ─── */}
      <section className="hero-1 relative min-h-screen flex items-center pt-20 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <Hero3D />
        </div>
        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="h1-text text-accent text-sm font-bold tracking-[0.3em] uppercase mb-4">Variation 01</div>
            <h1 className="font-display text-6xl md:text-8xl font-medium leading-[0.9] tracking-[-0.03em] mb-6">
              <div className="h1-text overflow-hidden">
                <span className="block pb-2">Classic</span>
              </div>
              <div className="h1-text overflow-hidden">
                <span className="block text-stroke opacity-70">Elegance</span>
              </div>
            </h1>
            <p className="h1-text text-lg text-[#8a8a93] max-w-md mb-8">
              A refined version of the original design. Featuring the interactive 3D globe and smooth typographic reveals.
            </p>
          </div>
          <div className="h1-text flex justify-center md:justify-end">
            <ChatWidget theme="dark" />
          </div>
        </div>
      </section>

      {/* ─── Hero 2: Kinetic Typography ─── */}
      <section className="hero-2 relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#ccff3d] text-black border-b border-black/10">
        <div className="absolute inset-0 flex flex-col justify-center justify-around opacity-10 pointer-events-none">
          <div className="h2-marquee whitespace-nowrap font-display text-[15vw] font-bold uppercase leading-none tracking-tighter">
            Build Fast · Ship Hard · Automate Everything · Build Fast · Ship Hard · Automate Everything
          </div>
          <div className="h2-marquee whitespace-nowrap font-display text-[15vw] font-bold uppercase leading-none tracking-tighter" style={{ marginLeft: "-20vw" }}>
            Ruthless Efficiency · Zero Compromise · Ruthless Efficiency · Zero Compromise
          </div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="text-sm font-bold tracking-[0.3em] uppercase mb-4 border border-black/20 rounded-full px-4 py-1">Variation 02</div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
            Kinetic Typography & Brutalism
          </h1>
          <p className="text-lg opacity-80 max-w-xl mb-12">
            Bold, loud, and confident. Uses GSAP to drive massive marquee text based on scroll velocity.
          </p>
          <ChatWidget theme="light" />
        </div>
      </section>

      {/* ─── Hero 3: Glassmorphism & Shapes ─── */}
      <section className="hero-3 relative min-h-screen flex items-center justify-center overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[#070709]">
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-accent/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <h1 className="font-display text-5xl md:text-8xl font-medium tracking-tight mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">Glass & Light</span>
          </h1>
          <div className="w-full max-w-2xl">
            <ChatWidget theme="glass" />
          </div>
        </div>
      </section>

      {/* ─── Hero 4: Minimal Grid & 3D Cards ─── */}
      <section className="hero-4 relative min-h-screen bg-[#0a0a0c] overflow-hidden border-b border-white/10"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "4rem 4rem" }}>
        
        <div className="container mx-auto px-6 h-screen flex flex-col justify-center">
          <div className="grid md:grid-cols-2 gap-12 items-center perspective-[1000px]">
            <div>
              <div className="font-mono text-accent text-sm mb-4">&gt; variation_04.sh</div>
              <h1 className="font-display text-5xl md:text-7xl font-medium tracking-tight mb-6">
                Engineering <br/> <span className="opacity-50">Precision</span>
              </h1>
              <p className="font-mono text-sm text-[#8a8a93] max-w-md leading-relaxed">
                A highly structured layout utilizing a background grid. Elements enter with a 3D rotation, mimicking technical blueprints.
              </p>
            </div>
            <div className="h4-card origin-bottom">
              <ChatWidget theme="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Hero 5: Dynamic Spotlight ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        .hero-5 {
          --mouse-x: 50%;
          --mouse-y: 50%;
        }
        .spotlight-overlay {
          background: radial-gradient(
            circle 400px at var(--mouse-x) var(--mouse-y),
            rgba(0,0,0,0) 0%,
            rgba(7,7,9,0.95) 80%
          );
        }
      `}} />
      <section className="hero-5 relative min-h-screen flex items-center justify-center overflow-hidden bg-[url('/grid.svg')] bg-center">
        
        {/* The hidden content to be revealed by spotlight */}
        <div className="container mx-auto px-6 relative flex flex-col items-center text-center">
          <h1 className="font-display text-6xl md:text-9xl font-bold tracking-tighter text-white mb-8">
            REVEAL <br/> THE UNSEEN
          </h1>
          <ChatWidget theme="glass" />
        </div>

        {/* The spotlight mask */}
        <div className="spotlight-overlay absolute inset-0 pointer-events-none" />

      </section>

    </div>
  );
}
