"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Activity } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import {
  activityLevel,
  chatInsight,
  summarize,
  toPulseEvents,
  trendingEmotes,
  type ActivityLevel,
  type PulseEvent,
} from "@/lib/chat-pulse";
import { formatCount } from "@/lib/format";
import { useStreamClock } from "@/lib/stream-clock";
import { cn } from "@/lib/utils";
import type { ChatResponse } from "@/types/api";

/** Rolling window the pulse summarizes — the extension's default. */
const WINDOW_SECONDS = 30;
/** How often the window is re-fetched from /api/chat. */
const POLL_SECONDS = 5;

const MOOD_LABELS: [minSentiment: number, label: string][] = [
  [72, "Hyped mood"],
  [58, "Upbeat mood"],
  [43, "Neutral mood"],
  [29, "Tense mood"],
  [0, "Frustrated mood"],
];

const LEVEL_STYLES: Record<ActivityLevel, { label: string; bar: string }> = {
  calm: { label: "Calm", bar: "bg-chart-2" },
  warm: { label: "Warm", bar: "bg-chart-4" },
  hot: { label: "Hot", bar: "bg-chart-5" },
};

/**
 * Stream Pulse — the "Kick Stream Pulse" chrome-extension overlay reborn as
 * a dashboard card (logic in src/lib/chat-pulse.ts). Summarizes the last 30s
 * of chat from GET /api/chat on the stream clock: sentiment meter, unique
 * chatters, messages/min, calm/warm/hot activity, an AI-style chat read and
 * the trending emotes.
 */
export default function StreamPulsePanel() {
  const clock = useStreamClock();
  const [events, setEvents] = useState<PulseEvent[] | null>(null);

  // Poll a stable window edge (multiples of POLL_SECONDS) so each tick
  // fetches once; a failed poll just keeps showing the previous window.
  const windowEnd = Math.max(
    WINDOW_SECONDS,
    Math.floor(clock / POLL_SECONDS) * POLL_SECONDS,
  );
  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/chat?from=${windowEnd - WINDOW_SECONDS}&to=${windowEnd}&limit=1000`,
    )
      .then((res) => (res.ok ? (res.json() as Promise<ChatResponse>) : null))
      .then((body) => {
        if (cancelled || !body) return;
        // KickBot's seeded "gifted KICKs" lines aren't audience signal.
        setEvents(
          toPulseEvents(body.messages.filter((m) => m.username !== "KickBot")),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [windowEnd]);

  const { summary, level, insight, trending } = useMemo(() => {
    const summary = summarize(events ?? [], WINDOW_SECONDS);
    return {
      summary,
      level: activityLevel(summary.uniqueChatters),
      insight: chatInsight(events ?? [], summary),
      trending: trendingEmotes(events ?? []),
    };
  }, [events]);

  const mood = MOOD_LABELS.find(([min]) => summary.sentiment >= min)?.[1];
  const positive = summary.sentiment >= 50;

  return (
    <PanelCard
      icon={Activity}
      title="Stream Pulse"
      actions={
        <span className="mr-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          LIVE · {WINDOW_SECONDS}S
        </span>
      }
    >
      <div className="space-y-4 p-4">
        {/* Sentiment meter: fill grows from the neutral center toward the mood */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chat sentiment
            </span>
            <span className="text-sm font-bold">
              {summary.sentiment}
              <span className="font-normal text-muted-foreground">/100</span>
            </span>
          </div>
          <div className="relative mt-2 h-1.5 rounded-full bg-muted">
            <div
              className={cn(
                "absolute inset-y-0 rounded-full",
                positive ? "bg-chart-2" : "bg-chart-5",
              )}
              style={{
                left: `${Math.min(50, summary.sentiment)}%`,
                width: `${Math.abs(summary.sentiment - 50)}%`,
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
            <div
              className={cn(
                "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                positive ? "bg-chart-2" : "bg-chart-5",
              )}
              style={{ left: `${summary.sentiment}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>NEGATIVE</span>
            <span className="font-semibold text-foreground">{mood}</span>
            <span>POSITIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Unique chatters", summary.uniqueChatters],
              ["Messages / min", summary.messagesPerMinute],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-md bg-secondary/50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="text-lg font-semibold">{formatCount(value)}</div>
            </div>
          ))}
        </div>

        {/* Activity temperature, exactly the extension's calm/warm/hot bars */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chat activity
            </span>
            <span className="text-sm font-bold">{LEVEL_STYLES[level].label}</span>
          </div>
          <div className="mt-2 flex gap-1">
            {(["calm", "warm", "hot"] as const).map((step, i) => (
              <span
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= ["calm", "warm", "hot"].indexOf(level)
                    ? LEVEL_STYLES[level].bar
                    : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide">
            <span className="text-primary">✦ Chat read</span>
            <span className="text-muted-foreground">Local · AI-style</span>
          </div>
          <p className="mt-1.5 text-sm leading-snug">{insight}</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Trending emotes</span>
            <span>Last {WINDOW_SECONDS}s</span>
          </div>
          {trending.length > 0 ? (
            <ol className="mt-2 space-y-1.5">
              {trending.map((emote, i) => (
                <li key={emote.id} className="flex items-center gap-2">
                  <span className="w-3 text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <Image
                    src={emote.url}
                    alt={emote.name}
                    width={24}
                    height={24}
                    unoptimized
                    className="size-6 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {emote.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ×{emote.count}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {events === null ? "Reading live chat…" : "No emotes in the last 30s."}
            </p>
          )}
        </div>
      </div>
    </PanelCard>
  );
}
