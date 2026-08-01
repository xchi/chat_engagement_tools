import { mockChannel } from "@/lib/mocks/channel";
import type { ChannelResponse } from "@/types/api";

/** GET /api/channel — the mocked channel payload (T5). */
export function GET(): Response {
  return Response.json(mockChannel satisfies ChannelResponse);
}
