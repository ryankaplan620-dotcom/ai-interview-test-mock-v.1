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
    "inline-flex items-center justify-center rounded-full font-sans font-semibold tracking-body transition-all duration-200 ease-brand disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<Variant, string> = {
    primary:
      "bg-cta-gradient text-text-onAccent hover:shadow-accent-glow-lg",
    secondary:
      "bg-ink-surface border border-ink-border text-text-primary hover:border-accent hover:text-accent",
    ghost: "text-text-primary hover:text-accent",
  };

  const sizes: Record<Size, string> = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-11 px-6 text-[14px]",
    lg: "h-13 px-8 text-[15px]",
  };

  return `${base} ${variants[variant]} ${sizes[size]}`;
}
