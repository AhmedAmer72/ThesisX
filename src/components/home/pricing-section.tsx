"use client";

import Link from "next/link";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { useState } from "react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "All MVP features unlocked — no payment required.",
    cta: "Start for Free",
    href: "/create",
    unlockFeature: null as string | null,
    features: [
      "Full SoSoValue intelligence modules",
      "AI committee & thesis generation",
      "Paper copy-trading",
      "Rebalance proposals & approvals",
      "Weekly reports & alerts",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "MVP",
    period: " free",
    desc: "Unlock the pro feature flag on your wallet — no Stripe in MVP.",
    cta: "Unlock Pro features",
    href: "/create",
    unlockFeature: "advanced_intel",
    features: [
      "Live SoSoValue API modules",
      "SoDEX testnet execution",
      "Weekly AI investment memos",
      "Copy-trading paper portfolios",
      "Priority committee (OpenAI)",
    ],
    highlighted: true,
  },
];

export function PricingSection() {
  const { address, isConnected } = useWallet();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(feature: string) {
    if (!address) return;
    setError(null);
    try {
      const res = await fetchWithWallet("/api/entitlements", address, {
        method: "POST",
        body: JSON.stringify({ feature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unlock failed");
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <section id="pricing" className="scroll-mt-28 border-t border-border bg-elevated py-20 md:py-28">
      <div className="slash-container">
        <h2 className="font-display text-center text-3xl font-normal tracking-tight md:text-4xl">
          Transparent pricing
        </h2>
        <p className="text-muted text-center mt-4 text-sm max-w-lg mx-auto">
          MVP mode: every feature is functional. Pro unlocks a wallet feature flag — no billing yet.
        </p>

        <div className="mt-14 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`flex flex-col rounded-2xl border p-8 ${
                t.highlighted
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <p className="mt-4">
                <span className="text-4xl font-semibold tracking-tight">
                  {t.price}
                </span>
                <span className={t.highlighted ? "opacity-70" : "text-muted"}>
                  {t.period}
                </span>
              </p>
              <p
                className={`text-sm mt-3 ${
                  t.highlighted ? "opacity-80" : "text-muted"
                }`}
              >
                {t.desc}
              </p>
              {t.unlockFeature && isConnected ? (
                <button
                  type="button"
                  onClick={() => unlock(t.unlockFeature!)}
                  className={`mt-6 inline-flex w-fit rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${
                    t.highlighted
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {unlocked ? "Pro unlocked" : t.cta}
                </button>
              ) : (
                <Link
                  href={t.href}
                  className={`mt-6 inline-flex w-fit rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${
                    t.highlighted
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {t.unlockFeature && !isConnected ? "Connect wallet to unlock" : t.cta}
                </Link>
              )}
              {error && t.highlighted && (
                <p className="text-xs mt-2 opacity-80">{error}</p>
              )}
              <ul
                className={`mt-8 space-y-3 text-sm flex-1 ${
                  t.highlighted ? "opacity-90" : "text-muted"
                }`}
              >
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
