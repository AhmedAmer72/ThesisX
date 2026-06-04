"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What is ThesisX?",
    a: "ThesisX is an AI-native operating system for launching and managing autonomous on-chain funds - powered by SoSoValue intelligence and SoDEX execution.",
  },
  {
    q: "Is there a limit to how many funds I can create?",
    a: "No hard limit in MVP. Each fund gets its own thesis, committee votes, public page, and execution audit trail.",
  },
  {
    q: "Are there any platform fees?",
    a: "Free tier includes mock execution and demo intelligence. Pro tier unlocks live APIs and testnet trading configuration.",
  },
  {
    q: "Why should I use ThesisX?",
    a: "Unlike signal-only tools, ThesisX completes the full loop: intelligence -> committee -> portfolio -> execution -> explainability.",
  },
  {
    q: "Is ThesisX safe?",
    a: "MVP uses testnet/mock execution, deterministic risk checks, kill switches, and user-approved trades. Not financial advice.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-28 border-t border-border bg-surface py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="font-display text-center text-3xl font-normal tracking-tight">
          Frequently asked questions
        </h2>
        <p className="text-muted text-center text-sm mt-3">
          Don&apos;t see your answer?{" "}
          <a href="/create" className="text-foreground underline">
            Get in touch
          </a>
        </p>
        <div className="mt-12 divide-y divide-border border-t border-b border-border">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left py-5 flex justify-between gap-4 items-center"
              >
                <span className="font-medium text-[15px]">{f.q}</span>
                <span className="text-muted text-xl shrink-0">
                  {open === i ? "-" : "+"}
                </span>
              </button>
              {open === i && (
                <p className="text-sm text-muted pb-5 leading-relaxed -mt-1">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
