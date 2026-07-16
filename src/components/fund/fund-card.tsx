import Link from "next/link";

export interface FundCardData {
  slug: string;
  name: string;
  strategyType: string;
  riskLevel: string;
  weeklyReturn?: number;
  confidence?: number;
  thesisSnippet?: string;
  dataFreshness?: "live" | "demo";
  status?: string;
  sosoModules?: string[];
  followerCount?: number;
}

export function FundCard({ fund }: { fund: FundCardData }) {
  return (
    <Link
      href={`/funds/${fund.slug}`}
      className="block bg-surface rounded-2xl border border-border p-6 hover:border-border-strong transition-colors"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-semibold text-lg">{fund.name}</h3>
          <p className="text-sm text-muted mt-1">{fund.strategyType}</p>
        </div>
        {fund.weeklyReturn != null && (
          <span
            className={`text-sm font-medium ${
              fund.weeklyReturn >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {fund.weeklyReturn >= 0 ? "+" : ""}
            {fund.weeklyReturn.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4 text-xs">
        <span className="rounded-full border border-border bg-elevated px-2 py-0.5 capitalize">
          {fund.riskLevel} risk
        </span>
        {fund.confidence != null && (
          <span className="rounded-full border border-border bg-elevated px-2 py-0.5">
            {fund.confidence.toFixed(0)}% confidence
          </span>
        )}
        {fund.dataFreshness && (
          <span
            className={`rounded-full border px-2 py-0.5 ${
              fund.dataFreshness === "live"
                ? "border-emerald-800/50 bg-emerald-950/40 text-emerald-400"
                : "border-amber-800/50 bg-amber-950/40 text-amber-400"
            }`}
          >
            {fund.dataFreshness === "live" ? "Live data" : "Demo data"}
          </span>
        )}
        {fund.status === "pending_review" && (
          <span className="rounded-full border border-border bg-elevated px-2 py-0.5">
            Pending review
          </span>
        )}
        {fund.sosoModules?.slice(0, 3).map((m) => (
          <span
            key={m}
            className="rounded-full border border-border bg-elevated px-2 py-0.5"
          >
            SoSo: {m}
          </span>
        ))}
        {typeof fund.followerCount === "number" && (
          <span className="rounded-full border border-border bg-elevated px-2 py-0.5">
            {fund.followerCount} paper mirror
            {fund.followerCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {fund.thesisSnippet && (
        <p className="text-sm text-muted mt-4 line-clamp-2">{fund.thesisSnippet}</p>
      )}
    </Link>
  );
}
