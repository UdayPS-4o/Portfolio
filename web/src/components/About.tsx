const STATS = [
  { count: 7, suffix: "+", label: "Products shipped end to end" },
  { count: 4, suffix: "+", label: "Platforms reverse‑engineered" },
  { count: 1, suffix: "M+", label: "Users out-queued in a single drop" },
  { count: 3, suffix: "+", label: "Years building production systems" },
];

export default function About() {
  return (
    <section id="about" className="relative py-[clamp(5rem,12vh,11rem)] pad-x">
      <div className="reveal-fade mb-[1.2rem] block font-display text-[.8rem] uppercase tracking-[.2em] text-muted">
        <span className="text-accent">01</span> / About
      </div>
      <h2
        className="mb-[clamp(2.2rem,5vh,3.6rem)] max-w-[18ch] font-display text-[clamp(2.2rem,6.5vw,5.5rem)] font-medium leading-[.95] tracking-[-.02em]"
        data-split-lines
      >
        A bit about me
      </h2>

      <div className="grid grid-cols-1 items-start gap-[clamp(2rem,6vw,6rem)] md:grid-cols-[1.1fr_1fr]">
        <div className="reveal-fade space-y-[1.2rem] text-[clamp(1rem,1.5vw,1.15rem)] text-muted [&_strong]:font-semibold [&_strong]:text-text">
          <p>
            I’m a full-stack developer drawn to the hard, undocumented edges of software. My work splits between two
            things: shipping clean product features people actually use, and building automation that runs at a scale
            and reliability the original system was never designed to expect.
          </p>
          <p>
            I’ve been a <strong>founding engineer</strong> owning an entire logistics platform, a{" "}
            <strong>software engineer</strong> wiring LLM agents into a production chatbot, and a{" "}
            <strong>freelancer</strong> reverse-engineering encrypted APIs, bypassing industrial queue systems, and
            orchestrating hundreds of concurrent sessions without things falling over.
          </p>
          <p>
            What ties it together is a stubborn curiosity about how things actually work under the hood, and the
            patience to turn that understanding into something dependable. I’m looking for a team that ships fast and
            isn’t afraid of the messy problems.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
          {STATS.map((s) => (
            <div key={s.label} className="reveal-fade border-t border-line pt-4">
              <div
                className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-medium leading-none tracking-[-.03em] [&_span]:text-accent"
                data-count={s.count}
                data-suffix={s.suffix}
              >
                0
              </div>
              <div className="mt-[.6rem] max-w-[17rem] text-pretty text-[.85rem] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
