"use client";

import { useState } from "react";
import { useSignTypedData } from "wagmi";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { Button } from "@/components/ui/button";
import {
  buildAddApiKeyPayloadHash,
  formatUniversalSignature,
  SODEX_EXCHANGE_ACTION_TYPES,
  SODEX_TESTNET_CHAIN_ID,
  SODEX_UNIVERSAL_EIP712_DOMAIN,
  submitAddApiKey,
  type AddApiKeyParams,
} from "@/lib/sodex/register-api-key";

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
  const { signTypedDataAsync } = useSignTypedData();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);

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

  async function registerKey() {
    if (!address) {
      alert("Connect your master wallet on ValueChain testnet first.");
      return;
    }
    if (!generated) {
      alert("Generate an API key pair first.");
      return;
    }

    const payload = generated.addApiKeyPayload as AddApiKeyParams;
    const accountId =
      setup?.accountId ??
      Number(process.env.NEXT_PUBLIC_SODEX_ACCOUNT_ID ?? "0");
    const params: AddApiKeyParams = {
      accountID: accountId || 58485,
      name: generated.keyName,
      type: 1,
      publicKey: generated.publicAddress as `0x${string}`,
      expiresAt: Number(payload.expiresAt),
    };

    setLoading(true);
    setRegisterMsg(null);
    try {
      const nonce = String(Date.now());
      const payloadHash = buildAddApiKeyPayloadHash(params);
      const signature = await signTypedDataAsync({
        domain: {
          ...SODEX_UNIVERSAL_EIP712_DOMAIN,
          chainId: SODEX_TESTNET_CHAIN_ID,
        },
        types: SODEX_EXCHANGE_ACTION_TYPES,
        primaryType: "ExchangeAction",
        message: {
          payloadHash,
          nonce: BigInt(nonce),
        },
      });

      const result = await submitAddApiKey(
        params,
        formatUniversalSignature(signature),
        nonce
      );

      const body = result.body as { code?: number; error?: string; message?: string };
      if (!result.ok || (body.code != null && body.code !== 0)) {
        throw new Error(
          body.error ?? body.message ?? `Registration failed (${result.status})`
        );
      }

      setRegisterMsg(`Registered "${generated.keyName}" on SoDEX testnet.`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setRegisterMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  async function generateKey() {
    if (!address) {
      alert("Connect wallet before generating a SoDEX API key.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithWallet("/api/sodex/setup", address, {
        method: "POST",
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
          Buildathon testnet does <strong>not</strong> require a separate API
          access application. You still register a key on testnet via{" "}
          <code className="text-xs">addAPIKey</code> — signed by your master
          wallet. The trade UI and{" "}
          <a
            href="https://sodex.com/apikeys"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            sodex.com/apikeys
          </a>{" "}
          are mainnet-only. Use the flow below on testnet.{" "}
          <a
            href="https://sodex.com/documentation/api/api"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </p>
      </div>

      <ol className="list-decimal list-inside text-sm text-muted space-y-1">
        <li>
          Connect master wallet on ValueChain testnet
          {address ? (
            <>
              {" "}
              (<code className="text-xs">{address}</code>)
            </>
          ) : null}
        </li>
        <li>Generate API key pair (save private key — shown once)</li>
        <li>
          Register on testnet — wallet signs{" "}
          <code className="text-xs">addAPIKey</code> to{" "}
          <code className="text-xs">testnet-gw.sodex.dev/.../accounts/api-keys</code>
        </li>
        <li>
          Set env: <code className="text-xs">SODEX_API_KEY_NAME</code>,{" "}
          <code className="text-xs">SODEX_API_PRIVATE_KEY</code>,{" "}
          <code className="text-xs">SODEX_USER_ADDRESS</code>,{" "}
          <code className="text-xs">SODEX_ACCOUNT_ID</code>
        </li>
        <li>Check setup status — key name should appear in registered keys</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          Check setup status
        </Button>
        <Button onClick={() => void generateKey()} disabled={loading}>
          Generate API key pair
        </Button>
        <Button
          variant="secondary"
          onClick={() => void registerKey()}
          disabled={loading || !generated}
        >
          Register on testnet (wallet signs)
        </Button>
      </div>

      {registerMsg && (
        <p className="text-xs text-amber-100">{registerMsg}</p>
      )}

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
