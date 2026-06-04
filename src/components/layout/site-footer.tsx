import Link from "next/link";
import { ThesisXLogo } from "@/components/brand/thesisx-logo";
import { homeNavLinks } from "@/lib/nav";

const productLinks = [
  { href: "/create", label: "AI Fund Generator" },
  { href: "/marketplace", label: "Fund Marketplace" },
  { href: "/#platform", label: "Investment Committee" },
];

const platformLinks = [
  { href: "/docs", label: "Documentation" },
  { href: "/#foundation", label: "SoSoValue Intelligence" },
  { href: "/#tools", label: "Portfolio Engine" },
  { href: "/#security", label: "Security" },
  { href: "/settings", label: "Settings & Testnet" },
];

export function SiteFooter() {
  return (
    <footer className="mt-0 border-t border-border bg-black text-foreground">
      <div className="container py-16 md:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <ThesisXLogo variant="inverted" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed opacity-60">
              The AI operating system for on-chain finance. Powered by SoSoValue.
              Executed via SoDEX.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs uppercase tracking-wider opacity-50">
              Navigate
            </p>
            <ul className="space-y-2 text-sm opacity-80">
              {homeNavLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:opacity-100">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/settings" className="hover:opacity-100">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs uppercase tracking-wider opacity-50">
              Products
            </p>
            <ul className="space-y-2 text-sm opacity-80">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:opacity-100">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs uppercase tracking-wider opacity-50">
              Platform
            </p>
            <ul className="space-y-2 text-sm opacity-80">
              {platformLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:opacity-100">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-white/10 pt-8 text-xs opacity-50 sm:flex-row">
          <p>© {new Date().getFullYear()} ThesisX. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/legal/terms" className="hover:opacity-100">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:opacity-100">
              Privacy
            </Link>
            <Link href="/legal/disclosures" className="hover:opacity-100">
              Disclosures
            </Link>
            <span>Not financial advice — Testnet execution in MVP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
