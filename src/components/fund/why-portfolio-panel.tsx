import type { Allocation, CommitteeResult, MarketIntelligencePacket } from "@/lib/types";
import { SignalAllocationMap } from "@/components/soso/signal-allocation-map";

export function WhyPortfolioPanel({
  prompt,
  intel,
  committee,
  allocations,
}: {
  prompt?: string;
  intel: MarketIntelligencePacket | null;
  committee?: {
    thesis?: CommitteeResult["thesis"];
    agentVotes: CommitteeResult["agentVotes"];
    confidence: CommitteeResult["confidence"];
  } | null;
  allocations: Allocation[];
}) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-body space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Why this portfolio
          </p>
          <h3 className="font-display text-xl text-foreground">
            Prompt → SoSo signals → Committee → Allocation
          </h3>
        </div>
        {prompt && (
          <p className="text-sm text-muted">
            <span className="text-foreground">User prompt:</span> {prompt}
          </p>
        )}
        {committee?.thesis?.summary && (
          <p className="text-sm leading-relaxed text-muted">
            {committee.thesis.summary}
          </p>
        )}
        {intel && !intel.demoMode && (
          <p className="text-xs text-muted">
            Live SoSoValue packet fetched {new Date(intel.fetchedAt).toLocaleString()}
          </p>
        )}
        <SignalAllocationMap intel={intel} allocations={allocations} />
        {committee?.agentVotes?.length ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Committee evidence
            </p>
            {committee.agentVotes.slice(0, 3).map((v) => (
              <p key={v.agentName} className="text-sm text-muted">
                <span className="text-foreground">{v.agentName}:</span>{" "}
                {v.rationale}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
