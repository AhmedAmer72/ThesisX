"use client";

import { FollowButton } from "@/components/fund/follow-button";

export function FollowFundButton({
  fundId,
  fundSlug,
}: {
  fundId: string;
  fundSlug?: string;
}) {
  return <FollowButton fundId={fundId} fundSlug={fundSlug} />;
}
