"use client";

import { FollowButton } from "@/components/fund/follow-button";

export function FollowFundButton({ fundId }: { fundId: string }) {
  return <FollowButton fundId={fundId} />;
}
