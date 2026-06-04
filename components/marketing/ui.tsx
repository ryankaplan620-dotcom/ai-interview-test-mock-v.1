import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, MouseEventHandler, ReactNode } from "react";

/* ============================================================
   Folio marketing UI primitives
   ------------------------------------------------------------
   One vocabulary for the entire public site so every page
   shares the same rhythm, type scale, and color. Light canvas,
   near-black ink, emerald (`brand`) as a precision accent.
   ============================================================ */

// ----- Layout -----------------------------------------------

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("mx-auto w-full max-w-[1200px] px-6 sm:px-8", className)}>
      {children}
    </div>
  );
}

type SectionTone = "white" | "tint" | "ink";

const sectionTone: Record<SectionTone, string> = {
  white: "bg-canvas",
  tint: "bg-canvas-tint",
  ink: "bg-ink text-white",
};

export function Section({
  id,
  tone = "white",
  bleed = false,
  className,
  containerClassName,
  children,
  ...rest
}: {
  id?: string;
  tone?: SectionTone;
  bleed?: boolean;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
} & ComponentProps<"section">) {
  return (
    <section
      id={id}
      className={clsx(
        "py-20 sm:py-28 lg:py-32",
        sectionTone[tone],
        className,
      )}
      {...rest}
    >
      {bleed ? children : <Container className={containerClassName}>{children}</Container>}
    </section>
  );
}

// ----- Type -------------------------------------------------

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  as: Tag = "h2",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={clsx(
        "text-balance font-display font-semibold leading-[1.08] tracking-[-0.03em] text-gray-900",
        "text-[30px] sm:text-[38px] lg:text-[44px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lede({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={clsx(
        "text-[17px] leading-[1.6] text-gray-600 sm:text-[18px]",
        className,
      )}
    >
      {children}
    </p>
  );
}

// ----- Buttons & links --------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-ink shadow-brand-glow hover:bg-brand-600 hover:-translate-y-px active:translate-y-0",
  secondary:
    "border border-gray-200 bg-white text-gray-900 shadow-card hover:border-gray-300 hover:bg-gray-50",
  ghost: "text-gray-700 hover:text-gray-950",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-[15px] sm:h-[52px] sm:px-7 sm:text-[16px]",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  href,
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  target,
  rel,
  onClick,
  type = "button",
  disabled,
}: {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  const cls = buttonClasses(variant, size, className);
  const content = (
    <>
      {children}
      {withArrow && <ArrowRight />}
    </>
  );

  if (href) {
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return (
        <Link href={href} className={cls} onClick={onClick}>
          {content}
        </Link>
      );
    }
    return (
      <a href={href} className={cls} target={target} rel={rel} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button className={cls} type={type} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
}

export function ArrowLink({
  href,
  className,
  children,
  target,
  rel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
}) {
  const cls = clsx(
    "group/al inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-700 transition-colors hover:text-brand-800",
    className,
  );
  const content = (
    <>
      {children}
      <ArrowRight className="transition-transform duration-200 group-hover/al:translate-x-0.5" />
    </>
  );
  const isInternal = href.startsWith("/") || href.startsWith("#");
  return isInternal ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <a href={href} className={cls} target={target} rel={rel}>
      {content}
    </a>
  );
}

// ----- Surfaces ---------------------------------------------

export function Card({
  className,
  interactive = false,
  children,
}: {
  className?: string;
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-card",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ----- Icons ------------------------------------------------

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={clsx("shrink-0", className)}
    >
      <path
        d="M3.5 8h9M9 4.5 12.5 8 9 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={clsx("shrink-0", className)}
    >
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
