import Link from "next/link";

export function DashboardEmptyState({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="dashboard-empty">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-elevated text-muted text-lg"
        aria-hidden
      >
        ◌
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted mt-1 max-w-[240px]">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        {primaryHref && primaryLabel && (
          <Link href={primaryHref} className="dashboard-quick-action">
            {primaryLabel}
          </Link>
        )}
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
