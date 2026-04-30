"use client";

import { Suspense, lazy, useState, useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

const ScoreOrb = lazy(() => import("@/components/3d/ScoreOrb"));

const TARGET_SCORE = 74;
const COUNTER_DURATION = 1500;
const RADAR_DURATION = 1200;

const dimensions = [
  { label: "Structure", value: 82 },
  { label: "Clarity", value: 78 },
  { label: "Confidence", value: 61 },
  { label: "Specificity", value: 75 },
  { label: "Conciseness", value: 72 },
  { label: "Persuasion", value: 73 },
];

const RADIUS = 120;
const CENTER = 150;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function polarToCartesian(index: number, value: number, radius: number): [number, number] {
  const angle = (Math.PI / 2) + index * ((2 * Math.PI) / 6);
  const r = (value / 100) * radius;
  return [CENTER - r * Math.cos(angle), CENTER - r * Math.sin(angle)];
}

function hexagonPath(fraction: number): string {
  const points = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = polarToCartesian(i, fraction * 100, RADIUS);
    return `${x},${y}`;
  });
  return points.join(" ");
}

export function FolioScore() {
  return (
    <section className="bg-white px-6 py-24 sm:px-8 md:py-32" aria-label="The Folio Score">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            THE FOLIO SCORE
          </span>

          <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-gray-900 sm:text-[44px]">
            One number. The one that matters.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid items-center gap-16 md:grid-cols-2">
          <AnimatedCounter />
          <div className="relative">
            <div className="relative h-[300px]">
              <Suspense fallback={null}>
                <ScoreOrb />
              </Suspense>
            </div>
            <RadarChart />
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedCounter() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          obs.unobserve(el);

          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / COUNTER_DURATION, 1);
            const eased = easeOut(progress);
            setCount(Math.round(eased * TARGET_SCORE));

            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              setDone(true);
            }
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <ScrollReveal>
      <div ref={ref}>
        {/* Animated gradient ring around the score */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00DC82] to-emerald-400 p-[3px] animate-glow-pulse">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <span className="text-[48px] font-bold tracking-tight text-gray-900">
              {count}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-400">out of 100</p>

        <p
          className={`mt-6 text-[15px] italic text-gray-500 transition-opacity duration-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          Competitive for first-round interviews across industries.
        </p>

        <span
          className={`mt-4 inline-block rounded-full bg-green-50 px-3 py-1 font-mono text-[11px] text-[#00DC82] transition-opacity duration-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          +8 this week
        </span>
      </div>
    </ScrollReveal>
  );
}

function RadarChart() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<SVGSVGElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          obs.unobserve(el);

          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const p = Math.min(elapsed / RADAR_DURATION, 1);
            setProgress(easeOut(p));
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dataPoints = dimensions.map((d, i) =>
    polarToCartesian(i, d.value * progress, RADIUS)
  );
  const dataPath = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  const axisVertices = dimensions.map((_, i) => polarToCartesian(i, 100, RADIUS));
  const labelPositions = dimensions.map((_, i) => polarToCartesian(i, 118, RADIUS));

  return (
    <ScrollReveal>
      <div className="flex justify-center">
        <svg ref={ref} viewBox="0 0 300 300" className="w-full max-w-[240px] sm:max-w-[300px]" aria-label="Radar chart showing six score dimensions">
          {/* Reference hexagons */}
          {[0.4, 0.7, 1.0].map((frac) => (
            <polygon
              key={frac}
              points={hexagonPath(frac)}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
          ))}

          {/* Axis lines */}
          {axisVertices.map(([x, y], i) => (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={dataPath}
            fill="rgba(0,220,130,0.08)"
            stroke="#00DC82"
            strokeWidth="2"
          />

          {/* Data point circles */}
          {dataPoints.map(([x, y], i) => (
            <g key={i}>
              {i === 2 && (
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill="none"
                  stroke="#00DC82"
                  strokeWidth="1"
                  opacity="0.5"
                >
                  <animate
                    attributeName="opacity"
                    values="0.5;0.1;0.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values="4;8;4"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle cx={x} cy={y} r={3} fill="#00DC82" />
            </g>
          ))}

          {/* Labels */}
          {dimensions.map((d, i) => {
            const [x, y] = labelPositions[i];
            let anchor: "start" | "middle" | "end" = "middle";
            if (x < CENTER - 20) anchor = "end";
            if (x > CENTER + 20) anchor = "start";
            let dy = 0;
            if (y < CENTER - 40) dy = -4;
            if (y > CENTER + 40) dy = 10;

            return (
              <text
                key={d.label}
                x={x}
                y={y + dy}
                textAnchor={anchor}
                fill="#9CA3AF"
                fontSize="9"
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
    </ScrollReveal>
  );
}
