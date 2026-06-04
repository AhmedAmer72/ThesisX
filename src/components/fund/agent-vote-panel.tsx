import { cn } from "@/lib/utils";

interface Vote {
  agentName: string;
  stance: string;
  confidence: number;
  rationale: string;
}

const stanceColor: Record<string, string> = {
  bullish: "bg-emerald-950/60 text-emerald-300",
  bearish: "bg-red-950/60 text-red-300",
  neutral: "bg-elevated text-muted",
  cautious: "bg-amber-950/60 text-amber-300",
};

export function AgentVotePanel({ votes }: { votes: Vote[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
        Investment committee
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 pr-4">Agent</th>
              <th className="py-2 pr-4">Decision</th>
              <th className="py-2 pr-4">Confidence</th>
              <th className="py-2">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {votes.map((v) => (
              <tr key={v.agentName} className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium">{v.agentName}</td>
                <td className="py-3 pr-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs capitalize",
                      stanceColor[v.stance] ?? stanceColor.neutral
                    )}
                  >
                    {v.stance}
                  </span>
                </td>
                <td className="py-3 pr-4">{v.confidence.toFixed(0)}%</td>
                <td className="py-3 text-muted max-w-md">{v.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
