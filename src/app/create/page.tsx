"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentVotePanel } from "@/components/fund/agent-vote-panel";
import { AllocationChart } from "@/components/fund/allocation-chart";
import { RiskBadge } from "@/components/fund/risk-badge";
import { ExecutionStepper } from "@/components/fund/execution-stepper";
import { IntelSourcesPanel } from "@/components/soso/intel-sources-panel";
import { WhyPortfolioPanel } from "@/components/fund/why-portfolio-panel";
import { useSignMessage } from "wagmi";
import { useWallet } from "@/components/providers/wallet-provider";
import { fetchWithWallet } from "@/lib/wallet/api";
import { signExecutionApproval } from "@/lib/wallet/approval-client";
import { CREATE_PRESETS } from "@/lib/create/presets";
import { CreateStepper } from "@/components/create/create-stepper";
import type {
  IntelligenceModuleHealth,
  IntelligenceSource,
  MarketIntelligencePacket,
} from "@/lib/types";

type FundDetail = {
  slug: string;
  name: string;
  strategyType: string;
  riskLevel: string;
  status: string;
  thesis?: {
    summary: string;
    outlook: string;
    confidence: number;
    sourcesJson?: string;
    intelPacketJson?: string | null;
    intelFetchedAt?: string | null;
  };
  riskPolicy?: {
    maxDrawdownPct: number;
    excludedAssetsJson: string;
  };
  agentVotes: {
    agentName: string;
    stance: string;
    confidence: number;
    rationale: string;
  }[];
  portfolioSnapshots: { allocationsJson: string }[];
  tradeIntents?: { id: string; status: string }[];
};

const RISK_OPTIONS = ["low", "medium", "high", "aggressive"] as const;

function CreateFundContent() {
  const { address, isBackendLinked, sessionStatus, sessionError } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPrompt = searchParams.get("prompt") ?? "";
  const slugParam = searchParams.get("slug");

  const [prompt, setPrompt] = useState(initialPrompt);
  const [riskLevel, setRiskLevel] =
    useState<(typeof RISK_OPTIONS)[number]>("medium");
  const [rebalanceCadence, setRebalanceCadence] = useState<"daily" | "weekly">(
    "weekly"
  );
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(15);
  const [excludedAssets, setExcludedAssets] = useState("");
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [phase, setPhase] = useState<
    "form" | "generating" | "review" | "error"
  >(initialPrompt && !slugParam ? "generating" : slugParam ? "review" : "form");
  const [fund, setFund] = useState<FundDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const [executionMode, setExecutionMode] = useState("mock");
  const [moduleProgress, setModuleProgress] = useState<string[]>([]);
  const [buildathonMode, setBuildathonMode] = useState(false);
  const [committeeMode, setCommitteeMode] = useState<
    "openai" | "deterministic" | null
  >(null);
  const [committeeFallbackReason, setCommitteeFallbackReason] = useState<
    string | null
  >(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        setExecutionMode(h.executionMode ?? "mock");
        setBuildathonMode(Boolean(h.buildathonMode));
      })
      .catch(() => {});
    if (slugParam) {
      void loadFund(slugParam);
    } else if (initialPrompt && phase === "generating" && !fund) {
      void generate(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFund(slug: string) {
    try {
      const detail = await fetch(`/api/funds/${slug}`);
      const full = await detail.json();
      if (!detail.ok) throw new Error(full.error ?? "Not found");
      setFund(full.fund);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("error");
    }
  }

  async function generate(p: string) {
    if (!address) {
      setError("Connect your wallet before generating a fund.");
      setPhase("error");
      return;
    }
    if (!isBackendLinked && sessionStatus !== "linking") {
      setError(
        sessionError ??
          "Wallet session not linked. Confirm the sign-in message in your wallet."
      );
      setPhase("error");
      return;
    }
    setPhase("generating");
    setSteps([
      "Fetching live SoSoValue intelligence...",
      "Running SoSo deterministic committee...",
      "Applying risk checks and allocations...",
      "Preparing execution plan (approval required)...",
    ]);
    setCommitteeMode(null);
    setCommitteeFallbackReason(null);
    setModuleProgress([]);
    void fetch("/api/intelligence/health?live=true")
      .then((r) => r.json())
      .then((h) => {
        const ok = (h.modules ?? [])
          .filter((m: { status: string }) => m.status === "ok")
          .map((m: { label: string }) => m.label);
        if (ok.length) setModuleProgress(ok);
      })
      .catch(() => {});
    const excluded = excludedAssets
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    try {
      const res = await fetchWithWallet("/api/funds", address, {
        method: "POST",
        body: JSON.stringify({
          prompt: p,
          riskLevel,
          rebalanceCadence,
          maxDrawdownPct: maxDrawdownPct / 100,
          excludedAssets: excluded,
          walletAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setCommitteeMode(data.committeeMode ?? null);
      setCommitteeFallbackReason(data.committeeFallbackReason ?? null);
      await loadFund(data.slug);
      router.replace(`/create?slug=${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("error");
    }
  }

  const allocations = fund?.portfolioSnapshots[0]
    ? (JSON.parse(fund.portfolioSnapshots[0].allocationsJson) as {
        symbol: string;
        name: string;
        weight: number;
        sector?: string;
      }[])
    : [];

  let excludedList: string[] = [];
  try {
    excludedList = JSON.parse(
      fund?.riskPolicy?.excludedAssetsJson ?? "[]"
    ) as string[];
  } catch {
    excludedList = [];
  }

  const resolvedCommitteeMode =
    committeeMode ??
    (fund?.thesis?.summary?.includes("[SoSo deterministic committee")
      ? "deterministic"
      : fund
        ? "openai"
        : null);

  return (
    <div className="site-offset container max-w-4xl py-10 md:py-14 min-h-[60vh] bg-page-background">
      <p className="text-xs uppercase tracking-widest text-muted">ThesisX</p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
        Create AI Fund
      </h1>
      <p className="text-muted mt-2 text-[15px]">
        Describe your goal, set risk parameters, review committee output, then
        explicitly approve before any execution.
      </p>

      <div className="mt-6">
        <CreateStepper phase={phase} />
      </div>

      {phase === "form" && (
        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void generate(prompt);
          }}
        >
          {!address && buildathonMode && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              Connect wallet first — fund ownership is required in buildathon mode.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {CREATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPrompt(preset.prompt);
                  setRiskLevel(preset.riskLevel);
                  setRebalanceCadence(preset.rebalanceCadence);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-border-strong hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:border-border-strong"
            placeholder="Create a medium-risk AI infrastructure fund..."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <label>
              <span className="text-xs text-muted uppercase tracking-wider">
                Risk level
              </span>
              <select
                value={riskLevel}
                onChange={(e) =>
                  setRiskLevel(e.target.value as (typeof RISK_OPTIONS)[number])
                }
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs text-muted uppercase tracking-wider">
                Rebalance cadence
              </span>
              <select
                value={rebalanceCadence}
                onChange={(e) =>
                  setRebalanceCadence(e.target.value as "daily" | "weekly")
                }
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label>
              <span className="text-xs text-muted uppercase tracking-wider">
                Max drawdown (%)
              </span>
              <input
                type="number"
                min={5}
                max={40}
                value={maxDrawdownPct}
                onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs text-muted uppercase tracking-wider">
                Excluded assets (comma-separated)
              </span>
              <input
                type="text"
                value={excludedAssets}
                onChange={(e) => setExcludedAssets(e.target.value)}
                placeholder="DOGE, SHIB"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>

          <Button
            type="submit"
            disabled={prompt.length < 10 || (buildathonMode && !address)}
          >
            Generate Fund
          </Button>
        </form>
      )}

      {phase === "generating" && (
        <div className="mt-10 space-y-3">
          {steps.map((s, i) => (
            <p
              key={s}
              className="text-sm text-muted animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              {s}
            </p>
          ))}
          {moduleProgress.length > 0 && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted">
                SoSo modules live
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {moduleProgress.map((m) => (
                  <li key={m}>✓ {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => setPhase("form")}
          >
            Try again
          </Button>
        </div>
      )}

      {phase === "review" && fund && (
        <div className="mt-10 space-y-10">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              resolvedCommitteeMode === "openai"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                : "border-amber-500/30 bg-amber-950/20 text-amber-100"
            }`}
          >
            {resolvedCommitteeMode === "openai" ? (
              <p>
                Generated with live SoSoValue data and OpenAI committee
                enhancement.
              </p>
            ) : (
              <p>
                Generated with live SoSoValue data using the deterministic SoSo
                committee
                {committeeFallbackReason
                  ? ` (AI enhancement unavailable: ${committeeFallbackReason.replaceAll("_", " ")})`
                  : ""}
                .
              </p>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{fund.name}</h2>
            <p className="text-muted text-sm mt-1">{fund.strategyType}</p>
            <div className="mt-4">
              <RiskBadge
                riskLevel={fund.riskLevel}
                confidence={fund.thesis?.confidence ?? 0}
              />
            </div>
            {fund.riskPolicy && (
              <p className="text-xs text-muted mt-2">
                Max drawdown policy:{" "}
                {(fund.riskPolicy.maxDrawdownPct * 100).toFixed(0)}%
                {excludedList.length > 0 &&
                  ` · Excluded: ${excludedList.join(", ")}`}
              </p>
            )}
          </div>

          {fund.thesis && (
            <div className="bg-surface rounded-2xl border border-border p-6">
              <h3 className="font-semibold">Investment thesis</h3>
              <p className="text-sm mt-3 leading-relaxed">
                {fund.thesis.summary}
              </p>
              <p className="text-sm text-muted mt-3 leading-relaxed">
                {fund.thesis.outlook}
              </p>
            </div>
          )}

          <AllocationChart allocations={allocations} />
          {(() => {
            let sources: IntelligenceSource[] = [];
            let moduleHealth: IntelligenceModuleHealth[] | undefined;
            let demoMode = true;
            try {
              sources = JSON.parse(
                fund.thesis?.sourcesJson ?? "[]"
              ) as IntelligenceSource[];
            } catch {
              sources = [];
            }
            if (fund.thesis?.intelPacketJson) {
              try {
                const pkt = JSON.parse(
                  fund.thesis.intelPacketJson
                ) as MarketIntelligencePacket;
                moduleHealth = pkt.moduleHealth;
                demoMode = pkt.demoMode;
              } catch {
                demoMode = sources.some((s) => s.module === "demo");
              }
            } else {
              demoMode = sources.some((s) => s.module === "demo");
            }
            return (
              <IntelSourcesPanel
                sources={sources}
                moduleHealth={moduleHealth}
                intelFetchedAt={fund.thesis?.intelFetchedAt ?? undefined}
                demoMode={demoMode}
              />
            );
          })()}
          <AgentVotePanel votes={fund.agentVotes} />
          {(() => {
            let intel: MarketIntelligencePacket | null = null;
            if (fund.thesis?.intelPacketJson) {
              try {
                intel = JSON.parse(
                  fund.thesis.intelPacketJson
                ) as MarketIntelligencePacket;
              } catch {
                intel = null;
              }
            }
            return (
              <WhyPortfolioPanel
                prompt={initialPrompt || undefined}
                intel={intel}
                committee={{
                  thesis: fund.thesis
                    ? {
                        summary: fund.thesis.summary,
                        outlook: fund.thesis.outlook,
                        narratives: [],
                        constraints: [],
                      }
                    : undefined,
                  agentVotes: fund.agentVotes.map((v) => ({
                    ...v,
                    sources: [],
                    stance: v.stance as "bullish" | "bearish" | "neutral" | "cautious",
                  })),
                  confidence: fund.thesis?.confidence ?? 0,
                }}
                allocations={allocations}
              />
            );
          })()}

          <div>
            <p className="text-sm text-muted mb-3">Execution status</p>
            <ExecutionStepper
              currentStep={
                fund.status === "active"
                  ? 4
                  : fund.status === "pending_review"
                    ? 1
                    : 3
              }
            />
          </div>

          {fund.status === "pending_review" && (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <h3 className="font-semibold">Approve execution</h3>
              <p className="text-sm text-muted leading-relaxed">
                Execution will run in{" "}
                <code className="text-xs bg-elevated px-1 rounded">
                  {executionMode}
                </code>{" "}
                mode. This is not financial advice. Read our{" "}
                <Link href="/legal/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclosureAccepted}
                  onChange={(e) => setDisclosureAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand ThesisX uses AI-generated allocations, testnet or
                  mock execution only in MVP, and I accept all execution and
                  market risks.
                </span>
              </label>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 text-sm text-emerald-100">
            Your fund is public and should appear in the{" "}
            <Link href="/marketplace" className="underline font-medium">
              Marketplace
            </Link>{" "}
            immediately after creation.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push(`/funds/${fund.slug}`)}>
              View Public Fund Page
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/marketplace")}
            >
              Open Marketplace
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/dashboard/${fund.slug}`)}
            >
              Open Dashboard
            </Button>
            {fund.status === "pending_review" && (
              <Button
                disabled={!disclosureAccepted || approving || !address}
                onClick={async () => {
                  setApproving(true);
                  setError(null);
                  try {
                    const pendingIntent = fund.tradeIntents?.find((t) =>
                      ["pending_review", "pending_approval"].includes(t.status)
                    );
                    if (!pendingIntent) {
                      throw new Error("No pending trade intent found.");
                    }
                    const approval = await signExecutionApproval(
                      address!,
                      signMessageAsync,
                      {
                        action: "fund_execute",
                        slug: fund.slug,
                        intentId: pendingIntent.id,
                      }
                    );
                    const res = await fetchWithWallet(
                      `/api/funds/${fund.slug}/approve`,
                      address,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          disclosureAccepted: true,
                          intentId: pendingIntent.id,
                          approvalSignature: approval.approvalSignature,
                          approvalTimestamp: approval.approvalTimestamp,
                        }),
                      }
                    );
                    const data = await res.json();
                    if (!res.ok)
                      throw new Error(data.error ?? "Approval failed");
                    await loadFund(fund.slug);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Approval failed"
                    );
                  } finally {
                    setApproving(false);
                  }
                }}
              >
                {approving ? "Sign & Execute..." : "Sign & Approve Execution"}
              </Button>
            )}
          </div>
          {error && phase === "review" && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-16 text-muted">Loading...</div>}>
      <CreateFundContent />
    </Suspense>
  );
}
