import type { Metadata } from "next";
import { DocsLayout } from "@/components/docs/docs-layout";

export const metadata: Metadata = {
  title: "Docs — ThesisX",
  description:
    "Documentation for ThesisX: wallet accounts, fund creation, SoSoValue intelligence, AI committee, execution, rebalancing, and copy-trading.",
};

export default function DocsPage() {
  return <DocsLayout />;
}
