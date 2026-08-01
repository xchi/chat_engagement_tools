"use client";

import { useEffect, useId, useState } from "react";
import { Flame } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import { formatDuration } from "@/lib/format";
import { useStreamClock } from "@/lib/stream-clock";
import type { SentimentResponse } from "@/types/api";
import type { SentimentPoint } from "@/types/features";

/** How often the trend is re-fetched (a new point lands every 30s). */
const POLL_SECONDS = 15;

const PLOT_HEIGHT = 150;
const AXIS_BAND = 20;
const MARGIN = { top: 10, right: 12, left: 30 };

/** positive / neutral / negative — status-semantic tokens from globals.css */
const CLASS_COLORS = {
  positive: "var(--chart-2)",
  neutral: "var(--chart-3)",
  negative: "var(--chart-5)",
} as const;

function formatScore(score: number): string {
  return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
}

/** −1..1 score → 0..100 "hype" for the gauge readout. */
function hypePercent(score: number): number {
  return Math.round(((Math.max(-1, Math.min(1, score)) + 1) / 2) * 100);
}

/** One label per gauge band, Kick-chat flavored. */
function hypeLabel(score: number): string {
  if (score >= 0.6) return "Max hype";
  if (score >= 0.2) return "Hyped";
  if (score > -0.2) return "Mixed";
  if (score > -0.6) return "Salty";
  return "Tilted";
}

/** Tick step keeping ≤ ~6 x-axis labels over the streamed span. */
function tickStep(spanSeconds: number): number {
  for (const minutes of [5, 10, 15, 30, 60, 120, 240]) {
    if (spanSeconds / (minutes * 60) <= 5) return minutes * 60;
  }
  return 480 * 60;
}

/**
 * Callback-ref measurement: the plot mounts only after the first API
 * response, so a mount-time effect would observe nothing.
 */
function useMeasuredWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return { el, ref: setEl, width };
}

/** Gauge bands, salty red → neutral gray → Kick-green max hype. */
const GAUGE_SEGMENTS: [from: number, to: number, color: string][] = [
  [-1, -0.6, "var(--chart-5)"],
  [-0.6, -0.2, "#f87171"],
  [-0.2, 0.2, "var(--chart-3)"],
  [0.2, 0.6, "#4ade80"],
  [0.6, 1, "var(--primary)"],
];

const GAUGE = { cx: 95, cy: 88, r: 70, band: 14 };

/** Point on the gauge arc at t ∈ 0..1, left → right over the top. */
function gaugePoint(t: number, r = GAUGE.r): [number, number] {
  const angle = Math.PI * (1 - t);
  return [GAUGE.cx + r * Math.cos(angle), GAUGE.cy - r * Math.sin(angle)];
}

/** The hype-o-meter: a semicircular dial whose needle eases to the score. */
function HypeGauge({ score }: { score: number }) {
  const { cx, cy, r, band } = GAUGE;
  const t = (Math.max(-1, Math.min(1, score)) + 1) / 2;
  const gap = 0.005; // ≈2px of arc shaved off each segment end
  return (
    <svg width="190" height="104" viewBox="0 0 190 104" aria-hidden className="shrink-0">
      {GAUGE_SEGMENTS.map(([from, to, color]) => {
        const [x0, y0] = gaugePoint((from + 1) / 2 + gap);
        const [x1, y1] = gaugePoint((to + 1) / 2 - gap);
        return (
          <path
            key={from}
            d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
            fill="none"
            stroke={color}
            strokeWidth={band}
          />
        );
      })}
      <g
        style={{
          transform: `rotate(${(t - 0.5) * 180}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - (r - band / 2 - 4)}
          stroke="var(--foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <circle cx={cx} cy={cy} r="5" fill="var(--foreground)" stroke="var(--card)" strokeWidth="2" />
      <text x={cx - r} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
        SALTY
      </text>
      <text x={cx + r} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
        HYPED
      </text>
    </svg>
  );
}

/**
 * SentimentPanel — FEATURE (T8): live chat-sentiment for the creator
 * dashboard, presented as a hype-o-meter. Polls GET /api/sentiment up to
 * "now" on the stream clock: a gauge needle sweeps to the current mood, and
 * the −1..1 score trend is charted against the zero baseline (green above,
 * red below) with the window's positive/neutral/negative breakdown.
 * Hover/keyboard reveals a crosshair readout of any past window.
 */
export default function SentimentPanel() {
  const clock = useStreamClock();
  const gradientId = useId();
  const { el: plotEl, ref: plotRef, width } = useMeasuredWidth();
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const until = Math.floor(clock / POLL_SECONDS) * POLL_SECONDS;
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sentiment?until=${until}`)
      .then((res) => (res.ok ? (res.json() as Promise<SentimentResponse>) : null))
      .then((body) => {
        // A failed poll keeps the previous render — no flash, no jump.
        if (!cancelled && body) setData(body);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [until]);

  const points = data?.points ?? [];
  const latest = points.at(-1);

  // ---- scales (x: 0 → latest stream-clock second, y: −1..1) -------------
  const span = latest?.time_seconds ?? 1;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const x = (t: number) => MARGIN.left + (t / span) * innerWidth;
  const y = (score: number) =>
    MARGIN.top + ((1 - score) / 2) * (PLOT_HEIGHT - MARGIN.top);
  const zeroY = y(0);

  // Rebuilt each render — the clock re-renders us every second anyway, and
  // even hours of 30s points stay well under a millisecond of string work.
  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(p.time_seconds).toFixed(1)},${y(p.score).toFixed(1)}`,
    )
    .join("");
  const areaPath = latest
    ? `${linePath}L${x(latest.time_seconds).toFixed(1)},${zeroY.toFixed(1)}L${x(points[0].time_seconds).toFixed(1)},${zeroY.toFixed(1)}Z`
    : "";

  const xTicks: number[] = [];
  for (let t = 0; t <= span; t += tickStep(span)) xTicks.push(t);

  // ---- hover / keyboard readout -----------------------------------------
  const nearestIndex = (clientX: number) => {
    const rect = plotEl?.getBoundingClientRect();
    if (!rect || points.length === 0) return null;
    const t = ((clientX - rect.left - MARGIN.left) / innerWidth) * span;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (
        Math.abs(points[i].time_seconds - t) <
        Math.abs(points[best].time_seconds - t)
      )
        best = i;
    }
    return best;
  };
  const activePoint = active === null ? undefined : points[active];

  const step = (delta: number) =>
    setActive((current) =>
      Math.max(
        0,
        Math.min(points.length - 1, (current ?? points.length - 1) + delta),
      ),
    );

  const breakdownTotal = latest
    ? latest.breakdown.positive + latest.breakdown.neutral + latest.breakdown.negative
    : 0;

  return (
    <PanelCard
      icon={Flame}
      title="Hype-O-Meter"
      actions={
        <span className="mr-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          LIVE · {data ? `${data.window_seconds}S WINDOWS` : "…"}
        </span>
      }
    >
      {latest ? (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="flex items-center gap-5">
              <HypeGauge score={latest.score} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Hype now
                </div>
                <div className="text-3xl font-semibold leading-tight">
                  {hypePercent(latest.score)}
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {hypeLabel(latest.score)}
                  <span className="ml-1.5 font-normal normal-case text-muted-foreground">
                    score {formatScore(latest.score)}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-64 max-w-full">
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                {(["positive", "neutral", "negative"] as const).map((cls) => (
                  <span
                    key={cls}
                    style={{
                      background: CLASS_COLORS[cls],
                      width: `${breakdownTotal ? (latest.breakdown[cls] / breakdownTotal) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-muted-foreground">
                {(["positive", "neutral", "negative"] as const).map((cls) => (
                  <span key={cls} className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: CLASS_COLORS[cls] }}
                    />
                    {cls}{" "}
                    <span className="font-semibold text-foreground">
                      {latest.breakdown[cls]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <figure
            ref={plotRef}
            tabIndex={0}
            role="img"
            aria-label={`Chat hype trend. Currently ${hypePercent(latest.score)}% hype (${hypeLabel(latest.score)}, score ${formatScore(latest.score)}). Use arrow keys to inspect past windows.`}
            className="relative m-0 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onPointerMove={(e) => setActive(nearestIndex(e.clientX))}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(points.length - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") step(-1);
              else if (e.key === "ArrowRight") step(1);
              else if (e.key === "Home") setActive(0);
              else if (e.key === "End") setActive(points.length - 1);
              else if (e.key === "Escape") setActive(null);
              else return;
              e.preventDefault();
            }}
          >
            {width > 0 && points.length > 1 && (
              <svg
                width={width}
                height={PLOT_HEIGHT + AXIS_BAND}
                className="block"
                aria-hidden
              >
                <defs>
                  {/* stroke flips green→red exactly at the zero baseline */}
                  <linearGradient
                    id={gradientId}
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1={y(1)}
                    x2="0"
                    y2={y(-1)}
                  >
                    <stop offset={(zeroY - y(1)) / (y(-1) - y(1))} stopColor={CLASS_COLORS.positive} />
                    <stop offset={(zeroY - y(1)) / (y(-1) - y(1))} stopColor={CLASS_COLORS.negative} />
                  </linearGradient>
                  <clipPath id={`${gradientId}-above`}>
                    <rect x="0" y="0" width={width} height={zeroY} />
                  </clipPath>
                  <clipPath id={`${gradientId}-below`}>
                    <rect x="0" y={zeroY} width={width} height={PLOT_HEIGHT + AXIS_BAND - zeroY} />
                  </clipPath>
                </defs>

                {/* recessive grid: hairlines at +1 / 0 / −1 */}
                {([1, 0, -1] as const).map((v) => (
                  <g key={v}>
                    <line
                      x1={MARGIN.left}
                      x2={width - MARGIN.right}
                      y1={y(v)}
                      y2={y(v)}
                      stroke={v === 0 ? "var(--muted-foreground)" : "var(--border)"}
                      strokeOpacity={v === 0 ? 0.5 : 1}
                      strokeWidth="1"
                    />
                    <text
                      x={MARGIN.left - 6}
                      y={y(v) + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px] [font-variant-numeric:tabular-nums]"
                    >
                      {v > 0 ? `+${v}` : v}
                    </text>
                  </g>
                ))}

                {xTicks.map((t) => (
                  <text
                    key={t}
                    x={x(t)}
                    y={PLOT_HEIGHT + AXIS_BAND - 5}
                    // keep the first/last labels inside the plot edges
                    textAnchor={
                      t === 0 ? "start" : x(t) > width - 40 ? "end" : "middle"
                    }
                    className="fill-muted-foreground text-[10px] [font-variant-numeric:tabular-nums]"
                  >
                    {formatDuration(t)}
                  </text>
                ))}

                {/* ~10% washes between the line and the baseline, per side */}
                <path
                  d={areaPath}
                  fill={CLASS_COLORS.positive}
                  fillOpacity="0.1"
                  clipPath={`url(#${gradientId}-above)`}
                />
                <path
                  d={areaPath}
                  fill={CLASS_COLORS.negative}
                  fillOpacity="0.1"
                  clipPath={`url(#${gradientId}-below)`}
                />

                <path
                  d={linePath}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* live edge marker, 2px surface ring */}
                <circle
                  cx={x(latest.time_seconds)}
                  cy={y(latest.score)}
                  r="4"
                  fill={latest.score >= 0 ? CLASS_COLORS.positive : CLASS_COLORS.negative}
                  stroke="var(--card)"
                  strokeWidth="2"
                />

                {activePoint && (
                  <g>
                    <line
                      x1={x(activePoint.time_seconds)}
                      x2={x(activePoint.time_seconds)}
                      y1={MARGIN.top}
                      y2={PLOT_HEIGHT}
                      stroke="var(--muted-foreground)"
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    />
                    <circle
                      cx={x(activePoint.time_seconds)}
                      cy={y(activePoint.score)}
                      r="4"
                      fill={
                        activePoint.score >= 0
                          ? CLASS_COLORS.positive
                          : CLASS_COLORS.negative
                      }
                      stroke="var(--card)"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>
            )}

            {activePoint && width > 0 && (
              <div
                className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
                style={{
                  left: Math.max(
                    56,
                    Math.min(width - 56, x(activePoint.time_seconds)),
                  ),
                }}
              >
                <div className="font-bold">
                  {hypePercent(activePoint.score)}%{" "}
                  <span className="font-normal text-muted-foreground">
                    {hypeLabel(activePoint.score)} · score{" "}
                    {formatScore(activePoint.score)}
                  </span>
                </div>
                {(["positive", "neutral", "negative"] as const).map((cls) => (
                  <div key={cls} className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="h-0.5 w-2.5 rounded"
                      style={{ background: CLASS_COLORS[cls] }}
                    />
                    <span className="font-semibold">
                      {activePoint.breakdown[cls]}
                    </span>
                    <span className="text-muted-foreground">{cls}</span>
                  </div>
                ))}
                <div className="mt-0.5 text-muted-foreground">
                  at {formatDuration(activePoint.time_seconds)}
                </div>
              </div>
            )}
          </figure>

          <SentimentTable points={points} />
        </div>
      ) : (
        <div className="grid h-[240px] place-items-center p-4 text-sm text-muted-foreground">
          Calibrating the hype-o-meter…
        </div>
      )}
    </PanelCard>
  );
}

/** Screen-reader twin of the chart: the most recent windows as a table. */
function SentimentTable({ points }: { points: SentimentPoint[] }) {
  return (
    <table className="sr-only">
      <caption>Chat sentiment, most recent windows</caption>
      <thead>
        <tr>
          <th>Stream time</th>
          <th>Score (−1 to 1)</th>
          <th>Positive</th>
          <th>Neutral</th>
          <th>Negative</th>
        </tr>
      </thead>
      <tbody>
        {points.slice(-20).map((p) => (
          <tr key={p.time_seconds}>
            <td>{formatDuration(p.time_seconds)}</td>
            <td>{formatScore(p.score)}</td>
            <td>{p.breakdown.positive}</td>
            <td>{p.breakdown.neutral}</td>
            <td>{p.breakdown.negative}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
