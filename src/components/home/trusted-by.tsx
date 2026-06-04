"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const integrations = [
  {
    name: "SoSoValue",
    stat: "9 modules",
    statLabel: "live market intelligence",
    tag: "ETF · Macro · Indexes",
    href: "/docs#intelligence",
  },
  {
    name: "SoDEX",
    stat: "Testnet",
    statLabel: "signed execution path",
    tag: "Spot orders · Reconciliation",
    href: "/settings",
  },
  {
    name: "OpenAI",
    stat: "Committee",
    statLabel: "multi-agent review",
    tag: "Thesis · Risk · Allocation",
    href: "/create",
  },
];

export function TrustedBy() {
  return (
    <section id="company" className="scroll-mt-28 py-20 md:py-28 border-y border-border bg-elevated">
      <div className="slash-container">
        <h2 className="font-display text-2xl font-normal tracking-tight text-center md:text-3xl">
          Built on live data infrastructure
        </h2>
        <p className="text-muted text-center mt-3 text-sm max-w-lg mx-auto">
          ThesisX connects directly to SoSoValue intelligence and SoDEX execution —
          no synthetic portfolio engine.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {integrations.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={s.href}
                className="block group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-border-strong hover:bg-page-background h-full"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted mt-1">{s.tag}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-semibold tracking-tight">{s.stat}</p>
                    <p className="text-[11px] text-muted">{s.statLabel}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
