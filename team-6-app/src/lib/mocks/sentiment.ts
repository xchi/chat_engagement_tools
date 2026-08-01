import type { SentimentResponse } from "@/types/features";

/**
 * Chat sentiment series for the creator dashboard panel (T8), served by
 * /api/sentiment (T5).
 *
 * Tracks mockChatMessages so the chart and the chat "agree" during the demo:
 * warm banter, a dip during the tip argument, a strong positive run through
 * the clutch (HYPERCLAP / GIGACHAD), a slide as chat deflates (Sadge /
 * NODDERS), and a swing negative at the end (peepoRiot / highCortisol).
 * Each point summarizes the 60s window ending at time_seconds; breakdown
 * totals line up with mockHighlights' message_count for those buckets.
 */
export const mockSentiment: SentimentResponse = {
  window_seconds: 60,
  points: [
    { time_seconds: 30, score: 0.38, breakdown: { positive: 71, neutral: 62, negative: 15 } },
    // tip argument drags the average down
    { time_seconds: 60, score: 0.15, breakdown: { positive: 152, neutral: 168, negative: 90 } },
    { time_seconds: 90, score: 0.21, breakdown: { positive: 178, neutral: 196, negative: 84 } },
    // hype building into the clutch
    { time_seconds: 120, score: 0.5, breakdown: { positive: 361, neutral: 218, negative: 48 } },
    { time_seconds: 150, score: 0.66, breakdown: { positive: 794, neutral: 268, negative: 57 } },
    // Sadge / NODDERS — chat deflates
    { time_seconds: 180, score: 0.37, breakdown: { positive: 561, neutral: 331, negative: 168 } },
    { time_seconds: 210, score: 0.28, breakdown: { positive: 402, neutral: 314, negative: 160 } },
    // music break lifts the mood again
    { time_seconds: 240, score: 0.52, breakdown: { positive: 548, neutral: 292, negative: 71 } },
    // controversial call — first negative window of the stream
    { time_seconds: 270, score: -0.15, breakdown: { positive: 286, neutral: 305, negative: 435 } },
  ],
};
