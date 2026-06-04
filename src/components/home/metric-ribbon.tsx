"use client";

import { motion } from "framer-motion";

const metrics = [
  { value: "9", label: "live SoSoValue modules" },
  { value: "24/7", label: "intelligence refresh" },
  { value: "6", label: "AI committee agents" },
  { value: "100%", label: "source-cited allocations" },
];

export function MetricRibbon() {
  return (
    <section className="bg-black py-16 text-foreground md:py-20">
      <div className="slash-container">
        <h2 className="text-sm uppercase tracking-widest opacity-60 text-center mb-10">
          Platform capabilities
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-center md:text-left"
            >
              <p className="font-display text-3xl font-normal tracking-tight md:text-4xl">
                {m.value}
              </p>
              <p className="text-sm opacity-70 mt-2">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
