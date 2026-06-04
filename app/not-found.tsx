import { FolioMark } from "@/components/FolioMark";
import { Button } from "@/components/marketing/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <FolioMark className="h-10 w-10" color="#00DC82" />
      <p className="mt-8 font-display text-[128px] font-bold leading-none tracking-[-0.04em] text-gray-900/[0.06]">
        404
      </p>
      <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.02em] text-gray-900">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button href="/" size="lg" withArrow className="mt-8">
        Go home
      </Button>
    </div>
  );
}
