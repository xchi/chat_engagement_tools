import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  replayRowsToMessages,
  tiledSeedFallback,
  type ChatReplayRow,
} from "@/lib/mocks/chat-messages";
import type { KickChatMessage } from "@/types/kick";

/**
 * Server-side twin of `loadChatReplay()` (src/lib/mocks/chat-messages.ts):
 * route handlers can't fetch `/chat-replay.json` by relative URL, so this
 * reads the same file straight from `public/` and applies the same
 * enrichment and seed fallback. Loaded once per server process.
 */

const REPLAY_FILE = path.join(process.cwd(), "public", "chat-replay.json");

let replayPromise: Promise<KickChatMessage[]> | null = null;

/** The full replay dataset, sorted by `offset_seconds`. */
export function getChatReplay(): Promise<KickChatMessage[]> {
  replayPromise ??= readFile(REPLAY_FILE, "utf8")
    .then((json) => replayRowsToMessages(JSON.parse(json) as ChatReplayRow[]))
    .catch((error: unknown) => {
      console.warn(
        "chat-replay.json missing — the API serves the looped seed fallback.",
        "Regenerate it with: node scripts/build-chat-replay.mjs",
        error,
      );
      return tiledSeedFallback();
    });
  return replayPromise;
}

/** Index of the first message with `offset_seconds >= t`. */
export function offsetLowerBound(
  messages: KickChatMessage[],
  t: number,
): number {
  let lo = 0;
  let hi = messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((messages[mid].offset_seconds ?? 0) < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
