import type { NextRequest } from "next/server";
import { mockChapters } from "@/lib/mocks/chapters";
import type { ChaptersResponse } from "@/types/features";

/**
 * GET /api/chapters?until= — chapters whose `start_seconds` has passed on
 * the stream clock (T5). Omitting `until` returns everything so far.
 */
export function GET(request: NextRequest): Response {
  const until = Number(request.nextUrl.searchParams.get("until") ?? Infinity);

  const body: ChaptersResponse = {
    chapters: mockChapters.chapters.filter((chapter) => chapter.start_seconds <= until),
  };

  return Response.json(body);
}
