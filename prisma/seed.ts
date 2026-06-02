import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO_FUNDS !== "true") {
    console.log("Seed skipped — set SEED_DEMO_FUNDS=true to create demo funds");
    return;
  }

  const existing = await prisma.fund.findFirst({
    where: { slug: "quantum-momentum-fund" },
  });
  if (existing) {
    console.log("Seed skipped — sample fund exists");
    return;
  }

  await prisma.fund.create({
    data: {
      slug: "quantum-momentum-fund",
      name: "Quantum Momentum Fund",
      prompt: "Create a medium-risk narrative rotation fund with weekly rebalancing.",
      strategyType: "Narrative Rotation",
      riskLevel: "medium",
      rebalanceCadence: "weekly",
      status: "active",
      isPublic: true,
      isSeeded: true,
      thesis: {
        create: {
          summary:
            "Rotates into high-conviction AI infrastructure narratives supported by SoSoValue ETF and index data.",
          outlook: "Constructive regime with selective risk controls.",
          narratives: JSON.stringify([
            "AI infrastructure capex",
            "ETF inflow support",
          ]),
          constraints: JSON.stringify(["Max sector 50%", "Weekly rebalance"]),
          sourcesJson: JSON.stringify([{ module: "demo", label: "Seed" }]),
          confidence: 84,
        },
      },
      riskPolicy: {
        create: {
          maxDrawdownPct: 0.15,
          maxPositionPct: 0.3,
          maxSectorPct: 0.5,
          maxAssets: 7,
        },
      },
      portfolioSnapshots: {
        create: {
          allocationsJson: JSON.stringify([
            { symbol: "ETH", name: "Ethereum", weight: 0.25, sector: "L1" },
            { symbol: "RNDR", name: "Render", weight: 0.2, sector: "AI Infrastructure" },
            { symbol: "TAO", name: "Bittensor", weight: 0.15, sector: "AI Infrastructure" },
            { symbol: "USDC", name: "USD Coin", weight: 0.2, sector: "Cash" },
          ]),
          nav: 112400,
          confidence: 84,
        },
      },
      agentVotes: {
        create: [
          {
            agentName: "Macro Agent",
            stance: "bullish",
            confidence: 78,
            rationale: "ETF flows positive.",
            sourcesJson: "[]",
          },
          {
            agentName: "Momentum Agent",
            stance: "bullish",
            confidence: 82,
            rationale: "Sector rotation into AI infra.",
            sourcesJson: "[]",
          },
          {
            agentName: "Risk Agent",
            stance: "neutral",
            confidence: 70,
            rationale: "Within policy limits.",
            sourcesJson: "[]",
          },
        ],
      },
      performancePoints: {
        create: { nav: 112400, pnlPct: 12.4, drawdownPct: 0.03 },
      },
      reasoningLogs: {
        create: {
          type: "thesis",
          title: "Seeded demo fund",
          body: "Sample fund for marketplace and judge demo.",
        },
      },
    },
  });
  console.log("Seeded Quantum Momentum Fund");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
