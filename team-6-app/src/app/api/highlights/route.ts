import type { NextRequest } from "next/server";
import { mockHighlights } from "@/lib/mocks/highlights";
import type { HighlightsResponse } from "@/types/features";

/**
 * GET /api/highlights?until= — the engagement curve + moments up to a
 * stream-clock position (T5). Omitting `until` returns everything so far.
 */
export function GET(request: NextRequest): Response {
  const until = Number(request.nextUrl.searchParams.get("until") ?? Infinity);

  const body: HighlightsResponse = {
    bucket_seconds: mockHighlights.bucket_seconds,
    buckets: mockHighlights.buckets.filter((bucket) => bucket.start_seconds <= until),
    moments: mockHighlights.moments.filter((moment) => moment.start_seconds <= until),
  };

  return Response.json(body);
}
