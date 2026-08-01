/**
 * Draft schemas for OUR new features (not part of any Kick API) — owned by
 * team 6, change freely. Everything is keyed to the "stream clock": seconds
 * elapsed since the mocked stream started (see T3 in TASKS.md).
 */

/* ------------------------------------------------------------------ */
/* Highlights / Moments graph (T6)                                     */
/* YouTube "most replayed"-style curve rendered over the video scrub   */
/* bar: peaks = moments with the most unique-chatter interaction.      */
/* ------------------------------------------------------------------ */

/** One bucket of the engagement curve. */
export interface EngagementBucket {
  start_seconds: number;
  end_seconds: number;
  /** distinct users who chatted inside this bucket */
  unique_chatters: number;
  message_count: number;
  /** 0..1 normalized curve height */
  intensity: number;
}

/** A notable past moment (a peak) surfaced on the scrub-bar graph. */
export interface Moment {
  id: string;
  start_seconds: number;
  end_seconds: number;
  /** short label shown while hovering/scrubbing */
  title: string;
  description?: string;
  unique_chatters: number;
  /** 0..1 */
  peak_intensity: number;
}

/** Response of GET /api/highlights (T5). */
export interface HighlightsResponse {
  /** width of each bucket, in seconds */
  bucket_seconds: number;
  /** curve data from stream start up to "now" on the stream clock */
  buckets: EngagementBucket[];
  moments: Moment[];
}

/* ------------------------------------------------------------------ */
/* Live chapters (T7) — topic changes derived from video captions.     */
/* ------------------------------------------------------------------ */

export interface Chapter {
  id: string;
  start_seconds: number;
  /** topic label, e.g. "Reacting to drama", "First boss attempt" */
  title: string;
  source: "captions" | "manual";
}

/** Response of GET /api/chapters (T5). */
export interface ChaptersResponse {
  chapters: Chapter[];
}

/* ------------------------------------------------------------------ */
/* Sentiment analysis (T8) — creator dashboard, derived from chat.     */
/* ------------------------------------------------------------------ */

export type Sentiment = "positive" | "neutral" | "negative";

export interface SentimentPoint {
  /** stream clock position this point summarizes */
  time_seconds: number;
  /** -1..1 average sentiment of the window ending here */
  score: number;
  /** message counts per class inside the window */
  breakdown: Record<Sentiment, number>;
}

/** Response of GET /api/sentiment (T5). */
export interface SentimentResponse {
  /** size of the sliding window each point summarizes, in seconds */
  window_seconds: number;
  points: SentimentPoint[];
}
