// Shared content + helpers for the GSAP hero variations.

export const NAME_FIRST = "Uday Pratap";
export const NAME_LAST = "Singh Parihar";
export const NAME_FULL = "Uday Pratap Singh Parihar";
export const NAME_WORDS = ["Uday", "Pratap", "Singh", "Parihar"];
export const TAGLINE = ["Full-Stack", "RPA & Automation", "Reverse Engineering"];
export const INTRO =
  "I build production features and ruthless automation: LLM-powered products, agentic workflows, and tools that thrive where the documentation runs out.";

/** Render text as per-character spans (words kept unbreakable) for staggered GSAP work. */
export function Split({
  text,
  charClass = "",
  className = "",
}: {
  text: string;
  charClass?: string;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {w.split("").map((c, ci) => (
            <span key={ci} className={`inline-block ${charClass}`}>
              {c}
            </span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
