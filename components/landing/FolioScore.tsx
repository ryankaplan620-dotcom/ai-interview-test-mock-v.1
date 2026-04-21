"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

const TARGET_SCORE = 74;
const COUNTER_DURATION = 1500; // ms
const RADAR_DURATION = 1200; // ms

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

/** Convert a value (0-100) + angle index to SVG coordinates */
function polarToCartesian(index: number, value: number, radius: number): [number, number] {
  const angle = (Math.PI / 2) + index * ((2 * Math.PI) / 6); // start from top
  const r = (value / 100) * radius;
  return [CENTER - r * Math.cos(angle), CENTER - r * Math.sin(angle)];
}

/** Build a hexagon path at a given fraction of the radius */
function hexagonPath(fraction: number): string {
  const points = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = polarToCartesian(i, fraction * 100, RADIUS);
    return `${x},${y}`;
  });
  return points.join(" ");
}

export function FolioScore() {
  return (
    <section className="border-t border-ink-border/40 px-6 py-24 sm:px-12 sm:py-32 lg:px-20" aria-label="The Folio Score">
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-[11px] font-medium tracking-label text-accent">
              THE FOLIO SCORE
            </span>
          </div>

          <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
            One number. The one that matters.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid items-center gap-16 md:grid-cols-2">
          <AnimatedCounter />
          <RadarChart />
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
      <div ref={ref} className="max-w-[1120px]">
        <p className="font-display text-[60px] font-bold tracking-tight text-text-primary sm:text-[80px] md:text-[96px]">
          {count}
        </p>
        <p className="font-sans text-sm text-text-tertiary">out of 100</p>

        <p
          className={`mt-6 font-sans text-[15px] italic text-text-secondary transition-opacity duration-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          Competitive for first-round interviews across industries.
        </p>

        <span
          className={`mt-4 inline-block rounded-full bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent transition-opacity duration-700 ${
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

  // Data polygon points
  const dataPoints = dimensions.map((d, i) =>
    polarToCartesian(i, d.value * progress, RADIUS)
  );
  const dataPath = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  // Axis vertices (full radius)
  const axisVertices = dimensions.map((_, i) => polarToCartesian(i, 100, RADIUS));

  // Label positions (slightly outside)
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
              stroke="#2A3139"
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
              stroke="#2A3139"
              strokeWidth="0.5"
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={dataPath}
            fill="rgba(0,245,144,0.08)"
            stroke="#00F590"
            strokeWidth="2"
          />

          {/* Data point circles */}
          {dataPoints.map(([x, y], i) => (
            <g key={i}>
              {/* Pulse ring on weakest (Confidence, index 2) */}
              {i === 2 && (
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill="none"
                  stroke="#00F590"
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
              <circle cx={x} cy={y} r={3} fill="#00F590" />
            </g>
          ))}

          {/* Labels */}
          {dimensions.map((d, i) => {
            const [x, y] = labelPositions[i];
            // Adjust text anchor based on position
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
                fill="#6E7681"
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
