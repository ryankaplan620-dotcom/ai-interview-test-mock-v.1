import clsx from "clsx";

interface PrepSpaceMarkProps {
  className?: string;
  color?: string;
  size?: number;
}

/**
 * PrepSpace monogram. Two-path SVG on 100×100 viewBox.
 * Brand-locked geometry — do not modify proportions.
 */
export function PrepSpaceMark({ className, color = "currentColor", size }: PrepSpaceMarkProps) {
  return (
    <svg
      className={clsx("folio-mark", className)}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PrepSpace"
      role="img"
    >
      <path
        d="M68 8 C52 8, 38 18, 38 34 L38 46 L22 46 C18 46, 18 54, 22 54 L38 54 L38 82 C38 90, 44 96, 52 96"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M56 46 L72 46" stroke={color} strokeWidth={10} strokeLinecap="round" />
    </svg>
  );
}
