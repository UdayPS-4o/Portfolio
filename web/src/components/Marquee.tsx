const ITEMS = [
  "Reverse Engineering", "LLM Products", "Agentic Workflows", "High-Throughput Systems", "RPA", "Full-Stack", "Automation",
];

export default function Marquee() {
  const half = [...ITEMS, ...ITEMS]; // duplicated for a seamless loop
  return (
    <div aria-hidden className="overflow-hidden border-y border-line bg-bg-soft py-[1.6rem]">
      <div id="marqueeTrack" className="flex w-max gap-10 whitespace-nowrap will-change-transform">
        {[...half, ...half].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-[clamp(1.4rem,3vw,2.4rem)] font-medium uppercase tracking-[-.01em]">
              {t}
            </span>
            <i className="self-center text-[clamp(1.2rem,2.4vw,2rem)] not-italic text-accent">✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
