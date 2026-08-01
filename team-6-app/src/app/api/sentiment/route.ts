import type { NextRequest } from "next/server";
import { mockSentiment } from "@/lib/mocks/sentiment";
import type { SentimentResponse } from "@/types/features";

/**
 * GET /api/sentiment?until= — the sentiment trend up to a stream-clock
 * position (T5). Omitting `until` returns everything so far.
 */
export function GET(request: NextRequest): Response {
  const until = Number(request.nextUrl.searchParams.get("until") ?? Infinity);

  const body: SentimentResponse = {
    window_seconds: mockSentiment.window_seconds,
    points: mockSentiment.points.filter((point) => point.time_seconds <= until),
  };

  return Response.json(body);
}
