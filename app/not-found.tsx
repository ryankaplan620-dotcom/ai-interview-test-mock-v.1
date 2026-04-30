import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <FolioMark className="h-10 w-10" color="#00F590" />
      <p className="mt-8 font-display text-[120px] font-bold leading-none text-accent/20">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-text-primary">Page not found</h1>
      <p className="mt-3 max-w-md font-sans text-[15px] text-text-secondary">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-accent px-6 font-sans text-[14px] font-semibold text-ink transition-all hover:brightness-110"
      >
        Go home
      </Link>
    </div>
  );
}
