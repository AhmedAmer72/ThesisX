"use client";

import { motion } from "framer-motion";

const tools = [
  {
    title: "Virtual Accounts.",
    desc: 'Create distinct capital "pools" per strategy for better tracking.',
  },
  {
    title: "Analytics.",
    desc: "Real-time allocation, PnL, and narrative trends for each fund.",
  },
  {
    title: "Auto Rebalance.",
    desc: "AI top-up and rotation when drift exceeds your policy bands.",
  },
  {
    title: "Risk authorizations.",
    desc: "Max drawdown, sector caps, and exposure alerts before trades execute.",
  },
  {
    title: "Custom Controls.",
    desc: "Granular permissions, kill switches, and testnet/mainnet gates.",
  },
];

export function IntelligentTools() {
  return (
    <section id="tools" className="scroll-mt-28 bg-elevated py-20 md:py-28">
      <div className="slash-container">
        <h2 className="font-display text-3xl font-normal tracking-tight md:text-4xl">
          Coupled with intelligent tools
        </h2>
        <p className="text-muted mt-4 text-[15px]">
          Complete any fund task in just a few clicks.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t, i) => (
            <motion.article
              key={t.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:bg-page-background"
            >
              <div className="h-20 rounded-xl bg-page-background border border-border mb-5 flex items-center justify-center">
                <span className="text-[11px] uppercase tracking-widest text-muted">
                  Live module
                </span>
              </div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{t.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
