import type {
  EngagementBucket,
  HighlightsResponse,
  Moment,
} from "@/types/features";
import type { KickChatMessage } from "@/types/kick";

/**
 * Engagement curve + moments for the scrub-bar highlights graph (T6), served
 * by /api/highlights (T5). Instead of a hand-seeded dataset, the curve is
 * DERIVED from the T4 chat replay (unique chatters per 30s bucket) so it
 * always matches what chat actually shows, and peaks are auto-detected as
 * moments with a "dominant token" title guessed from what chat was spamming.
 * `curatedMoments` below is the hand-editable overlay for T6/T9: entries
 * there replace any auto-detected moment they overlap.
 */

export const HIGHLIGHT_BUCKET_SECONDS = 30;

/** Hand-curated moments (fill in T6/T9) — merged over the auto-detected ones. */
export const curatedMoments: Moment[] = [];

const MOMENT_MIN_INTENSITY = 0.5;
const MOMENT_MIN_GAP_SECONDS = 300;
const MOMENT_MAX_COUNT = 12;
/** how far a moment may widen around its peak bucket, per side */
const MOMENT_MAX_WIDEN_BUCKETS = 2;

/** Words too generic to be a moment title. */
const TOKEN_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
  "been", "am", "to", "of", "in", "on", "for", "with", "at", "by", "from",
  "up", "about", "into", "over", "after", "it", "its", "he", "him", "his",
  "she", "her", "they", "them", "their", "you", "your", "i", "me", "my",
  "we", "us", "our", "this", "that", "these", "those", "what", "who", "how",
  "when", "where", "why", "just", "so", "not", "no", "yes", "yeah", "do",
  "does", "did", "done", "can", "cant", "could", "will", "would", "should",
  "get", "got", "go", "going", "gonna", "u", "ur", "im", "hes", "shes",
  "dont", "didnt", "thats", "if", "as", "all", "too", "like", "bro", "man",
  "chat", "stream", "one", "out", "now", "here", "there", "have", "has",
]);

interface DominantToken {
  count: number;
  display: string;
  /** Kick emote id, when the token was (at least once) spammed as an emote */
  emoteId: string | null;
}

/** The word/emote chat spammed the most inside `[start, end)`, if any. */
function dominantToken(
  messages: KickChatMessage[],
  start: number,
  end: number,
): DominantToken | null {
  const counts = new Map<string, DominantToken>();
  for (const message of messages) {
    const offset = message.offset_seconds ?? 0;
    if (offset < start || offset >= end) continue;
    if (message.username === "KickBot") continue;
    for (const raw of message.content.split(/\s+/)) {
      if (raw.startsWith("@")) continue; // mentions aren't topics
      const emote = /^\[emote:(\d+):(.+)\]$/.exec(raw);
      const cleaned = (emote ? emote[2] : raw).replace(
        /^[^\p{L}\p{N}\p{Emoji}]+|[^\p{L}\p{N}\p{Emoji}]+$/gu,
        "",
      );
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (TOKEN_STOPWORDS.has(key)) continue;
      const entry = counts.get(key);
      if (entry) {
        entry.count++;
        if (emote && !entry.emoteId) entry.emoteId = emote[1];
      } else {
        counts.set(key, {
          count: 1,
          display: cleaned,
          emoteId: emote ? emote[1] : null,
        });
      }
    }
  }
  let best: DominantToken | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  // require an actual spam-let, not a word that appeared twice
  return best && best.count >= 5 ? best : null;
}

function detectMoments(
  buckets: EngagementBucket[],
  chatters: Array<Set<string>>,
  messages: KickChatMessage[],
): Moment[] {
  const peaks = buckets
    .filter(
      (bucket, i) =>
        bucket.intensity >= MOMENT_MIN_INTENSITY &&
        bucket.unique_chatters >= (buckets[i - 1]?.unique_chatters ?? 0) &&
        bucket.unique_chatters >= (buckets[i + 1]?.unique_chatters ?? 0),
    )
    .sort((a, b) => b.unique_chatters - a.unique_chatters);

  const chosen: EngagementBucket[] = [];
  for (const peak of peaks) {
    if (chosen.length >= MOMENT_MAX_COUNT) break;
    const crowded = chosen.some(
      (c) => Math.abs(c.start_seconds - peak.start_seconds) < MOMENT_MIN_GAP_SECONDS,
    );
    if (!crowded) chosen.push(peak);
  }
  chosen.sort((a, b) => a.start_seconds - b.start_seconds);

  return chosen.map((peak, i) => {
    // widen around the peak while neighbours stay close to its level
    const peakIndex = peak.start_seconds / HIGHLIGHT_BUCKET_SECONDS;
    const floor = peak.unique_chatters * 0.6;
    let lo = peakIndex;
    let hi = peakIndex;
    while (
      lo > peakIndex - MOMENT_MAX_WIDEN_BUCKETS &&
      lo > 0 &&
      buckets[lo - 1].unique_chatters >= floor
    ) {
      lo--;
    }
    while (
      hi < peakIndex + MOMENT_MAX_WIDEN_BUCKETS &&
      hi < buckets.length - 1 &&
      buckets[hi + 1].unique_chatters >= floor
    ) {
      hi++;
    }

    const start = buckets[lo].start_seconds;
    const end = buckets[hi].end_seconds;
    const unique = new Set<string>();
    let messageCount = 0;
    for (let b = lo; b <= hi; b++) {
      for (const name of chatters[b]) unique.add(name);
      messageCount += buckets[b].message_count;
    }
    const token = dominantToken(messages, start, end);
    return {
      id: `moment-${String(i + 1).padStart(2, "0")}`,
      start_seconds: start,
      end_seconds: end,
      title: token ? `Chat erupts: “${token.display}”` : "Chat erupts",
      emote: token?.emoteId
        ? { id: token.emoteId, name: token.display }
        : undefined,
      description: `${messageCount} messages from ${unique.size} chatters in ${end - start}s`,
      unique_chatters: unique.size,
      peak_intensity: peak.intensity,
    };
  });
}

const overlaps = (a: Moment, b: Moment) =>
  a.start_seconds < b.end_seconds && b.start_seconds < a.end_seconds;

/**
 * Build the full-stream highlights response from the chat replay dataset
 * (messages sorted by offset). Intensity is normalized against the busiest
 * bucket of the WHOLE stream, so already-served buckets keep their height
 * as `/api/highlights?until=` reveals more of the curve.
 */
export function buildHighlights(
  messages: KickChatMessage[],
): HighlightsResponse {
  const buckets: EngagementBucket[] = [];
  const chatters: Array<Set<string>> = [];
  for (const message of messages) {
    if (message.username === "KickBot") continue;
    const index = Math.floor(
      (message.offset_seconds ?? 0) / HIGHLIGHT_BUCKET_SECONDS,
    );
    while (buckets.length <= index) {
      const start = buckets.length * HIGHLIGHT_BUCKET_SECONDS;
      buckets.push({
        start_seconds: start,
        end_seconds: start + HIGHLIGHT_BUCKET_SECONDS,
        unique_chatters: 0,
        message_count: 0,
        intensity: 0,
      });
      chatters.push(new Set());
    }
    buckets[index].message_count++;
    chatters[index].add(message.username);
  }

  let maxUnique = 1;
  for (const set of chatters) maxUnique = Math.max(maxUnique, set.size);
  buckets.forEach((bucket, i) => {
    bucket.unique_chatters = chatters[i].size;
    bucket.intensity = Math.round((chatters[i].size / maxUnique) * 1000) / 1000;
  });

  const auto = detectMoments(buckets, chatters, messages);
  const moments = [
    ...curatedMoments,
    ...auto.filter((m) => !curatedMoments.some((c) => overlaps(m, c))),
  ].sort((a, b) => a.start_seconds - b.start_seconds);

  return { bucket_seconds: HIGHLIGHT_BUCKET_SECONDS, buckets, moments };
}
