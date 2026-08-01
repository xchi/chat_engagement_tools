import type { HighlightsResponse } from "@/types/features";

/**
 * Engagement curve + moments for the scrub-bar highlights graph (T6),
 * served by /api/highlights (T5). Should be derivable from
 * mockChatMessages (unique chatters per bucket) — filled in T5/T6.
 */
export const mockHighlights: HighlightsResponse = {
  bucket_seconds: 30,
  buckets: [],
  moments: [],
};
