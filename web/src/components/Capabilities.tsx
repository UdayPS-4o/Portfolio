import SectionHead from "./SectionHead";

const CAPS = [
  {
    no: "01",
    title: "Product Engineering",
    body: "End-to-end features across web and mobile with Next.js, React Native and Node. I take a feature from architecture and data modeling all the way to the last bug fix before release.",
  },
  {
    no: "02",
    title: "Automation & RPA",
    body: "High-concurrency systems that generate accounts, monitor live state, and act in real time. Built to stay fast and reliable under hundreds of parallel sessions and sudden demand spikes.",
  },
  {
    no: "03",
    title: "Reverse Engineering",
    body: "API and Android reverse engineering: traffic interception, payload decryption and protocol reconstruction. I build integrations where no public API exists and the only documentation is the wire.",
  },
  {
    no: "04",
    title: "LLM & Agentic Systems",
    body: "Agentic workflows that orchestrate LLMs against real data sources and return genuinely useful output: text, charts and structured responses wired into the rest of the product.",
  },
];

export default function Capabilities() {
  return (
    <section id="capabilities" className="relative py-[clamp(5rem,12vh,11rem)] pad-x">
      <SectionHead index="02" label="What I do" title="Four things I'm good at" />
      <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
        {CAPS.map((c) => (
          <article
            key={c.no}
            data-cursor="hover"
            className="reveal-fade group relative overflow-hidden bg-bg p-[clamp(1.8rem,4vw,3.2rem)] transition-colors duration-[400ms] ease-ease hover:bg-bg-soft"
          >
            <span className="absolute left-0 top-0 h-[2px] w-0 bg-accent transition-[width] duration-500 ease-ease group-hover:w-full" />
            <span className="font-display text-[.85rem] tracking-[.15em] text-faint">{c.no}</span>
            <h3 className="my-4 font-display text-[clamp(1.4rem,2.6vw,2rem)] font-medium tracking-[-.02em]">
              {c.title}
            </h3>
            <p className="max-w-[46ch] text-[clamp(.95rem,1.4vw,1.08rem)] text-muted">{c.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
