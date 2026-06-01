import { THESISX_LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function ThesisXMark({
  className,
  size = 34,
}: {
  className?: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={THESISX_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
    />
  );
}
