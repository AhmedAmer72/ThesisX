"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@/components/ui/button";

type SetupState = {
  userAddress: string | null;
  accountId: number | null;
  apiKeys: string[];
  keyRegistered: boolean;
  blockers: string[];
  warnings: string[];
  setupSteps: string[];
  docsUrl: string;
};

type GeneratedKey = {
  keyName: string;
  publicAddress: string;
  privateKey: string;
  addApiKeyPayload: Record<string, unknown>;
  envExample: Record<string, string>;
};

export function SodexSetupWizard() {
  const { address } = useWallet();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const q = address ? `?address=${address}` : "";
      const res = await fetch(`/api/sodex/setup${q}`);
      setSetup(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function generateKey() {
    setLoading(true);
    try {
      const res = await fetch("/api/sodex/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", keyName: "thesisx-api-01" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate key");
      setGenerated(data.generated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
      <div>
        <h2 className="font-semibold">SoDEX setup wizard</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          SoDEX API keys are generated locally, then registered on testnet with
          your master wallet via <code className="text-xs">addAPIKey</code>. See{" "}
          <a
            href="https://sodex.com/documentation/api/api"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            SoDEX API docs
          </a>
          .
        </p>
      </div>

      <ol className="list-decimal list-inside text-sm text-muted space-y-1">
        <li>Connect wallet on ValueChain testnet</li>
        <li>Generate API key pair below</li>
        <li>Register public key on SoDEX (master wallet signs addAPIKey)</li>
        <li>Add env vars to Vercel: SODEX_API_KEY_NAME, SODEX_API_PRIVATE_KEY, SODEX_USER_ADDRESS, SODEX_ACCOUNT_ID</li>
        <li>Run connection test</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          Check setup status
        </Button>
        <Button onClick={() => void generateKey()} disabled={loading}>
          Generate API key pair
        </Button>
      </div>

      {setup && (
        <ul className="text-sm space-y-1 text-muted">
          <li>User address: {setup.userAddress ?? address ?? "not set"}</li>
          <li>Account ID: {setup.accountId ?? "unresolved"}</li>
          <li>Registered API keys: {setup.apiKeys.join(", ") || "none"}</li>
          <li>Configured key registered: {String(setup.keyRegistered)}</li>
          {setup.blockers.map((b) => (
            <li key={b} className="text-amber-300">
              Blocker: {b}
            </li>
          ))}
          {setup.warnings.map((w) => (
            <li key={w}>Note: {w}</li>
          ))}
        </ul>
      )}

      {generated && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs space-y-2 overflow-x-auto">
          <p className="text-amber-100 font-medium">
            Save these values securely — shown once:
          </p>
          <pre className="whitespace-pre-wrap text-muted">
            {JSON.stringify(generated, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
