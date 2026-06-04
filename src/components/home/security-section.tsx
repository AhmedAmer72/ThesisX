const items = [
  {
    title: "Deterministic risk gates",
    body: "Every portfolio passes max position, sector, and stable-reserve checks before execution. ThesisX never executes without review in MVP.",
  },
  {
    title: "Explainable AI logs",
    body: "Thesis, committee votes, and trade rationale stored with SoSoValue source attribution and structured audit trails.",
  },
  {
    title: "Advanced execution controls",
    body: "EIP-712 signing, API key isolation, nonce management, and per-fund kill switches for testnet operations.",
  },
  {
    title: "Fail-closed by default",
    body: "Global kill switch, mainnet gate, and mock/testnet modes prevent unsafe live trading until security review.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-28 bg-black py-20 text-foreground md:py-28">
      <div className="slash-container">
        <h2 className="font-display text-3xl font-normal tracking-tight md:text-4xl">
          Secure by design
        </h2>
        <p className="opacity-70 mt-4 max-w-xl text-[15px] leading-relaxed">
          Invest confidently with granular controls, explainable AI, and
          testnet-first execution infrastructure.
        </p>
        <div className="mt-14 grid sm:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="border border-white/10 rounded-2xl p-6 md:p-8"
            >
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm opacity-70 mt-3 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
