"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * The stream clock — the mocked stream's single source of truth: seconds
 * elapsed since the mock stream "went live". Everything that should feel
 * live (video T3, chat replay T4, moments T6, chapters T7, sentiment T8)
 * reads it via useStreamClock() so it all stays in sync.
 *
 * Loading a page means tuning into a stream that is already
 * STREAM_START_OFFSET_SECONDS in, so the features have history to show.
 */

export const STREAM_START_OFFSET_SECONDS = 45 * 60;

/** Looping local VOD presented as the live feed (see README Notes). */
export const STREAM_VIDEO_SRC = "/n3on_x_ryan_garcia_day_2.mp4";

const StreamClockContext = createContext<number | null>(null);

export function StreamClockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [elapsed, setElapsed] = useState(STREAM_START_OFFSET_SECONDS);

  useEffect(() => {
    const wentLiveAt = Date.now() - STREAM_START_OFFSET_SECONDS * 1000;
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - wentLiveAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <StreamClockContext.Provider value={elapsed}>
      {children}
    </StreamClockContext.Provider>
  );
}

/** Seconds since the mock stream started; ticks every second. */
export function useStreamClock(): number {
  const elapsed = useContext(StreamClockContext);
  if (elapsed === null) {
    throw new Error("useStreamClock must be used within <StreamClockProvider>");
  }
  return elapsed;
}

/**
 * Viewer count wobbling around `base` as the stream runs. A deterministic
 * function of the clock (no Math.random) so server and client first paints
 * agree; steps every few seconds like Kick's real counter.
 */
export function useViewerCount(base: number): number {
  const t = Math.floor(useStreamClock() / 4);
  const wobble =
    Math.sin(t * 0.11) * 0.012 +
    Math.sin(t * 0.53 + 1.7) * 0.005 +
    Math.sin(t * 2.71) * 0.002;
  return Math.round(base * (1 + wobble));
}
