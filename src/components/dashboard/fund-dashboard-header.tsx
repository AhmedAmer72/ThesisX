import Link from "next/link";
import { RiskBadge } from "@/components/fund/risk-badge";

export function FundDashboardHeader({
  name,
  slug,
  strategyType,
  riskLevel,
  confidence,
  status,
}: {
  name: string;
  slug: string;
  strategyType: string;
  riskLevel: string;
  confidence: number;
  status: string;
}) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          Fund command center
        </p>
        <h1 className="font-display text-4xl md:text-[2.75rem] font-normal tracking-tight mt-2">
          {name}
        </h1>
        <p className="text-sm text-muted mt-2">{strategyType}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RiskBadge riskLevel={riskLevel} confidence={confidence} />
          <span
            className={
              status === "active"
                ? "dashboard-badge dashboard-badge-live"
                : "dashboard-badge dashboard-badge-pending"
            }
          >
            {status.replace("_", " ")}
          </span>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2">
        <Link href="/dashboard" className="dashboard-quick-action">
          ← My dashboard
        </Link>
        <Link href={`/funds/${slug}`} className="dashboard-quick-action">
          Public page
        </Link>
        <Link href="/create" className="dashboard-quick-action">
          Create fund
        </Link>
      </nav>
    </header>
  );
}
