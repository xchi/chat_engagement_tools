import type {
  Sentiment,
  SentimentPoint,
  SentimentResponse,
} from "@/types/features";
import type { KickChatMessage } from "@/types/kick";

/**
 * Chat sentiment series for the creator dashboard panel (T8), served by
 * /api/sentiment (T5). Derived from the T4 chat replay with a small
 * Kick-chat lexicon (W/L culture, emotes, hype words) so the chart and the
 * chat "agree" during the demo — tune the lexicons in T8/T9 if the mood
 * reads wrong.
 */

export const SENTIMENT_WINDOW_SECONDS = 60;
/** a new point every 30s, each summarizing the window ending there */
export const SENTIMENT_STEP_SECONDS = 30;

const POSITIVE = new Set([
  "w", "ww", "dub", "lfg", "letsgo", "letsgoo", "lesgo", "lesgoo", "gg",
  "pog", "poggers", "pogchamp", "goat", "🐐", "🔥", "fire", "lit", "hype",
  "banger", "clean", "nice", "sick", "insane", "cracked", "sheesh", "lmao",
  "lmfao", "lol", "lool", "haha", "hahaa", "😂", "🤣", "funny", "love",
  "best", "king", "legend", "huge", "massive", "based", "yessir", "ez",
]);

const NEGATIVE = new Set([
  "l", "ll", "rip", "trash", "garbage", "boring", "bored", "mid", "rigged",
  "fake", "cap", "scam", "scammed", "cringe", "yikes", "snooze", "zz",
  "sad", "pain", "awful", "worst", "terrible", "horrible", "dogshit",
  "wack", "lame", "ass",
]);

/** lowercase, strip edge punctuation, collapse "letsgooooo" → "letsgoo" */
function normalizeToken(raw: string): string {
  const emote = /^\[emote:\d+:(.+)\]$/.exec(raw);
  return (emote ? emote[1] : raw)
    .replace(/^[^\p{L}\p{N}\p{Emoji}]+|[^\p{L}\p{N}\p{Emoji}]+$/gu, "")
    .toLowerCase()
    .replace(/(.)\1{2,}/gu, "$1$1");
}

function classify(content: string): Sentiment {
  let positive = 0;
  let negative = 0;
  for (const raw of content.split(/\s+/)) {
    const token = normalizeToken(raw);
    if (POSITIVE.has(token)) positive++;
    else if (NEGATIVE.has(token)) negative++;
  }
  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

/**
 * Build the full-stream sentiment series from the chat replay dataset
 * (messages sorted by offset). Score is the polarity of opinionated
 * messages in the window, lightly smoothed so the chart trends instead of
 * jittering.
 */
export function buildSentiment(
  messages: KickChatMessage[],
): SentimentResponse {
  const classified = messages
    .filter((m) => m.username !== "KickBot")
    .map((m) => ({
      offset: m.offset_seconds ?? 0,
      sentiment: classify(m.content),
    }));

  const span = classified.length ? classified[classified.length - 1].offset : 0;
  const points: SentimentPoint[] = [];
  let lo = 0;
  let hi = 0;
  let smoothed = 0;
  for (let t = SENTIMENT_WINDOW_SECONDS; t <= span; t += SENTIMENT_STEP_SECONDS) {
    while (hi < classified.length && classified[hi].offset <= t) hi++;
    while (lo < hi && classified[lo].offset <= t - SENTIMENT_WINDOW_SECONDS) lo++;

    const breakdown: Record<Sentiment, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    for (let i = lo; i < hi; i++) breakdown[classified[i].sentiment]++;

    const opinionated = breakdown.positive + breakdown.negative;
    const raw = opinionated
      ? (breakdown.positive - breakdown.negative) / opinionated
      : 0;
    smoothed = points.length ? smoothed + 0.35 * (raw - smoothed) : raw;
    points.push({
      time_seconds: t,
      score: Math.round(smoothed * 1000) / 1000,
      breakdown,
    });
  }

  return { window_seconds: SENTIMENT_WINDOW_SECONDS, points };
}
