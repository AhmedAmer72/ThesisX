"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SosoHealthPanel } from "@/components/soso/soso-health-panel";
import { SodexSetupWizard } from "@/components/settings/sodex-setup-wizard";
import { WalletWatchPanel } from "@/components/settings/wallet-watch-panel";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { useWallet } from "@/components/providers/wallet-provider";
import { shortenAddress } from "@/lib/wallet/utils";
import { fetchWithWallet } from "@/lib/wallet/api";

type Health = {
  db: boolean;
  database?: boolean;
  ready?: boolean;
  buildathonMode?: boolean;
  executionMode: string;
  demoMode: boolean;
  killSwitch: boolean;
  sosoConfigured: boolean;
  sodexTestnet?: boolean;
  openaiConfigured: boolean;
  openaiRequired?: boolean;
  blockers?: string[];
  warnings?: string[];
};

type SodexTest = {
  ready: boolean;
  blockers: string[];
  mappedSymbols: string[];
  accountResolved?: number | null;
};

export function SettingsPanel() {
  const { address, isConnected } = useWallet();
  const [health, setHealth] = useState<Health | null>(null);
  const [globalKill, setGlobalKill] = useState(false);
  const [envKill, setEnvKill] = useState(false);
  const [fundSlug, setFundSlug] = useState("");
  const [fundKill, setFundKill] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sodexTest, setSodexTest] = useState<SodexTest | null>(null);

  useEffect(() => {
    void (async () => {
      const h = await fetch("/api/health").then((r) => r.json());
      setHealth(h);
      const ks = await fetch("/api/settings/kill-switch").then((r) => r.json());
      setGlobalKill(ks.active);
      setEnvKill(ks.envOverride);
    })();
  }, []);

  async function toggleGlobalKill() {
    setMessage(null);
    const res = await fetchWithWallet("/api/settings/kill-switch", address, {
      method: "PATCH",
      body: JSON.stringify({ active: !globalKill }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to update kill switch");
      return;
    }
    setGlobalKill(data.active);
    setMessage(data.active ? "Global kill switch ON" : "Global kill switch OFF");
  }

  async function toggleFundKill() {
    if (!fundSlug.trim()) {
      setMessage("Enter a fund slug");
      return;
    }
    setMessage(null);
    const res = await fetchWithWallet("/api/settings/fund-kill-switch", address, {
      method: "PATCH",
      body: JSON.stringify({ slug: fundSlug.trim(), active: fundKill }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed");
      return;
    }
    setMessage(`Fund ${data.slug} kill switch: ${data.killSwitch}`);
  }

  return (
    <div className="mt-10 space-y-6">
      <section className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Wallet</h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Connect with RainbowKit (MetaMask, Coinbase, WalletConnect, and
              more). Addresses are stored locally in the app database for MVP
              paper trading only.
            </p>
            {isConnected && address && (
              <p className="text-sm mt-3 font-mono text-muted">
                {shortenAddress(address, 6)}
              </p>
            )}
          </div>
          <WalletConnectButton variant="settings" />
        </div>
      </section>

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Autonomous ops</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Vercel Cron hits <code className="text-xs bg-elevated px-1 rounded">/api/cron/tick</code> hourly
          to refresh SoSo intel, deliver alerts (6h dedupe), snapshot NAV, generate weekly memos,
          reconcile orders, and propose cadence-based rebalances. Set{" "}
          <code className="text-xs bg-elevated px-1 rounded">CRON_SECRET</code> on Vercel.
        </p>
        <ul className="mt-3 text-xs text-muted space-y-1 list-disc pl-4">
          <li>Hourly: intel · alerts · NAV · reconcile</li>
          <li>Daily: weekly research memo · committee rebalance check</li>
          <li>Every 6h: legacy <code>/api/rebalance/run</code> cadence sweep</li>
        </ul>
      </section>

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Buildathon readiness</h2>
        {health ? (
          <ul className="mt-4 text-sm space-y-2 text-muted">
            <li>
              Overall:{" "}
              <span className={health.ready ? "text-emerald-400" : "text-amber-400"}>
                {health.ready ? "Ready" : "Setup needed"}
              </span>
            </li>
            <li>Database: {health.db ? "connected" : "disconnected"}</li>
            <li>SoSoValue live: {String(health.sosoConfigured)}</li>
            <li>SoDEX testnet: {String(health.sodexTestnet ?? false)}</li>
            <li>Execution mode: {health.executionMode}</li>
            <li>
              OpenAI enhancement:{" "}
              {health.openaiConfigured
                ? "configured"
                : health.openaiRequired
                  ? "required but missing"
                  : "optional (not configured)"}
            </li>
            <li>Buildathon mode: {String(health.buildathonMode ?? false)}</li>
            {health.blockers?.map((b) => (
              <li key={b} className="text-amber-300">
                Blocker: {b}
              </li>
            ))}
            {health.warnings?.map((w) => (
              <li key={w} className="text-muted">
                Note: {w}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mt-4">Loading health...</p>
        )}
      </section>

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Global kill switch</h2>
        <p className="text-sm text-muted mt-2">
          Blocks all trade execution when active.{" "}
          {envKill && (
            <span className="text-amber-400">
              ENV ADMIN_KILL_SWITCH is overriding UI.
            </span>
          )}
        </p>
        <Button
          className="mt-4"
          variant={globalKill ? "secondary" : "primary"}
          onClick={() => void toggleGlobalKill()}
          disabled={envKill}
        >
          {globalKill ? "Disable kill switch" : "Enable kill switch"}
        </Button>
      </section>

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Per-fund kill switch</h2>
        <p className="text-sm text-muted mt-2">
          Stop execution for a specific fund by slug.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 items-end">
          <label className="flex-1 min-w-[180px]">
            <span className="text-xs text-muted">Fund slug</span>
            <input
              value={fundSlug}
              onChange={(e) => setFundSlug(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm"
              placeholder="quantum-momentum-fund-..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fundKill}
              onChange={(e) => setFundKill(e.target.checked)}
            />
            Active
          </label>
          <Button variant="secondary" onClick={() => void toggleFundKill()}>
            Apply
          </Button>
        </div>
      </section>

      <SosoHealthPanel />

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Wallet watchlists</h2>
        <div className="mt-4">
          <WalletWatchPanel />
        </div>
      </section>

      <SodexSetupWizard />

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">SoDEX testnet</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Configure SoDEX credentials and run a connection test before approving execution.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            void fetch("/api/sodex/test")
              .then((r) => r.json())
              .then(setSodexTest)
              .catch(() => setSodexTest(null));
          }}
        >
          Test SoDEX connection
        </Button>
        {sodexTest && (
          <ul className="mt-4 text-sm space-y-1 text-muted">
            <li>Ready: {String(sodexTest.ready)}</li>
            <li>Symbols: {sodexTest.mappedSymbols.join(", ")}</li>
            {sodexTest.accountResolved != null && (
              <li>Resolved account ID: {sodexTest.accountResolved}</li>
            )}
            {sodexTest.blockers.map((b) => (
              <li key={b} className="text-amber-300">
                {b}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="font-semibold">Compliance</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          ThesisX is not financial advice. Use testnet execution with explicit approval.
        </p>
        <ul className="mt-4 text-sm space-y-2">
          <li>
            <Link href="/legal/terms" className="underline">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="/legal/privacy" className="underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/legal/disclosures" className="underline">
              Risk Disclosures
            </Link>
          </li>
        </ul>
      </section>

      {message && (
        <p className="text-sm text-muted border border-border rounded-xl p-3">
          {message}
        </p>
      )}
    </div>
  );
}
