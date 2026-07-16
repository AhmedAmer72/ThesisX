/** Landing header center links */
export const marketingNavLinks = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
] as const;

/** In-app navigation (shown after entering via Get Started) */
export const appNavLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Create", href: "/create" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Docs", href: "/docs" },
  { label: "Settings", href: "/settings" },
] as const;

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/create") {
    return (
      pathname === "/create" ||
      pathname.startsWith("/create/") ||
      pathname.startsWith("/funds/")
    );
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  if (href === "/marketplace") {
    return pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Footer / home section anchors */
export const homeNavLinks = [
  { label: "Create", href: "/create" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const homeSectionIds = [
  "company",
  "foundation",
  "platform",
  "tools",
  "security",
  "pricing",
  "faq",
] as const;

export function isAppRoute(pathname: string): boolean {
  return (
    pathname === "/create" ||
    pathname.startsWith("/create/") ||
    pathname === "/marketplace" ||
    pathname.startsWith("/marketplace/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/funds/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/")
  );
}
