import type { NextRequest } from "next/server";

import { getChatReplay, offsetLowerBound } from "@/lib/server/chat-replay";
import { badRequest, parseNonNegative } from "@/lib/server/params";
import type { ChatResponse } from "@/types/api";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

/**
 * GET /api/chat?from=&to=&limit= (T5) — chat messages in the half-open
 * offset-seconds range `[from, to)`. `from` defaults to 0, `to` to the end
 * of the dataset; when more than `limit` (default 500, max 5000) messages
 * match, the LAST `limit` are returned — live chat cares about the newest.
 * Pollers can page gap-free with `from = previous to`.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const from = parseNonNegative(params, "from", 0);
  const to = parseNonNegative(params, "to", Infinity);
  const limit = parseNonNegative(params, "limit", DEFAULT_LIMIT);
  if (from === null || to === null || limit === null) {
    return badRequest(
      "`from`, `to` and `limit` must be non-negative numbers (seconds / count)",
    );
  }
  if (to < from) return badRequest("`to` must be >= `from`");

  const messages = await getChatReplay();
  const start = offsetLowerBound(messages, from);
  const end = to === Infinity ? messages.length : offsetLowerBound(messages, to);
  const total = end - start;
  const capped = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);

  const body: ChatResponse = {
    from_seconds: from,
    to_seconds:
      to === Infinity
        ? (messages[messages.length - 1]?.offset_seconds ?? 0) + 1
        : to,
    total,
    messages: messages.slice(Math.max(start, end - capped), end),
  };
  return Response.json(body);
}
