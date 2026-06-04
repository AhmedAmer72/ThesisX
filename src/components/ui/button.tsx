import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-opacity disabled:opacity-50",
          variant === "primary" &&
            "bg-primary text-primary-foreground hover:opacity-90",
          variant === "secondary" &&
            "border border-border-strong bg-surface text-foreground hover:bg-elevated",
          variant === "ghost" && "text-muted hover:text-foreground",
          size === "sm" && "text-sm px-4 py-2",
          size === "md" && "text-sm px-6 py-3",
          size === "lg" && "text-base px-8 py-4",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
