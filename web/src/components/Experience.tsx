import SectionHead from "./SectionHead";

const JOBS = [
  {
    year: "Jan 2023 to Feb 2025",
    role: "Founding Engineer",
    org: "Delivo · Mumbai, India",
    body: "I was the founding engineer behind Delivo’s logistics platform for international shipping. I owned the stack from end to end and turned messy, regulation-heavy operations into software a team could run their whole day on.",
    points: [
      "Designed the platform architecture and core operational workflows from zero.",
      "Built the client and warehouse dashboards that ran daily shipping operations.",
      "Integrated third-party systems and kept everything compliant with international shipping regulations.",
    ],
    tags: ["Architecture", "Dashboards", "Integrations", "Logistics"],
  },
  {
    year: "May 2025 to Jul 2025",
    role: "Software Engineer",
    org: "Tradyon · Bengaluru, India",
    body: "I shipped end-to-end features for Tradyon’s cross-platform AI chatbot, a Next.js web app and a React Native mobile app, improving its UX and reliability on both with a fast iteration cycle.",
    points: [
      "Built agentic workflows in Dify that orchestrated LLM calls against BigQuery-backed global trade data.",
      "Enabled rich responses with text, charts and graphs by wiring workflows into the app’s data layer.",
      "Shipped production features and fixes across web and mobile without sacrificing code quality.",
    ],
    tags: ["Next.js", "React Native", "Dify", "BigQuery", "LLM"],
  },
];

export default function Experience() {
  return (
    <section id="work" className="relative py-[clamp(5rem,12vh,11rem)] pad-x">
      <SectionHead index="03" label="Experience" title="Where I've shipped" />

      <div id="timeline" className="relative pl-[clamp(0px,4vw,3rem)]">
        <div className="absolute left-0 top-0 h-full w-px bg-line">
          <i id="timelineProgress" className="absolute left-0 top-0 block h-0 w-full bg-accent" />
        </div>

        {JOBS.map((j) => (
          <article
            key={j.role}
            data-cursor="hover"
            className="grid grid-cols-1 gap-[clamp(1rem,4vw,4rem)] border-t border-line py-[clamp(2rem,5vh,3.5rem)] transition-[padding] duration-500 ease-ease hover:pl-5 md:grid-cols-[230px_1fr]"
          >
            <div>
              <span className="font-display text-[.9rem] tracking-[.03em] text-accent">{j.year}</span>
            </div>
            <div>
              <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-medium leading-[1.05] tracking-[-.02em]">
                {j.role}
              </h3>
              <div className="my-[.5rem] mb-[1.2rem] font-display text-[.95rem] tracking-[.02em] text-muted">
                {j.org}
              </div>
              <p className="max-w-[60ch] text-[clamp(.95rem,1.4vw,1.08rem)] text-muted">{j.body}</p>
              <ul className="diamond-list mt-[1.2rem] flex max-w-[62ch] flex-col gap-[.6rem]">
                {j.points.map((p) => (
                  <li key={p} className="text-[clamp(.92rem,1.35vw,1.02rem)] text-muted">
                    {p}
                  </li>
                ))}
              </ul>
              <ul className="mt-[1.4rem] flex flex-wrap gap-[.6rem]">
                {j.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-line px-[.8rem] py-[.4rem] text-[.75rem] tracking-[.04em]"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
