import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { isAiRequired } from "@/lib/production";
import type { MarketIntelligencePacket } from "@/lib/types";
import { retrieveContext } from "@/lib/ai/rag";

export const PROMPT_VERSION = "committee-v2";

export type AgentRole =
  | "Research"
  | "Risk"
  | "Allocation"
  | "Execution"
  | "Alert"
  | "Copilot"
  | "Report";

export type AgentRunResult = {
  agentName: AgentRole;
  output: Record<string, unknown>;
  citations: string[];
  confidence?: number;
  model?: string;
};

export async function runAgent(
  role: AgentRole,
  input: {
    prompt: string;
    intel: MarketIntelligencePacket;
    fundId?: string;
    userId?: string;
  }
): Promise<AgentRunResult> {
  const rag = await retrieveContext(input.prompt, input.fundId);
  const citations = [
    ...input.intel.sources.map((s) => s.label),
    ...rag.citations,
  ];

  if (!process.env.OPENAI_API_KEY) {
    if (isAiRequired()) {
      throw new Error("OPENAI_API_KEY required for AI agents in production");
    }
    return {
      agentName: role,
      output: {
        status: "unavailable",
        message: "OpenAI not configured",
        role,
      },
      citations,
      confidence: 0,
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are the ThesisX ${role} agent. Return JSON with keys: summary, recommendation, confidence (0-100), rationale, sources[]. Use only provided intelligence and context. Never invent prices or returns.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          role,
          prompt: input.prompt,
          intelligence: input.intel,
          context: rag.chunks,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const output = JSON.parse(raw) as Record<string, unknown>;

  const run = await prisma.aiRun.create({
    data: {
      fundId: input.fundId ?? null,
      userId: input.userId ?? null,
      agentName: role,
      promptVersion: PROMPT_VERSION,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      inputJson: JSON.stringify({ prompt: input.prompt, role }),
      outputJson: JSON.stringify(output),
      citationsJson: JSON.stringify(citations),
      confidence:
        typeof output.confidence === "number" ? output.confidence : undefined,
      status: "completed",
    },
  });

  return {
    agentName: role,
    output: { ...output, runId: run.id },
    citations,
    confidence:
      typeof output.confidence === "number" ? output.confidence : undefined,
    model: run.model ?? undefined,
  };
}

export async function runCopilotQuery(
  query: string,
  options: { fundId?: string; userId?: string; intel?: MarketIntelligencePacket }
): Promise<AgentRunResult> {
  if (!options.intel) {
    throw new Error("Intelligence packet required for copilot");
  }
  return runAgent("Copilot", {
    prompt: query,
    intel: options.intel,
    fundId: options.fundId,
    userId: options.userId,
  });
}
