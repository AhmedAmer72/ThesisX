"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Health = {
  ready?: boolean;
  buildathonMode?: boolean;
  sosoLive?: boolean;
  sodexTestnet?: boolean;
  executionMode?: string;
};

export function ReadinessPill() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!health) return null;

  const ready = health.ready;
  const label = ready
    ? health.buildathonMode
      ? "Live ready"
      : "Systems ok"
    : "Setup needed";

  return (
    <Link
      href="/settings"
      className={cn(
        "hidden rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:inline-flex",
        ready
          ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
          : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
      )}
      title={`SoSo: ${health.sosoLive ? "on" : "off"} · SoDEX: ${health.sodexTestnet ? "on" : "off"} · ${health.executionMode}`}
    >
      {label}
    </Link>
  );
}
