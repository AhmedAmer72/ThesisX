import { HeroFundPrompt } from "@/components/home/hero-fund-prompt";
import { TrustedBy } from "@/components/home/trusted-by";
import { FoundationSection } from "@/components/home/foundation-section";
import { CapabilitiesStrip } from "@/components/home/capabilities-strip";
import { Testimonials } from "@/components/home/testimonials";
import { MetricRibbon } from "@/components/home/metric-ribbon";
import { MarketPulse } from "@/components/soso/market-pulse";
import { IntelligentTools } from "@/components/home/intelligent-tools";
import { ProductModules } from "@/components/home/product-modules";
import { SecuritySection } from "@/components/home/security-section";
import { PricingSection } from "@/components/home/pricing-section";
import { FaqSection } from "@/components/home/faq-section";
import { CtaSection } from "@/components/home/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroFundPrompt />
      <TrustedBy />
      <FoundationSection />
      <CapabilitiesStrip />
      <Testimonials />
      <div className="container py-8 md:py-12">
        <MarketPulse />
      </div>
      <MetricRibbon />
      <IntelligentTools />
      <ProductModules />
      <SecuritySection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
