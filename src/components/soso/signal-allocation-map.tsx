"use client";

import type { Allocation, MarketIntelligencePacket } from "@/lib/types";
import {
  extractSignalsFromPacket,
  linkSignalsToAllocations,
} from "@/lib/soso/signals";

export function SignalAllocationMap({
  intel,
  allocations,
}: {
  intel: MarketIntelligencePacket | null;
  allocations: Allocation[];
}) {
  if (!intel || allocations.length === 0) {
    return (
      <p className="text-sm text-muted">
        Signal-to-allocation mapping appears after live SoSoValue intelligence is loaded.
      </p>
    );
  }

  const signals = intel.signals ?? extractSignalsFromPacket(intel);
  const links = linkSignalsToAllocations(allocations, signals);

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.symbol}
          className="rounded-xl border border-border bg-surface/40 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-foreground">
              {link.symbol}{" "}
              <span className="text-muted">
                {(link.weight * 100).toFixed(1)}%
              </span>
            </p>
            {link.signals[0] && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                {link.signals[0].module}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {link.explanation}
          </p>
          {link.signals.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {link.signals.map((s) => (
                <li key={s.id}>
                  <span className="text-foreground">{s.label}:</span> {s.summary}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
