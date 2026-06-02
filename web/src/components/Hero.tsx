import Hero3D from "./Hero3D";

export default function Hero() {
  return (
    <section id="hero" className="relative h-[100svh] min-h-[640px] overflow-hidden">
      {/* 3D globe: on mobile, constrain to the top 45% with a fade-out edge */}
      <div className="absolute inset-0 md:inset-0 max-md:bottom-[55%]">
        <Hero3D />
      </div>
      {/* gradient that fades the globe into the dark background — mobile only */}
      <div className="absolute inset-x-0 top-[30%] h-[20%] bg-gradient-to-b from-transparent to-bg z-[1] md:hidden" />

      {/* ─── DESKTOP layout (unchanged) ─── */}
      <div className="relative z-[2] hidden md:flex h-full flex-col justify-end pb-[clamp(2rem,6vh,5rem)] pointer-events-none">
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-start gap-5 pad-x">
          <div className="reveal-fade flex flex-wrap items-center gap-[.8rem] font-display text-[clamp(.7rem,1.4vw,.9rem)] uppercase tracking-[.25em] text-muted">
            <span>Full-Stack</span>
            <i className="not-italic text-accent">·</i>
            <span>RPA &amp; Automation</span>
            <i className="not-italic text-accent">·</i>
            <span>Reverse Engineering</span>
          </div>
          <h1 className="font-display text-[clamp(2.4rem,11vw,11rem)] font-medium leading-[1.0] tracking-[-.03em]">
            <span className="hero-line block pb-2 md:pb-6" data-split>Uday Pratap</span>
            <span className="hero-line block text-stroke" data-split>Singh Parihar</span>
          </h1>
        </div>
        <div className="flex flex-col items-start gap-4 pad-x">
          <p className="reveal-fade pointer-events-auto max-w-[42ch] text-[clamp(.95rem,1.4vw,1.1rem)] text-muted">
            I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools
            that thrive where the documentation runs out.
          </p>
          <div className="reveal-fade pointer-events-auto flex gap-8 font-display text-[.85rem] tracking-[.05em]">
            <span>Indore, India</span>
            <span id="clock" className="text-accent">—</span>
          </div>
        </div>
      </div>

      {/* ─── MOBILE layout ─── */}
      <div className="relative z-[2] flex md:hidden h-full flex-col justify-end pb-24 pointer-events-none px-5">
        {/* tags */}
        <div className="reveal-fade flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[.6rem] uppercase tracking-[.18em] text-muted mb-3">
          <span>Full-Stack</span>
          <i className="not-italic text-accent text-[.5rem]">◆</i>
          <span>RPA &amp; Automation</span>
          <i className="not-italic text-accent text-[.5rem]">◆</i>
          <span>Reverse Engineering</span>
        </div>

        {/* name — tighter leading, stroke outline thinner on small screens */}
        <h1 className="font-display text-[2.6rem] font-medium leading-[.9] tracking-[-.02em] mb-5">
          <span className="hero-line block pb-3" data-split>Uday Pratap</span>
          <span className="hero-line block text-stroke-mobile" data-split>Singh Parihar</span>
        </h1>

        {/* thin accent divider */}
        <div className="reveal-fade w-10 h-[2px] bg-accent mb-5" />

        {/* description */}
        <p className="reveal-fade pointer-events-auto text-[.88rem] leading-[1.6] text-muted mb-5 max-w-[38ch]">
          I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools
          that thrive where the documentation runs out.
        </p>

        {/* location row */}
        <div className="reveal-fade pointer-events-auto flex items-center gap-5 font-display text-[.78rem] tracking-[.05em]">
          <span>Indore, India</span>
          <span id="clock-mobile" className="text-accent">—</span>
        </div>
      </div>
    </section>
  );
}
