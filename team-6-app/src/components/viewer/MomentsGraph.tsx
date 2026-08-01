"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { emoteUrl } from "@/lib/chat-pulse";
import { HIGHLIGHT_BUCKET_SECONDS } from "@/lib/mocks/highlights";
import type { HighlightsResponse } from "@/types/api";
import type { Moment } from "@/types/features";

interface MomentsGraphProps {
  /** seconds already "streamed" — the seek bar's [0, liveEdge] domain */
  liveEdge: number;
  /** seek-bar hover position in seconds (null when not hovering) */
  hoverSeconds: number | null;
  onSeek: (seconds: number) => void;
}

/** SVG user units; preserveAspectRatio="none" stretches them to the bar. */
const VIEW_W = 1000;
const VIEW_H = 100;

/**
 * Chat stays busy the whole stream (median intensity ~0.5), so the raw curve
 * reads flat — cut the baseline floor and raise the rest to a power so the
 * moment peaks tower over ambient chatter.
 */
const INTENSITY_FLOOR = 0.15;
const INTENSITY_GAMMA = 1.8;
const emphasize = (intensity: number) =>
  Math.pow(Math.max(intensity - INTENSITY_FLOOR, 0) / (1 - INTENSITY_FLOOR), INTENSITY_GAMMA);

/** Curve y for an intensity, with headroom so peaks aren't clipped. */
const yFor = (intensity: number) => 4 + (1 - emphasize(intensity)) * 92;

const round = (n: number) => Math.round(n * 10) / 10;

const momentCenter = (m: Moment) => (m.start_seconds + m.end_seconds) / 2;

/** Catmull-Rom → cubic Bézier, so the curve rolls smoothly through the buckets. */
function smoothPath(points: Array<[number, number]>): string {
  let d = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i + 1 < points.length; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1y = Math.min(Math.max(p1[1] + (p2[1] - p0[1]) / 6, 0), VIEW_H);
    const c2y = Math.min(Math.max(p2[1] - (p3[1] - p1[1]) / 6, 0), VIEW_H);
    d +=
      ` C ${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(c1y)},` +
      ` ${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(c2y)},` +
      ` ${round(p2[0])} ${round(p2[1])}`;
  }
  return d;
}

/**
 * MomentsGraph — FEATURE (T6): YouTube "most replayed"-style engagement
 * curve from GET /api/highlights, rendered on top of PlayerControls' seek
 * bar and sharing its [0, liveEdge] x-axis. Revealed on hover/scrub via the
 * bar's `group/seek`; once revealed it becomes part of the bar's hit area,
 * so clicking a peak seeks there (the bar's own pointer handlers). Green
 * dots mark the detected moments — hovering their time range shows the
 * title, clicking one snaps to the moment's start. A new bucket appears
 * every HIGHLIGHT_BUCKET_SECONDS as the stream clock advances.
 */
export default function MomentsGraph({
  liveEdge,
  hoverSeconds,
  onSeek,
}: MomentsGraphProps) {
  const [highlights, setHighlights] = useState<HighlightsResponse | null>(null);

  // Refetch whenever the clock finishes another bucket — that's the only
  // time the response can grow, so polling faster would be wasted requests.
  const revealedBuckets = Math.floor(liveEdge / HIGHLIGHT_BUCKET_SECONDS);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/highlights?until=${revealedBuckets * HIGHLIGHT_BUCKET_SECONDS}`)
      .then((res) => (res.ok ? (res.json() as Promise<HighlightsResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setHighlights(data);
      })
      .catch(() => {}); // keep the last curve on transient errors
    return () => {
      cancelled = true;
    };
  }, [revealedBuckets]);

  const paths = useMemo(() => {
    if (!highlights || highlights.buckets.length === 0 || liveEdge <= 0) {
      return null;
    }
    const x = (seconds: number) => (seconds / liveEdge) * VIEW_W;
    const buckets = highlights.buckets;
    const last = buckets[buckets.length - 1];
    const points: Array<[number, number]> = [
      [0, yFor(buckets[0].intensity)],
      ...buckets.map(
        (b): [number, number] => [
          x((b.start_seconds + b.end_seconds) / 2),
          yFor(b.intensity),
        ],
      ),
      [x(last.end_seconds), yFor(last.intensity)],
    ];
    const line = smoothPath(points);
    return {
      line,
      area: `${line} L ${round(x(last.end_seconds))} ${VIEW_H} L 0 ${VIEW_H} Z`,
    };
  }, [highlights, liveEdge]);

  if (!paths || !highlights || liveEdge <= 0) return null;

  const activeMoment =
    hoverSeconds === null
      ? undefined
      : highlights.moments.find(
          (m) => hoverSeconds >= m.start_seconds && hoverSeconds < m.end_seconds,
        );

  const toX = (seconds: number) => (seconds / liveEdge) * VIEW_W;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1 h-12 opacity-0 transition-opacity group-hover/seek:pointer-events-auto group-hover/seek:opacity-100">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {highlights.moments.map((m) => (
            <clipPath key={m.id} id={`moment-clip-${m.id}`}>
              <rect
                x={toX(m.start_seconds)}
                y={0}
                width={toX(m.end_seconds) - toX(m.start_seconds)}
                height={VIEW_H}
              />
            </clipPath>
          ))}
        </defs>
        <path d={paths.area} className="fill-white/15" />
        <path
          d={paths.line}
          className="fill-none stroke-white/50"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* moment spans re-drawn in Kick green so highlights stand out */}
        {highlights.moments.map((m) => (
          <g key={m.id} clipPath={`url(#moment-clip-${m.id})`}>
            <path
              d={paths.area}
              className={
                m.id === activeMoment?.id ? "fill-primary/60" : "fill-primary/30"
              }
            />
            <path
              d={paths.line}
              className="fill-none stroke-primary"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {highlights.moments.map((m) => (
        <button
          key={m.id}
          aria-label={`Seek to moment: ${m.title}`}
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black/70 bg-primary transition-transform hover:scale-125"
          style={{
            left: `${(momentCenter(m) / liveEdge) * 100}%`,
            top: `${yFor(m.peak_intensity)}%`,
          }}
          // keep the bar's scrub-capture from also seeking to the raw pointer x
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSeek(m.start_seconds)}
        />
      ))}

      {activeMoment && (
        <div
          className="pointer-events-none absolute bottom-full mb-1.5 flex -translate-x-1/2 items-center whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[11px] font-semibold text-white"
          style={{
            left: `${Math.min(Math.max((momentCenter(activeMoment) / liveEdge) * 100, 8), 92)}%`,
          }}
        >
          {activeMoment.emote ? (
            <Image
              src={emoteUrl(activeMoment.emote.id)}
              alt={activeMoment.emote.name}
              title={activeMoment.emote.name}
              width={20}
              height={20}
              unoptimized
              className="size-5 object-contain"
            />
          ) : (
            activeMoment.title
          )}
          <span className="ml-1.5 font-normal text-white/60">
            {activeMoment.unique_chatters} chatters
          </span>
        </div>
      )}
    </div>
  );
}
