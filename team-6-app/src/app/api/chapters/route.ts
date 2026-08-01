import type { NextRequest } from "next/server";

import { mockChapters } from "@/lib/mocks/chapters";
import { badRequest, parseNonNegative } from "@/lib/server/params";
import type { ChaptersResponse } from "@/types/api";

/**
 * GET /api/chapters?until= (T5) — chapters that have already started by
 * `until` seconds on the stream clock, so a new chapter "pops in" once the
 * clock passes its `start_seconds`. Omitting `until` returns all of them.
 * (Dataset is hand-authored in src/lib/mocks/chapters.ts — filled in T7.)
 */
export function GET(request: NextRequest): Response {
  const until = parseNonNegative(request.nextUrl.searchParams, "until", Infinity);
  if (until === null) {
    return badRequest("`until` must be a non-negative number of seconds");
  }

  const body: ChaptersResponse = {
    chapters: mockChapters.chapters.filter((c) => c.start_seconds <= until),
  };
  return Response.json(body);
}
