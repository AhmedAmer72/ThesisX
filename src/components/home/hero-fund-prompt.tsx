"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeroPartnerMarquee } from "@/components/home/hero-partner-marquee";
import { HeroVideoBackground } from "@/components/home/hero-video-background";
import { CREATE_PRESETS } from "@/lib/create/presets";

export function HeroFundPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  return (
    <section className="hero-slash-section hero hero-site-offset relative overflow-hidden bg-black">
      <HeroVideoBackground />
      <div className="hero-slash-glow" aria-hidden />

      <div className="container relative z-10 max-w-[1216px]">
        <div className="hero-slash-stage relative flex min-h-[720px] flex-col pb-10 pt-0 sm:min-h-[760px] lg:min-h-[700px] lg:pb-12 lg:pt-2 xl:min-h-[740px]">
          <div className="relative z-20 mx-auto max-w-[640px] pt-2 text-center sm:pt-4 lg:mx-0 lg:max-w-[860px] lg:pt-6 lg:text-left xl:pt-8">
            <h1 className="hero-headline">
              <span className="hero-headline-eyebrow">
                Powered by SoSoValue
              </span>
              <span className="hero-headline-block" aria-hidden>
                <span className="hero-headline-flourish" />
              </span>
              <span className="hero-headline-line hero-headline-line-1">
                Turn live <span className="hero-headline-gold">SoSo</span>
              </span>
              <span className="hero-headline-line hero-headline-line-2">
                <span className="hero-headline-gold hero-headline-italic">
                  intelligence
                </span>
              </span>
              <span className="hero-headline-line hero-headline-line-3">
                <span className="hero-headline-in">into</span>{" "}
                <span className="hero-headline-sans">AI hedge funds</span>
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-[540px] text-base leading-relaxed text-[#9b9b9b] sm:text-lg lg:mx-0">
              Describe your thesis, get live SoSoValue signals across 9 modules,
              review a multi-agent committee, sign wallet approval, and execute
              on SoDEX testnet.
            </p>

            <form
              className="mx-auto mt-8 max-w-xl lg:mx-0"
              onSubmit={(e) => {
                e.preventDefault();
                if (prompt.trim().length < 10) return;
                router.push(`/create?prompt=${encodeURIComponent(prompt.trim())}`);
              }}
            >
              <label className="block text-left text-xs uppercase tracking-widest text-[#8c8c8c] mb-2">
                Describe your fund
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Medium-risk AI infrastructure fund using SoSo ETF flows and SSI index momentum..."
                className="w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-[#666] focus:border-[#c9a227]/60 focus:outline-none"
              />
              <div className="hero-cta-row mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={prompt.trim().length < 10}
                  className="hero-cta-primary disabled:opacity-50"
                >
                  Launch AI Fund
                </button>
                <Link href="/marketplace" className="hero-cta-secondary">
                  Browse Marketplace
                </Link>
                <Link href="/docs#intelligence" className="hero-cta-secondary">
                  SoSo Modules
                </Link>
              </div>
            </form>

            <div className="mx-auto mt-4 flex flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
              {CREATE_PRESETS.map((preset) => (
                <Link
                  key={preset.id}
                  href={`/create?prompt=${encodeURIComponent(preset.prompt)}`}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#cccccc] hover:border-white/40 hover:text-white"
                >
                  {preset.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hero-social-proof relative z-20 mt-16 border-t border-white/[0.08] lg:mt-auto">
            <div className="flex flex-col gap-8 pt-8 lg:flex-row lg:items-center lg:gap-10 lg:pt-10">
              <div className="shrink-0 lg:max-w-[420px] xl:max-w-[480px]">
                <p className="text-center text-[15px] leading-relaxed text-[#8c8c8c] lg:text-left">
                  <span className="font-display mb-2 block text-[2rem] leading-none tracking-[-0.02em] text-white sm:text-[2.35rem] lg:mb-3 lg:text-[2.65rem] xl:text-5xl">
                    SoSo → Committee → SoDEX
                  </span>
                  <span className="block lg:max-w-[38ch]">
                    Live intelligence, wallet-signed approvals, and testnet
                    execution in one flow
                  </span>
                </p>
              </div>

              <div className="min-w-0 flex-1 lg:pt-1">
                <HeroPartnerMarquee />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
