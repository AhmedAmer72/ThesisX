import { prisma } from "@/lib/db";

export type RagResult = {
  chunks: { source: string; text: string }[];
  citations: string[];
};

export async function retrieveContext(
  query: string,
  fundId?: string
): Promise<RagResult> {
  const chunks: { source: string; text: string }[] = [];
  const citations: string[] = [];

  if (fundId) {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        thesis: true,
        reasoningLogs: { orderBy: { createdAt: "desc" }, take: 5 },
        agentVotes: { orderBy: { createdAt: "desc" }, take: 6 },
      },
    });
    if (fund?.thesis) {
      chunks.push({
        source: "thesis",
        text: `${fund.thesis.summary} ${fund.thesis.outlook}`,
      });
      citations.push("Fund thesis");
    }
    for (const log of fund?.reasoningLogs ?? []) {
      chunks.push({ source: log.type, text: `${log.title}: ${log.body}` });
      citations.push(log.title);
    }
    for (const vote of fund?.agentVotes ?? []) {
      chunks.push({
        source: vote.agentName,
        text: `${vote.stance}: ${vote.rationale}`,
      });
      citations.push(vote.agentName);
    }
  }

  const q = query.toLowerCase();
  const filtered = chunks.filter(
    (c) =>
      c.text.toLowerCase().includes(q.split(" ")[0] ?? "") || chunks.length <= 3
  );

  return {
    chunks: filtered.length ? filtered : chunks.slice(0, 3),
    citations: [...new Set(citations)].slice(0, 8),
  };
}
