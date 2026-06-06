"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChecklistState = {
  walletConnectConfigured: boolean;
  sosoLive: boolean;
  sodexTestnet: boolean;
  openai: boolean;
  ready: boolean;
};

const steps = [
  { key: "wallet", label: "Connect wallet", href: "/dashboard" },
  { key: "soso", label: "Configure SoSoValue API", href: "/settings" },
  { key: "sodex", label: "Configure SoDEX testnet", href: "/settings" },
  { key: "openai", label: "Configure OpenAI committee", href: "/settings" },
  { key: "create", label: "Create your first fund", href: "/create" },
] as const;

export function OnboardingChecklist() {
  const [health, setHealth] = useState<ChecklistState | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!health) return null;
  if (health.ready) return null;

  const done = {
    wallet: health.walletConnectConfigured,
    soso: health.sosoLive,
    sodex: health.sodexTestnet,
    openai: health.openai,
    create: false,
  };

  return (
    <section className="dashboard-panel border border-amber-500/30 bg-amber-500/5 p-5 rounded-2xl">
      <h2 className="font-display text-lg">Launch checklist</h2>
      <p className="text-sm text-muted mt-1">
        Complete these steps for live intelligence and testnet execution.
      </p>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center justify-between text-sm">
            <span className={done[step.key] ? "text-emerald-400" : "text-foreground"}>
              {done[step.key] ? "✓" : "○"} {step.label}
            </span>
            <Link href={step.href} className="text-xs text-amber-400 hover:underline">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
