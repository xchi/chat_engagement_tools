"use client";

import { useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ChaptersBar, {
  ChapterStatus,
  useChapters,
} from "@/components/viewer/ChaptersBar";
import MomentsGraph from "@/components/viewer/MomentsGraph";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  playing: boolean;
  muted: boolean;
  /** 0..1 */
  volume: number;
  /** playhead, seconds into the stream */
  currentTime: number;
  /** seconds already "streamed" — the scrubbable range is [0, liveEdge] */
  liveEdge: number;
  atLiveEdge: boolean;
  fullscreen: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (seconds: number) => void;
  onGoLive: () => void;
  onToggleFullscreen: () => void;
}

/**
 * PlayerControls — CUSTOM player controls (native <video controls> can't
 * host overlays): play/pause, volume, current / streamed time, and a
 * scrubbable seek bar limited to the already-"streamed" portion. The
 * MomentsGraph (T6) and ChaptersBar ticks (T7) render on top of this seek
 * bar, synchronized with it; the T7 chapter readout sits in the button row.
 */
export default function PlayerControls({
  playing,
  muted,
  volume,
  currentTime,
  liveEdge,
  atLiveEdge,
  fullscreen,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
  onGoLive,
  onToggleFullscreen,
}: PlayerControlsProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const [hoverSeconds, setHoverSeconds] = useState<number | null>(null);
  const chaptersState = useChapters(liveEdge);

  const playedPct = liveEdge > 0 ? Math.min(100, (currentTime / liveEdge) * 100) : 100;

  const secondsAtPointer = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return ratio * liveEdge;
  };

  return (
    <div className="px-3 pb-1.5">
      {/* Seek bar — the streamed portion [0, liveEdge]; T6 draws on top of it. */}
      <div
        ref={barRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(liveEdge)}
        aria-valuenow={Math.round(currentTime)}
        className="group/seek relative flex h-4 cursor-pointer items-center"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrubbingRef.current = true;
          onSeek(secondsAtPointer(e.clientX));
        }}
        onPointerMove={(e) => {
          setHoverSeconds(secondsAtPointer(e.clientX));
          if (scrubbingRef.current) onSeek(secondsAtPointer(e.clientX));
        }}
        onPointerUp={(e) => {
          scrubbingRef.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerLeave={() => setHoverSeconds(null)}
      >
        <MomentsGraph
          liveEdge={liveEdge}
          hoverSeconds={hoverSeconds}
          onSeek={onSeek}
        />
        <div className="relative h-1 w-full rounded-full bg-white/25 transition-[height] group-hover/seek:h-1.5">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${playedPct}%` }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover/seek:opacity-100"
            style={{ left: `${playedPct}%` }}
          />
        </div>
        <ChaptersBar
          state={chaptersState}
          liveEdge={liveEdge}
          currentTime={currentTime}
          hoverSeconds={hoverSeconds}
          onSeek={onSeek}
        />
        {hoverSeconds !== null && liveEdge > 0 && (
          <span
            className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white"
            style={{ left: `${(hoverSeconds / liveEdge) * 100}%` }}
          >
            {formatDuration(hoverSeconds)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={playing ? "Pause" : "Play"}
          onClick={onTogglePlay}
          className="text-white hover:bg-white/15 hover:text-white"
        >
          {playing ? (
            <Pause className="fill-current" />
          ) : (
            <Play className="fill-current" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
          className="text-white hover:bg-white/15 hover:text-white"
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer accent-primary"
        />

        <button
          onClick={onGoLive}
          className={cn(
            "ml-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-black uppercase tracking-wide",
            atLiveEdge
              ? "cursor-default text-white"
              : "text-white/70 transition hover:bg-white/15 hover:text-white",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              atLiveEdge ? "bg-primary" : "bg-white/40",
            )}
          />
          {atLiveEdge ? "Live" : "Go to live"}
        </button>

        <span className="ml-2 font-mono text-xs font-medium text-white/90">
          {formatDuration(currentTime)}
          <span className="text-white/50"> / {formatDuration(liveEdge)}</span>
        </span>

        <ChapterStatus
          state={chaptersState}
          currentTime={currentTime}
          onSeek={onSeek}
        />

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={onToggleFullscreen}
          className="text-white hover:bg-white/15 hover:text-white"
        >
          {fullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </div>
    </div>
  );
}
