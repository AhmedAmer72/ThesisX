export function DashboardLoading() {
  return (
    <div className="mt-8 space-y-6" aria-busy aria-label="Loading dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-stat">
            <div className="dashboard-skeleton h-3 w-16 mb-3" />
            <div className="dashboard-skeleton h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-panel h-52">
            <div className="dashboard-panel-header">
              <div className="dashboard-skeleton h-4 w-28" />
            </div>
            <div className="dashboard-panel-body space-y-3">
              <div className="dashboard-skeleton h-10 w-full" />
              <div className="dashboard-skeleton h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
