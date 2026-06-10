import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonBaseProps & ComponentProps<"button">) {
  return (
    <button className={clsx(buttonStyles(variant, size), className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonBaseProps & ComponentProps<typeof Link>) {
  return (
    <Link className={clsx(buttonStyles(variant, size), className)} {...rest}>
      {children}
    </Link>
  );
}

function buttonStyles(variant: Variant, size: Size): string {
  const base =
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-semibold tracking-body transition-all duration-200 ease-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<Variant, string> = {
    primary:
      "bg-cta-gradient text-text-onAccent shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-accent-glow-lg active:translate-y-px",
    secondary:
      "border border-ink-border bg-ink-raised text-text-primary hover:border-accent/50 hover:text-accent active:translate-y-px",
    ghost:
      "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:translate-y-px",
  };

  const sizes: Record<Size, string> = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-11 px-6 text-[14px]",
    lg: "h-13 px-8 text-[15px]",
  };

  return `${base} ${variants[variant]} ${sizes[size]}`;
}
