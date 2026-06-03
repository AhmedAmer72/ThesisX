export type CreatePreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  riskLevel: "low" | "medium" | "high" | "aggressive";
  rebalanceCadence: "daily" | "weekly";
};

export const CREATE_PRESETS: CreatePreset[] = [
  {
    id: "etf-flow",
    label: "ETF Flow Momentum",
    description: "Rotate into assets with strongest spot ETF inflows from SoSoValue.",
    prompt:
      "Build a medium-risk crypto fund that overweight assets supported by positive US spot ETF inflows and strong institutional demand. Use SoSoValue ETF and currency data to justify allocations.",
    riskLevel: "medium",
    rebalanceCadence: "weekly",
  },
  {
    id: "macro-hedge",
    label: "Macro Risk-Off Hedge",
    description: "Defensive posture when macro signals turn cautious.",
    prompt:
      "Create a low-risk defensive crypto portfolio that reduces drawdown during macro risk-off periods. Prioritize stable large caps and explain each position using SoSoValue macro and news feeds.",
    riskLevel: "low",
    rebalanceCadence: "weekly",
  },
  {
    id: "btc-treasury",
    label: "BTC Treasury Rotation",
    description: "Follow corporate BTC treasury and treasury-adjacent narratives.",
    prompt:
      "Design an aggressive fund focused on Bitcoin and treasury-adjacent exposure informed by SoSoValue BTC treasury and currency modules. Highlight catalysts and risk controls.",
    riskLevel: "aggressive",
    rebalanceCadence: "daily",
  },
  {
    id: "ssi-index",
    label: "SSI Index Strategy",
    description: "Anchor allocations to SoSoValue on-chain index leadership.",
    prompt:
      "Launch a fund aligned with SoSoValue SSI index leadership and sector rotation. Use index performance, macro context, and spot movers to build a transparent allocation thesis.",
    riskLevel: "medium",
    rebalanceCadence: "weekly",
  },
];
