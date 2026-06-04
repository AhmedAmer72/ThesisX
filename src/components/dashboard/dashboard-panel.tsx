import { cn } from "@/lib/utils";

export function DashboardPanel({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("dashboard-panel flex flex-col", className)}>
      <div className="dashboard-panel-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="font-medium text-sm tracking-wide truncate">{title}</h2>
          {count != null && count > 0 && (
            <span className="dashboard-badge dashboard-badge-muted shrink-0">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="dashboard-panel-body flex-1">{children}</div>
    </section>
  );
}
