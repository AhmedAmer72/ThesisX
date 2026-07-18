"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CtaSection() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  return (
    <section className="border-t border-border bg-page-background py-20 md:py-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-display text-3xl font-normal tracking-tight md:text-4xl">
          Launch from live SoSo signals
        </h2>
        <p className="text-muted mt-4 text-[15px]">
          Connect wallet, describe your thesis, review committee output, and
          approve execution on SoDEX testnet.
        </p>
        <form
          className="mt-8 flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl bg-surface border border-border-strong max-w-xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim().length < 10) {
              router.push("/create");
              return;
            }
            router.push(`/create?prompt=${encodeURIComponent(email.trim())}`);
          }}
        >
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Describe your AI fund thesis..."
            className="flex-1 px-5 py-3.5 bg-transparent outline-none text-sm rounded-xl min-w-0"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-xl bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create Fund
          </button>
        </form>
      </div>
    </section>
  );
}
