import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return (
    <div className="site-offset container max-w-2xl py-10 md:py-14 min-h-[60vh] bg-page-background">
      <p className="text-xs uppercase tracking-widest text-muted">ThesisX</p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
        Settings & Safety
      </h1>
      <p className="text-muted text-sm mt-2">
        Kill switches, execution mode, disclosures, and system health.
      </p>
      <SettingsPanel />
    </div>
  );
}
