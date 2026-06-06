"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="site-offset container py-24 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="text-muted mt-3 text-sm max-w-md mx-auto">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-8 flex gap-4 justify-center">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm"
        >
          Try again
        </button>
        <Link href="/dashboard" className="px-4 py-2 text-sm text-muted underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
