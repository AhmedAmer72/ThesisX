"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function scrollToHashElement(hash: string): boolean {
  if (!hash || hash === "#") return false;
  const el = document.querySelector(hash);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const run = () => {
      const hash = window.location.hash;
      if (!hash || pathname !== "/") return;

      if (scrollToHashElement(hash)) return;

      let attempts = 0;
      const retry = () => {
        attempts += 1;
        if (scrollToHashElement(hash) || attempts >= 12) return;
        window.setTimeout(retry, 80);
      };
      window.setTimeout(retry, 80);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [pathname]);

  return null;
}
