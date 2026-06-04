"use client";

import { motion } from "framer-motion";

const modules = [
  {
    title: "SoSoValue Intelligence",
    desc: "News, ETF flows, SSI indexes, macro, fundraising, BTC treasuries, and sector data unified for AI decisions.",
    tag: "Intelligence",
  },
  {
    title: "AI Investment Committee",
    desc: "Macro, Narrative, Momentum, Risk, and Allocation agents vote before every trade with full audit logs.",
    tag: "Agents",
  },
  {
    title: "Autonomous Portfolio Engine",
    desc: "Deterministic risk gates, rebalance bands, and position limits - not just LLM output.",
    tag: "Portfolio",
  },
  {
    title: "SoDEX Execution",
    desc: "Mock testnet and live testnet paths with EIP-712 signing, nonce management, and reconciliation.",
    tag: "Execution",
  },
  {
    title: "Public Fund Pages",
    desc: "Thesis, allocations, performance, trade history, and explainable reasoning for every decision.",
    tag: "Transparency",
  },
  {
    title: "Fund Marketplace",
    desc: "Discover, compare, and follow top AI-managed strategies.",
    tag: "Discovery",
  },
];

export function ProductModules() {
  return (
    <section id="platform" className="scroll-mt-28 border-t border-border bg-page-background py-20 md:py-28">
      <div className="slash-container">
        <p className="text-xs uppercase tracking-widest text-muted mb-3">Platform</p>
        <h2 className="font-display max-w-lg text-3xl font-normal tracking-tight md:text-4xl">
          Everything your AI fund needs
        </h2>
        <p className="text-muted mt-4 max-w-xl text-[15px]">
          Complete insight-to-execution workflow on one platform.
        </p>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m, i) => (
            <motion.article
              key={m.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-surface rounded-2xl border border-border p-6 hover:border-border-strong transition-colors"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted">
                {m.tag}
              </span>
              <h3 className="text-lg font-semibold mt-3">{m.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{m.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
