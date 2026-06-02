export default function Contact() {
  return (
    <section id="contact" className="relative px-[var(--pad)] pt-[clamp(5rem,12vh,10rem)]">
      <div>
        <div className="reveal-fade mb-[1.2rem] block font-display text-[.8rem] uppercase tracking-[.2em] text-muted">
          <span className="text-accent">06</span> / Contact
        </div>

        <h2 className="my-6 mb-[clamp(2.5rem,6vh,4rem)] font-display text-[clamp(2.8rem,11vw,11rem)] font-medium leading-[.86] tracking-[-.03em]">
          <span className="hero-line" data-split>
            Let&apos;s build
          </span>
          <span className="hero-line text-stroke" data-split>
            something
          </span>
        </h2>

        <a
          href="mailto:work@udayps.com"
          data-cursor="hover"
          data-magnetic
          className="group inline-flex items-center gap-4 font-display text-[clamp(1.6rem,5vw,3.4rem)] font-medium tracking-[-.02em] text-text transition-colors duration-[400ms] hover:text-accent"
        >
          work@udayps.com
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-[clamp(1.6rem,4vw,3rem)] w-[clamp(1.6rem,4vw,3rem)] transition-transform duration-[400ms] ease-ease group-hover:translate-x-[10px] group-hover:text-accent"
          >
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>

        <div className="mt-[clamp(2.5rem,6vh,4rem)] flex flex-wrap gap-x-10 gap-y-5">
          {[
            { label: "+91 8819923334", href: "tel:+918819923334" },
            { label: "GitHub", href: "https://github.com/UdayPS-4o" },
            { label: "LinkedIn", href: "https://www.linkedin.com/in/uday-ps/" },
            { label: "Résumé ↓", href: "/Resume__Uday_PS.pdf" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") || l.href.endsWith(".pdf") ? "_blank" : undefined}
              rel="noopener"
              data-cursor="hover"
              className="font-display text-[.95rem] tracking-[.03em] text-muted transition-colors duration-300 hover:text-accent"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <footer className="mt-[clamp(4rem,10vh,8rem)] flex flex-wrap justify-between gap-4 border-t border-line py-8 text-[.8rem] tracking-[.04em] text-faint">
        <span>© 2026 Uday Pratap Singh Parihar</span>
        <span>Indore · Madhya Pradesh · India</span>
        <span>Designed &amp; engineered from scratch</span>
      </footer>
    </section>
  );
}
