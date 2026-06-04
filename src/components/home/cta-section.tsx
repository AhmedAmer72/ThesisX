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
          Apply in less than 10 minutes today
        </h2>
        <p className="text-muted mt-4 text-[15px]">
          Join builders already launching AI-managed funds on ThesisX.
        </p>
        <form
          className="mt-8 flex flex-col sm:flex-row gap-2 p-1.5 rounded-full bg-surface border border-border-strong max-w-md mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/create");
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="flex-1 px-5 py-3.5 bg-transparent outline-none text-sm rounded-full min-w-0"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start for Free
          </button>
        </form>
      </div>
    </section>
  );
}
