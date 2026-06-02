import SectionHead from "./SectionHead";
import { PROJECTS } from "@/lib/projects";

export default function Projects() {
  return (
    <section id="projects" className="relative py-[clamp(5rem,12vh,11rem)] pad-x">
      <SectionHead index="04" label="Selected Work" title="Things I've broken & built" />

      <div className="flex flex-col">
        {PROJECTS.map((p, i) => {
          const num = String(i + 1).padStart(2, "0");
          const flip = i % 2 === 1;
          return (
            <article
              key={p.title}
              data-cursor="hover"
              className="grid grid-cols-1 items-center gap-[clamp(2rem,5vw,5rem)] border-t border-line py-[clamp(3rem,7vh,6rem)] md:grid-cols-2"
            >
              {/* visual */}
              <div
                className={`project-visual relative aspect-[16/10] overflow-hidden rounded bg-surface [transform-style:preserve-3d] ${
                  flip ? "md:order-2" : ""
                }`}
              >
                <span className="absolute left-4 top-4 z-[3] rounded-full bg-accent px-[.7rem] py-[.3rem] font-display text-[.8rem] tracking-[.15em] text-black">
                  {num}
                </span>
                {p.image ? (
                  <div
                    className="project-visual-inner absolute inset-0 bg-cover bg-center will-change-transform"
                    style={{ backgroundImage: `url('${p.image}')` }}
                  />
                ) : (
                  <div className="project-visual-inner absolute inset-0 bg-gradient-to-br from-bg-soft via-[#0b0b10] to-surface will-change-transform" />
                )}
                <div className="reveal-overlay" />
              </div>

              {/* body */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 font-display text-[.78rem] uppercase tracking-[.12em] text-muted">
                  <span>{p.role}</span>
                  <i className="not-italic text-accent">/</i>
                  {p.client && (
                    <>
                      <span>{p.client}</span>
                      <i className="not-italic text-accent">/</i>
                    </>
                  )}
                  <span>{p.year}</span>
                </div>

                <h3 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-medium leading-[1.02] tracking-[-.02em]">
                  {p.title}
                </h3>

                {p.tagline && (
                  <p className="max-w-[40ch] font-display text-[clamp(1.05rem,1.7vw,1.3rem)] tracking-[-.01em] text-text">
                    {p.tagline}
                  </p>
                )}

                <p
                  className="max-w-[56ch] text-[clamp(.92rem,1.35vw,1.04rem)] text-muted [&_strong]:font-semibold [&_strong]:text-accent"
                  dangerouslySetInnerHTML={{ __html: p.desc }}
                />

                {p.bullets && (
                  <ul className="diamond-list my-[.2rem] flex max-w-[56ch] flex-col gap-[.55rem]">
                    {p.bullets.map((b) => (
                      <li key={b} className="text-[clamp(.88rem,1.3vw,.98rem)] text-muted">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-[.4rem] inline-flex items-center gap-[.6rem] font-display text-[.9rem] text-accent before:h-px before:w-[22px] before:bg-accent before:content-['']">
                  {p.highlight}
                </div>

                <div className="mt-[.3rem] flex flex-wrap gap-[.55rem]">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-[.75rem] py-[.35rem] text-[.73rem] tracking-[.04em]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
