import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Capabilities from "@/components/Capabilities";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";
import Effects from "@/components/Effects";
import LivePresence from "@/components/LivePresence";

export default function Home() {
  return (
    <>
      {/* preloader */}
      <div id="preloader" className="fixed inset-0 z-[1000] flex flex-col justify-end bg-bg pad-x pb-[var(--pad)]">
        <div className="preloader__inner flex w-full flex-wrap items-end justify-between gap-4">
          <div className="font-display text-[clamp(4rem,18vw,16rem)] font-medium leading-[.8] tracking-[-.04em]">
            <span id="counter">0</span>
            <span className="align-super text-[.35em] text-accent">%</span>
          </div>
          <div className="preloader__label text-right font-display text-[clamp(.9rem,2vw,1.4rem)] leading-[1.2] tracking-[.05em]">
            <span className="reveal-line">
              <span>UDAY PRATAP SINGH</span>
            </span>
            <span className="reveal-line">
              <span>PARIHAR</span>
            </span>
          </div>
        </div>
        <div className="preloader__bar mt-8 h-[2px] w-full overflow-hidden bg-line">
          <div id="barFill" className="h-full w-0 bg-accent" />
        </div>
      </div>

      {/* global overlays */}
      <div id="cursor" className="cursor" />
      <div id="cursorDot" className="cursor-dot" />
      <div className="grain" />

      <Nav />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Capabilities />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>

      <Effects />
      <LivePresence />
    </>
  );
}
