export default function Nav() {
  return (
    <header
      id="nav"
      className="fixed top-0 left-0 z-[500] flex w-full items-center justify-between py-6 pad-x mix-blend-difference"
    >
      <a href="#hero" className="nav__brand inline-flex items-center" data-cursor="hover">
        {/* Variants rotate in order 02 → 06 → 10 → 11 on each load (see Effects -> initBrand) */}
        <span className="brand-variant items-baseline font-display text-[.98rem] font-semibold tracking-[.05em]">
          UDAY PS
          <span className="ml-[.12rem] text-[1.4rem] leading-[0] text-accent">.</span>
        </span>

        <span className="brand-variant flex-col items-start gap-1 font-display text-base font-semibold tracking-[.04em]">
          <span>UDAY PS</span>
          <span className="bv-ln h-[2px] w-full origin-left scale-x-[.4] bg-accent transition-transform duration-[450ms] ease-ease" />
        </span>

        <span className="brand-variant flex-col items-start gap-[.18rem] font-display leading-none">
          <span className="text-[1.15rem] font-bold tracking-[-.01em]">
            Uday <b className="text-accent">PS</b>
          </span>
          <span className="text-[.55rem] uppercase tracking-[.3em] text-muted">Full-Stack · RPA</span>
        </span>

        <span className="brand-variant items-center font-mono text-[.95rem] font-medium tracking-[.01em]">
          <span className="inline-flex">
            <span className="text-accent">~/</span>uday-ps
          </span>
          <span className="ml-[.3rem] inline-block h-[1.05em] w-2 animate-blink bg-accent" />
        </span>
      </a>

      <nav className="nav__links hidden gap-8 md:flex">
        {["Work", "Projects", "Skills", "Contact"].map((l) => (
          <a
            key={l}
            href={`#${l.toLowerCase()}`}
            data-cursor="hover"
            className="group relative text-sm tracking-[.03em]"
          >
            <span>{l}</span>
            <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-[400ms] ease-ease group-hover:origin-left group-hover:scale-x-100" />
          </a>
        ))}
      </nav>
    </header>
  );
}
