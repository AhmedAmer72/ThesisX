import { HeroFundPrompt } from "@/components/home/hero-fund-prompt";
import { TrustedBy } from "@/components/home/trusted-by";
import { MetricRibbon } from "@/components/home/metric-ribbon";
import { MarketPulse } from "@/components/soso/market-pulse";
import { CapabilitiesStrip } from "@/components/home/capabilities-strip";
import { ProductModules } from "@/components/home/product-modules";
import { FoundationSection } from "@/components/home/foundation-section";
import { IntelligentTools } from "@/components/home/intelligent-tools";
import { SecuritySection } from "@/components/home/security-section";
import { FaqSection } from "@/components/home/faq-section";
import { CtaSection } from "@/components/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroFundPrompt />
      <div className="container py-6 md:py-10">
        <MarketPulse />
      </div>
      <TrustedBy />
      <MetricRibbon />
      <CapabilitiesStrip />
      <ProductModules />
      <FoundationSection />
      <IntelligentTools />
      <SecuritySection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
