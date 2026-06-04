"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThesisXLogo } from "@/components/brand/thesisx-logo";
import {
  appNavLinks,
  isAppRoute,
  isNavItemActive,
  marketingNavLinks,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { ReadinessPill } from "@/components/layout/readiness-pill";

function NavLink({
  href,
  label,
  active,
  onClick,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "text-[15px] transition-colors",
        active ? "text-white" : "text-[#cccccc] hover:text-white",
        className
      )}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const inApp = isAppRoute(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const centerLinks = inApp ? appNavLinks : marketingNavLinks;
  const mobileLinks = inApp
    ? appNavLinks
    : [...marketingNavLinks, { label: "Get Started", href: "/create" }];

  return (
    <>
      <header className="gold-chrome-bar site-header-shell fixed left-0 right-0 top-0 z-50 h-14 w-screen px-safe lg:h-16">
        <nav
          className="container relative z-10 grid h-full max-w-[1216px] grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4"
          aria-label="Global"
        >
          <div className="flex min-w-0 items-center justify-start">
            <ThesisXLogo variant="slash" />
          </div>

          <div className="hidden items-center justify-center gap-6 lg:flex lg:gap-8">
            {centerLinks.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isNavItemActive(pathname, item.href)}
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <svg
                width="18"
                height="12"
                viewBox="0 0 18 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M0 1H18M0 6H18M0 11H18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <ReadinessPill />
            {!inApp && (
              <Link
                href="/create"
                className="rounded-full border border-white/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-5 sm:py-2.5"
              >
                Get Started
              </Link>
            )}
            <WalletConnectButton variant="header" />
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,300px)] flex-col bg-[#0a0a0a] p-6 pt-20">
            <button
              type="button"
              className="absolute right-5 top-4 text-sm text-[#888888]"
              onClick={closeMobile}
            >
              Close
            </button>
            <div className="flex flex-col gap-1 text-white">
              {mobileLinks.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isNavItemActive(pathname, item.href)}
                  onClick={closeMobile}
                  className="rounded-lg px-2 py-3 hover:bg-white/5"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
