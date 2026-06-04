"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const pillars = [
  {
    tier: "Core",
    title: "AI Fund Generator",
    desc: "Natural language -> thesis, allocations, and risk policy. No code, no manual portfolio construction.",
    cta: "Start for Free",
    href: "/create",
    highlight: false,
  },
  {
    tier: "Pro",
    title: "Autonomous Portfolio Engine",
    desc: "Deterministic risk gates, rebalance bands, drawdown controls, and continuous SoSoValue monitoring.",
    cta: "Get Started",
    href: "/create",
    highlight: true,
  },
  {
    tier: "Execution",
    title: "SoDEX Integration",
    desc: "Mock and testnet execution with EIP-712 signing, explainable trades, and full audit trails.",
    cta: "Configure Testnet",
    href: "/settings",
    highlight: false,
  },
];

export function FoundationSection() {
  return (
    <section id="foundation" className="scroll-mt-28 py-20 md:py-28 bg-page-background">
      <div className="slash-container">
        <h2 className="font-display max-w-lg text-3xl font-normal tracking-tight md:text-4xl">
          A strong financial foundation
        </h2>
        <p className="text-muted mt-4 max-w-xl text-[15px] leading-relaxed">
          High-conviction AI strategies, institutional-style memos, and flexible
          execution to fuel your on-chain fund business.
        </p>

        <div className="mt-14 grid lg:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border p-8 flex flex-col min-h-[320px] ${
                p.highlight
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <span
                className={`text-xs uppercase tracking-wider ${
                  p.highlight ? "opacity-70" : "text-muted"
                }`}
              >
                {p.tier}
              </span>
              <h3 className="text-xl font-semibold mt-4">{p.title}</h3>
              <p
                className={`text-sm mt-3 leading-relaxed flex-1 ${
                  p.highlight ? "opacity-80" : "text-muted"
                }`}
              >
                {p.desc}
              </p>
              <Link
                href={p.href}
                className={`mt-8 inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                  p.highlight
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {p.cta}
              </Link>
            </motion.article>
          ))}
        </div>

        <p className="text-[11px] text-muted mt-8 max-w-3xl leading-relaxed">
          ThesisX is a financial technology platform for AI-assisted portfolio
          management, not a registered investment adviser. Execution on testnet or
          simulated modes only in MVP. See risk disclosures before live trading.
        </p>
      </div>
    </section>
  );
}
