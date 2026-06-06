export function TrustBanner() {
  const killSwitch = process.env.ADMIN_KILL_SWITCH === "true";
  const mode = process.env.EXECUTION_MODE ?? "testnet";
  const demo = process.env.DEMO_MODE === "true";
  return (
    <div className="border-b border-border bg-elevated py-1.5 px-4 text-center text-[11px] text-muted">
      ThesisX is experimental software, not financial advice. Execution: {mode}
      {demo ? " · demo intelligence disabled in production" : ""}
      {killSwitch ? " · Kill switch active" : ""}
    </div>
  );
}
