import type { SentimentResponse } from "@/types/features";

/**
 * Chat sentiment series for the creator dashboard panel (T8), served by
 * /api/sentiment (T5). Should track mockChatMessages so the chart and the
 * chat "agree" during the demo — filled in T5/T8.
 */
export const mockSentiment: SentimentResponse = {
  window_seconds: 60,
  points: [],
};
