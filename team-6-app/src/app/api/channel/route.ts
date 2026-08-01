import { mockChannel } from "@/lib/mocks/channel";
import type { KickChannel } from "@/types/kick";

/** GET /api/channel — the mocked channel/session info (T5). */
export function GET(): Response {
  return Response.json(mockChannel satisfies KickChannel);
}
