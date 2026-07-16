import { PaperPortfolioView } from "@/components/dashboard/paper-portfolio-view";

export default async function FollowingPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PaperPortfolioView slug={slug} />;
}
