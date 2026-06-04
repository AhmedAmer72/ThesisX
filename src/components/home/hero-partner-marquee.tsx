"use client";

const partners = [
  "SoSoValue",
  "SoDEX",
  "HIKE",
  "PRIMAL",
  "privy",
  "NÒOR",
  "TRIU",
  "Amazon",
  "Meta",
  "Stripe",
];

function MarqueeStrip({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      {partners.map((name) => (
        <span
          key={`${idPrefix}-${name}`}
          className="mx-8 inline-flex shrink-0 items-center text-xs font-semibold uppercase tracking-[0.22em] text-white/40 sm:mx-10 sm:text-sm"
        >
          {name}
        </span>
      ))}
    </>
  );
}

export function HeroPartnerMarquee() {
  return (
    <div
      className="hero-marquee relative w-full overflow-hidden py-2"
      aria-label="Partner logos"
    >
      <div className="hero-marquee-fade-left" aria-hidden />
      <div className="hero-marquee-fade-right" aria-hidden />
      <div className="hero-marquee-track flex w-max items-center">
        <MarqueeStrip idPrefix="a" />
        <MarqueeStrip idPrefix="b" />
      </div>
    </div>
  );
}
