"use client";

import Link from "next/link";
import { Suspense, lazy } from "react";
import { Container, Lede, Button, ArrowLink } from "@/components/marketing/ui";

const HeroScene = lazy(() => import("@/components/3d/HeroScene"));

const avatars = [
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-600",
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white" aria-label="Hero">
      {/* Layered backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-brand-wash" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_72%)]"
        aria-hidden
      />
      {/* 3D gradient sphere (right side, desktop only) */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>

      <Container className="relative flex min-h-[88vh] items-center py-24 sm:py-28">
        <div className="max-w-[720px]">
          {/* Announcement pill */}
          <Link
            href="/#product"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 py-1 pl-1.5 pr-3 text-[12.5px] font-medium text-gray-600 shadow-card backdrop-blur transition-colors hover:border-gray-300"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
              New
            </span>
            Interview practice that feels real
          </Link>

          {/* Headline */}
          <h1
            className="mt-7 text-balance font-display font-semibold leading-[1.03] tracking-[-0.04em] text-gray-900"
            style={{ fontSize: "clamp(42px, 6.4vw, 76px)" }}
          >
            Practice interviews that feel{" "}
            <span className="bg-gradient-to-r from-brand-500 to-emerald-400 bg-clip-text text-transparent">
              real
            </span>
            . Get hired.
          </h1>

          {/* Sub-copy */}
          <Lede className="mt-6 max-w-[560px]">
            Folio runs live voice interviews with distinct personas calibrated to your
            target role. Get scored feedback, track your improvement, and walk in
            unmistakable.
          </Lede>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button href="/signup" size="lg" withArrow>
              Start free
            </Button>
            <ArrowLink href="#how-it-works">See how it works</ArrowLink>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center gap-3.5">
            <div className="flex -space-x-2.5">
              {avatars.map((g, i) => (
                <span
                  key={i}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} ring-2 ring-white`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="text-[14px] text-gray-500">
              Join <span className="font-semibold text-gray-900">2,000+</span> professionals
              practicing with Folio
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
