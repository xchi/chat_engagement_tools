import type { NextRequest } from "next/server";

import { buildHighlights } from "@/lib/mocks/highlights";
import { getChatReplay } from "@/lib/server/chat-replay";
import { badRequest, parseNonNegative } from "@/lib/server/params";
import type { HighlightsResponse } from "@/types/api";

/** Derived once per server process — the dataset is static. */
let fullPromise: Promise<HighlightsResponse> | null = null;
const getFullHighlights = () =>
  (fullPromise ??= getChatReplay().then(buildHighlights));

/**
 * GET /api/highlights?until= (T5) — engagement curve + moments covering the
 * stream up to `until` seconds on the stream clock (only complete buckets
 * and fully-elapsed moments are included, so a new bucket "appears" every
 * 30s). Omitting `until` returns the whole stream.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const until = parseNonNegative(request.nextUrl.searchParams, "until", Infinity);
  if (until === null) {
    return badRequest("`until` must be a non-negative number of seconds");
  }

  const full = await getFullHighlights();
  const body: HighlightsResponse = {
    bucket_seconds: full.bucket_seconds,
    buckets: full.buckets.filter((b) => b.end_seconds <= until),
    moments: full.moments.filter((m) => m.end_seconds <= until),
  };
  return Response.json(body);
}
