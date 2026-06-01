import Link from "next/link";
import { ThesisXMark } from "@/components/brand/thesisx-mark";
import { cn } from "@/lib/utils";

type LogoVariant = "full" | "wordmark" | "slash" | "inverted";

const wordmarkClass: Record<LogoVariant, string> = {
  slash: "font-display text-[1.65rem] font-medium tracking-[-0.02em] text-white",
  wordmark: "text-[1.35rem] font-semibold tracking-[-0.04em] text-foreground",
  full: "text-xl font-semibold leading-none tracking-[-0.04em] text-foreground",
  inverted: "text-xl font-semibold leading-none tracking-[-0.04em] text-foreground",
};

const markSize: Record<LogoVariant, number> = {
  slash: 38,
  wordmark: 34,
  full: 34,
  inverted: 38,
};

export function ThesisXLogo({ variant = "full" }: { variant?: LogoVariant }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 leading-none"
      aria-label="ThesisX home"
    >
      <ThesisXMark size={markSize[variant]} />
      <span className={cn(wordmarkClass[variant])}>ThesisX</span>
    </Link>
  );
}
