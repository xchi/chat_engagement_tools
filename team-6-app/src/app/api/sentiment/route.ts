import type { NextRequest } from "next/server";

import { buildSentiment } from "@/lib/mocks/sentiment";
import { getChatReplay } from "@/lib/server/chat-replay";
import { badRequest, parseNonNegative } from "@/lib/server/params";
import type { SentimentResponse } from "@/types/api";

/** Derived once per server process — the dataset is static. */
let fullPromise: Promise<SentimentResponse> | null = null;
const getFullSentiment = () =>
  (fullPromise ??= getChatReplay().then(buildSentiment));

/**
 * GET /api/sentiment?until= (T5) — chat sentiment trend up to `until`
 * seconds on the stream clock (a new point every 30s). Omitting `until`
 * returns the whole stream.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const until = parseNonNegative(request.nextUrl.searchParams, "until", Infinity);
  if (until === null) {
    return badRequest("`until` must be a non-negative number of seconds");
  }

  const full = await getFullSentiment();
  const body: SentimentResponse = {
    window_seconds: full.window_seconds,
    points: full.points.filter((p) => p.time_seconds <= until),
  };
  return Response.json(body);
}
