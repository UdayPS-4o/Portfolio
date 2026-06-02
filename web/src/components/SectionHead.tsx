export default function SectionHead({ index, label, title }: { index: string; label: string; title: string }) {
  return (
    <div className="mb-[clamp(3rem,7vh,6rem)]">
      <div className="reveal-fade mb-[1.2rem] block font-display text-[.8rem] uppercase tracking-[.2em] text-muted">
        <span className="text-accent">{index}</span> / {label}
      </div>
      <h2
        className="font-display text-[clamp(2.2rem,6.5vw,5.5rem)] font-medium leading-[.95] tracking-[-.02em]"
        data-split-lines
      >
        {title}
      </h2>
    </div>
  );
}
