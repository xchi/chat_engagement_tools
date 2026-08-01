"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Play } from "lucide-react";

import PlayerControls from "@/components/viewer/PlayerControls";
import { formatCount, formatDuration } from "@/lib/format";
import { mockChannel } from "@/lib/mocks/channel";
import {
  STREAM_VIDEO_SRC,
  useStreamClock,
  useViewerCount,
} from "@/lib/stream-clock";
import { cn } from "@/lib/utils";

/** Playhead within this many seconds of the live edge counts as "live". */
const LIVE_EDGE_TOLERANCE_SECONDS = 6;

/**
 * VideoPlayer — the mocked "live" video: a local VOD played in lockstep with
 * the stream clock. Joining the page tunes in at the live edge; scrubbing
 * back moves within the already-"streamed" portion and GO TO LIVE returns to
 * the edge. MomentsGraph (T6) and ChaptersBar (T7) overlay the controls'
 * seek bar.
 */
export default function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clock = useStreamClock();
  // Mirror the clock into a ref so mount-time / event handlers read the
  // latest value without re-subscribing every tick.
  const clockRef = useRef(clock);
  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  const viewers = useViewerCount(mockChannel.stream.viewer_count);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.75);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Where the "broadcast" is right now. The VOD loops if the clock ever
  // outruns it (it's 6h21m long, so effectively never during a demo).
  const liveEdge = duration > 0 ? clock % duration : clock;
  const atLiveEdge =
    playing && liveEdge - currentTime <= LIVE_EDGE_TOLERANCE_SECONDS;

  // Joining the page = tuning into an ongoing stream: jump to the live edge
  // as soon as the video knows its duration, then start playing (muted, so
  // autoplay policies allow it).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tuneIn = () => {
      setDuration(video.duration);
      video.currentTime = clockRef.current % video.duration;
      void video.play().catch(() => {});
    };
    if (video.readyState >= 1) tuneIn();
    else video.addEventListener("loadedmetadata", tuneIn, { once: true });
    return () => video.removeEventListener("loadedmetadata", tuneIn);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(Math.max(seconds, 0), liveEdge);
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const goLive = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = clockRef.current % duration;
    void video.play();
  };

  const changeVolume = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video max-h-[70vh] w-full bg-black"
    >
      <video
        ref={videoRef}
        src={STREAM_VIDEO_SRC}
        className="h-full w-full object-contain"
        loop
        muted={muted}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (!video) return;
          setMuted(video.muted);
          setVolume(video.volume);
        }}
      />

      <div className="pointer-events-none absolute left-3 top-3">
        <span className="rounded bg-primary px-2 py-0.5 text-xs font-black uppercase tracking-wide text-primary-foreground">
          Live
        </span>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 text-xs font-bold text-white">
        <span className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
          <Eye className="size-3.5 text-primary" />
          {formatCount(viewers)}
        </span>
        <span className="rounded bg-black/60 px-2 py-1 font-mono">
          {formatDuration(clock)}
        </span>
      </div>

      {duration > 0 && !playing && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black/85"
        >
          <Play className="size-8 fill-current" />
        </button>
      )}

      {duration > 0 && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-10 transition-opacity",
            playing && atLiveEdge
              ? "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
              : "opacity-100",
          )}
        >
          <PlayerControls
            playing={playing}
            muted={muted}
            volume={volume}
            currentTime={currentTime}
            liveEdge={liveEdge}
            atLiveEdge={atLiveEdge}
            fullscreen={fullscreen}
            onTogglePlay={togglePlay}
            onToggleMute={toggleMute}
            onVolumeChange={changeVolume}
            onSeek={seekTo}
            onGoLive={goLive}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      )}
    </div>
  );
}
