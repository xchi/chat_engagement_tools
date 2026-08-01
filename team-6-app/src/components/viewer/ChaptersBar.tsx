"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChaptersResponse } from "@/types/api";
import type { Chapter } from "@/types/features";

/**
 * ChaptersBar — FEATURE (T7): live chapters, presented as if an AI service
 * is reading the stream's closed captions and starting a new chapter on each
 * topic change (Kick has no captions — demo conceit, modeled on Loom's AI
 * chapters). GET /api/chapters?until= reveals the pre-authored chapters as
 * the stream clock passes their start_seconds; before each new one pops in,
 * the UI plays a "Processing captions… → Generating chapter…" beat.
 *
 * Three pieces, all mounted by PlayerControls so they share one fetch:
 *  - useChapters(liveEdge): polling + the reveal state machine
 *  - <ChaptersBar>: start-of-chapter ticks on the seek bar + hover title
 *  - <ChapterStatus>: current chapter readout / AI beat in the controls row
 */

/** How often to ask the mock API for newly "detected" chapters. */
const POLL_SECONDS = 10;
/** Durations of the fake AI beat shown before a new chapter pops in. */
const PROCESSING_MS = 2800;
const GENERATING_MS = 2800;
/** How long a freshly revealed chapter keeps its green "new" emphasis. */
const REVEAL_GLOW_MS = 6000;

type Phase = "idle" | "processing" | "generating";

export interface ChaptersState {
  /** chapters revealed to the UI (the "AI" finished generating them) */
  chapters: Chapter[];
  /** the caption-processing beat currently playing, if any */
  phase: Phase;
  /** id of the chapter that just popped in, while its glow lasts */
  justRevealedId: string | null;
}

export function useChapters(liveEdge: number): ChaptersState {
  const [fetched, setFetched] = useState<Chapter[] | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [justRevealedId, setJustRevealedId] = useState<string | null>(null);
  const tunedInRef = useRef(false);

  // Poll for chapters the "AI" has detected by now; until= moves in
  // POLL_SECONDS steps so the request is stable within a tick.
  const pollTick = Math.floor(liveEdge / POLL_SECONDS);
  useEffect(() => {
    if (pollTick <= 0) return;
    let cancelled = false;
    void fetch(`/api/chapters?until=${pollTick * POLL_SECONDS}`)
      .then((res) => (res.ok ? (res.json() as Promise<ChaptersResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        // Keep the previous array identity unless chapters were added, so
        // the reveal effect below doesn't restart its timers every poll.
        setFetched((prev) =>
          !prev || data.chapters.length > prev.length ? data.chapters : prev,
        );
        if (!tunedInRef.current) {
          tunedInRef.current = true;
          // Tuning in mid-stream: the backlog is history, not news — show it
          // without replaying the generating beat chapter by chapter.
          setShownCount(data.chapters.length);
        }
      })
      .catch(() => {}); // keep the current chapters on transient errors
    return () => {
      cancelled = true;
    };
  }, [pollTick]);

  // A chapter arrived after tune-in: play the AI beat, then reveal it.
  useEffect(() => {
    if (!fetched || shownCount >= fetched.length) return;
    const next = fetched[shownCount];
    const processing = setTimeout(() => setPhase("processing"), 0);
    const generating = setTimeout(() => setPhase("generating"), PROCESSING_MS);
    const reveal = setTimeout(() => {
      setShownCount((count) => count + 1);
      setJustRevealedId(next.id);
      setPhase("idle");
    }, PROCESSING_MS + GENERATING_MS);
    return () => {
      clearTimeout(processing);
      clearTimeout(generating);
      clearTimeout(reveal);
    };
  }, [fetched, shownCount]);

  useEffect(() => {
    if (!justRevealedId) return;
    const clear = setTimeout(() => setJustRevealedId(null), REVEAL_GLOW_MS);
    return () => clearTimeout(clear);
  }, [justRevealedId]);

  return { chapters: fetched?.slice(0, shownCount) ?? [], phase, justRevealedId };
}

/** The chapter the playhead is inside (chapters are sorted by start). */
function chapterAt(chapters: Chapter[], seconds: number): Chapter | null {
  let current: Chapter | null = null;
  for (const chapter of chapters) {
    if (chapter.start_seconds > seconds) break;
    current = chapter;
  }
  return current;
}

interface ChaptersBarProps {
  state: ChaptersState;
  /** seconds already "streamed" — the seek bar's [0, liveEdge] domain */
  liveEdge: number;
  /** playhead, seconds into the stream */
  currentTime: number;
  /** seek-bar hover position in seconds (null when not hovering) */
  hoverSeconds: number | null;
  onSeek: (seconds: number) => void;
}

/**
 * Chapter-start ticks on the seek bar (green = the chapter being watched,
 * pop-in animation for a just-generated one) plus the hovered chapter's
 * title above the bar's timestamp tooltip. Clicking a tick seeks to the
 * chapter start.
 */
export default function ChaptersBar({
  state,
  liveEdge,
  currentTime,
  hoverSeconds,
  onSeek,
}: ChaptersBarProps) {
  const { chapters, justRevealedId } = state;
  if (chapters.length === 0 || liveEdge <= 0) return null;

  const current = chapterAt(chapters, currentTime);
  const hovered = hoverSeconds === null ? null : chapterAt(chapters, hoverSeconds);

  return (
    <>
      {chapters.map((chapter) => (
        <button
          key={chapter.id}
          aria-label={`Jump to chapter: ${chapter.title}`}
          className={cn(
            "absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.55)] transition-transform hover:scale-y-125",
            chapter.id === current?.id ? "bg-primary" : "bg-white/85",
            chapter.id === justRevealedId &&
              "animate-in zoom-in duration-700 bg-primary",
          )}
          style={{ left: `${(chapter.start_seconds / liveEdge) * 100}%` }}
          // keep the bar's scrub-capture from also seeking to the raw pointer x
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSeek(chapter.start_seconds)}
        />
      ))}

      {hovered && (
        <span
          className="pointer-events-none absolute bottom-11 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-1.5 py-0.5 text-[11px] font-semibold text-white"
          style={{
            left: `${Math.min(Math.max((hoverSeconds! / liveEdge) * 100, 8), 92)}%`,
          }}
        >
          {hovered.title}
        </span>
      )}
    </>
  );
}

interface ChapterStatusProps {
  state: ChaptersState;
  /** playhead, seconds into the stream */
  currentTime: number;
  onSeek: (seconds: number) => void;
}

/**
 * The controls-row readout: the chapter being watched (click = back to its
 * start), replaced by the animated "Processing captions… → Generating
 * chapter…" beat and the "New chapter" announcement while the AI "works".
 */
export function ChapterStatus({ state, currentTime, onSeek }: ChapterStatusProps) {
  const { chapters, phase, justRevealedId } = state;
  const revealed = justRevealedId
    ? (chapters.find((chapter) => chapter.id === justRevealedId) ?? null)
    : null;
  const current = chapterAt(chapters, currentTime);
  if (phase === "idle" && !revealed && !current) return null;

  return (
    <span
      className="ml-3 flex min-w-0 max-w-72 items-center gap-1.5 text-xs"
      aria-live="polite"
    >
      <Sparkles
        className={cn(
          "size-3.5 shrink-0",
          phase === "idle" ? "text-primary/80" : "animate-pulse text-primary",
        )}
      />
      {phase !== "idle" ? (
        <span className="animate-pulse truncate font-medium italic text-white/60">
          {phase === "processing" ? "Processing captions…" : "Generating chapter…"}
        </span>
      ) : revealed ? (
        <button
          onClick={() => onSeek(revealed.start_seconds)}
          title="Jump to chapter start"
          className="animate-in fade-in zoom-in-95 duration-500 truncate font-semibold text-primary"
        >
          New chapter: {revealed.title}
        </button>
      ) : (
        <button
          onClick={() => onSeek(current!.start_seconds)}
          title="Jump to chapter start"
          className="truncate font-medium text-white/80 transition-colors hover:text-primary"
        >
          {current!.title}
        </button>
      )}
    </span>
  );
}
