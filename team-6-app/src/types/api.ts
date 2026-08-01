/**
 * Response envelopes for the mock API layer (T5) — what the route handlers
 * in `src/app/api/` return. Draft schemas like everything in this folder.
 * The feature responses (highlights/chapters/sentiment) are defined next to
 * their schemas in ./features.ts and re-exported here so API consumers have
 * a single import surface.
 */

import type { KickChannel, KickChatMessage } from "./kick";

export type {
  HighlightsResponse,
  ChaptersResponse,
  SentimentResponse,
} from "./features";

/** Response of `GET /api/channel`. */
export type ChannelResponse = KickChannel;

/** Response of `GET /api/chat?from=&to=&limit=`. */
export interface ChatResponse {
  /** effective range served — offset seconds, half-open `[from, to)` */
  from_seconds: number;
  to_seconds: number;
  /** messages matching the range, before `limit` was applied */
  total: number;
  /** the last ≤`limit` messages in range, ascending by `offset_seconds` */
  messages: KickChatMessage[];
}

/** Body of any 400 response. */
export interface ApiError {
  error: string;
}
