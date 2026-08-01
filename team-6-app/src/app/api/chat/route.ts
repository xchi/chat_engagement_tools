import type { NextRequest } from "next/server";
import { mockChatMessages } from "@/lib/mocks/chat-messages";
import type { ChatResponse } from "@/types/kick";

/**
 * GET /api/chat?from=&to= — chat messages whose `offset_seconds` falls in
 * the given stream-clock range (T5). Both bounds are optional; omitting
 * `to` returns everything from `from` onward.
 */
export function GET(request: NextRequest): Response {
  const from = Number(request.nextUrl.searchParams.get("from") ?? 0);
  const to = Number(request.nextUrl.searchParams.get("to") ?? Infinity);

  const messages = mockChatMessages.filter((message) => {
    const offset = message.offset_seconds ?? 0;
    return offset >= from && offset <= to;
  });

  return Response.json({ messages } satisfies ChatResponse);
}
