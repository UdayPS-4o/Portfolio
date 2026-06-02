import SectionHead from "./SectionHead";

const CATS = [
  { no: "A", title: "RPA, Automation & RE", items: ["RPA / Bot Frameworks", "API / Android Reverse Engineering", "Puppeteer", "Appium", "SSL Proxying", "Burp Suite", "Frida", "Dify"] },
  { no: "B", title: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind", "React Native"] },
  { no: "C", title: "Backend & DB", items: ["Node.js", "Python", "PHP", "PostgreSQL", "MongoDB"] },
  { no: "D", title: "Cloud & Infra", items: ["GCP · Cloud Run", "AWS", "Docker", "CI / CD Pipelines", "Nginx · Reverse Proxy", "Linux · VPS Ops"] },
];

export default function Skills() {
  return (
    <section id="skills" className="relative py-[clamp(5rem,12vh,11rem)] pad-x">
      <SectionHead index="05" label="Toolkit" title="The stack I reach for" />
      <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {CATS.map((c) => (
          <div
            key={c.no}
            className="min-h-[320px] bg-bg p-[clamp(1.5rem,3vw,2.5rem)] transition-colors duration-[400ms] ease-ease hover:bg-bg-soft"
          >
            <div className="mb-[1.8rem] flex items-center gap-[.8rem]">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-accent font-display text-[.9rem] text-accent">
                {c.no}
              </span>
              <h3 className="font-display text-[1.15rem] font-medium tracking-[-.01em]">{c.title}</h3>
            </div>
            <ul>
              {c.items.map((it) => (
                <li
                  key={it}
                  className="border-b border-line py-[.55rem] text-[.92rem] text-muted transition-all duration-300 last:border-0 hover:pl-[.6rem] hover:text-text"
                >
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
