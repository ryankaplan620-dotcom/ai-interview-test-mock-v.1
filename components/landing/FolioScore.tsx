"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede } from "@/components/marketing/ui";

const TARGET_SCORE = 74;
const COUNTER_DURATION = 1500;
const RADAR_DURATION = 1200;

const dimensions = [
  { label: "Structure", value: 82 },
  { label: "Specificity", value: 75 },
  { label: "Delivery", value: 71 },
];

const RADIUS = 120;
const CENTER = 150;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const N_DIM = 3;

function polarToCartesian(index: number, value: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / N_DIM);
  const r = (value / 100) * radius;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function polygonPath(fraction: number): string {
  return Array.from({ length: N_DIM }, (_, i) => {
    const [x, y] = polarToCartesian(i, fraction * 100, RADIUS);
    return `${x},${y}`;
  }).join(" ");
}

export function FolioScore() {
  return (
    <Section tone="white">
      <ScrollReveal>
        <div className="text-center">
          <Eyebrow>The Folio Score</Eyebrow>
          <SectionHeading className="mt-4">One number. The one that matters.</SectionHeading>
          <Lede className="mx-auto mt-5 max-w-[560px]">
            Every session resolves to a single score across three dimensions interviewers
            actually weigh — so you always know exactly where you stand.
          </Lede>
        </div>
      </ScrollReveal>

      <div className="mt-16 grid items-center gap-12 md:grid-cols-2 lg:gap-20">
        <AnimatedCounter />
        <ScrollReveal>
          <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-gray-200/70 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Dimension breakdown
              </p>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">
                3 dimensions
              </span>
            </div>
            <RadarChart />
          </div>
        </ScrollReveal>
      </div>
    </Section>
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
            const progress = Math.min((now - start) / COUNTER_DURATION, 1);
            setCount(Math.round(easeOut(progress) * TARGET_SCORE));
            if (progress < 1) requestAnimationFrame(tick);
            else setDone(true);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <ScrollReveal>
      <div ref={ref}>
        <div className="h-36 w-36 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-[3px] shadow-brand-glow">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
            <span className="font-display text-[52px] font-semibold leading-none tracking-tight text-gray-900">
              {count}
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
              out of 100
            </span>
          </div>
        </div>

        <p
          className={`mt-7 max-w-[360px] text-[16px] leading-relaxed text-gray-600 transition-opacity duration-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          Competitive for first-round interviews across industries — and climbing.
        </p>

        <span
          className={`mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-mono text-[11px] font-semibold text-brand-700 transition-opacity duration-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
            const p = Math.min((now - start) / RADAR_DURATION, 1);
            setProgress(easeOut(p));
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dataPoints = dimensions.map((d, i) => polarToCartesian(i, d.value * progress, RADIUS));
  const dataPath = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");
  const axisVertices = dimensions.map((_, i) => polarToCartesian(i, 100, RADIUS));
  const labelPositions = dimensions.map((_, i) => polarToCartesian(i, 125, RADIUS));

  return (
    <div className="mt-2 flex justify-center">
      <svg ref={ref} viewBox="0 0 300 300" className="w-full max-w-[300px]" aria-label="Radar chart of three score dimensions">
        {[0.4, 0.7, 1.0].map((frac) => (
          <polygon key={frac} points={polygonPath(frac)} fill="none" stroke="#E5E7EB" strokeWidth="0.75" />
        ))}
        {axisVertices.map(([x, y], i) => (
          <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="0.75" />
        ))}
        <polygon points={dataPath} fill="rgba(0,220,130,0.10)" stroke="#00DC82" strokeWidth="2" strokeLinejoin="round" />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#00DC82" />
        ))}
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
              fontSize="9.5"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
