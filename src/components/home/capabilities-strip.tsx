const capabilities = [
  {
    title: "SoSoValue intelligence.",
    desc: "Nine data modules - news, ETF flows, SSI indexes, macro, and more - unified for AI decisions.",
  },
  {
    title: "Multi-agent committee.",
    desc: "Macro, Narrative, Momentum, Risk, and Allocation agents vote before every execution.",
  },
  {
    title: "Multi-entity funds.",
    desc: "Launch and toggle between AI funds like switching workspaces - each with its own thesis and policy.",
  },
];

export function CapabilitiesStrip() {
  return (
    <section className="border-b border-border bg-elevated py-16 md:py-20">
      <div className="slash-container">
        <h2 className="font-display text-2xl font-normal tracking-tight md:text-3xl">
          Amplified with modern capabilities
        </h2>
        <ul className="mt-10 grid md:grid-cols-3 gap-8 md:gap-12">
          {capabilities.map((c) => (
            <li key={c.title}>
              <h3 className="font-semibold text-[15px]">{c.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{c.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
