import type { KickChatMessage } from "@/types/kick";

/**
 * Chat Pulse — the "Kick Stream Pulse" chrome extension
 * (../chrome-extension/chat-analytics.js + emotes.js) ported into the app.
 * Same deterministic local signals — lexicon sentiment, rolling-window
 * summary, calm/warm/hot activity, an AI-style "chat read" sentence and
 * trending emotes — but fed with KickChatMessage rows from GET /api/chat
 * instead of DOM-scraped chat lines. No AI or external service is called.
 */

export interface PulseEmote {
  id: string;
  name: string;
  url: string;
}

/** One chat message, scored and with its emotes extracted. */
export interface PulseEvent {
  username: string;
  /** -3..3 lexicon score of this message */
  sentiment: number;
  emotes: PulseEmote[];
}

export interface PulseSummary {
  uniqueChatters: number;
  /** 0..100, 50 = neutral mood */
  sentiment: number;
  messagesPerMinute: number;
}

export type ActivityLevel = "calm" | "warm" | "hot";

/**
 * Unique-chatter thresholds for the activity level. The extension defaulted
 * to warm 5 / hot 12; these are re-tuned to the replay dataset's 30s-window
 * quartiles (p25 36 / median 46 / p75 55 uniques) so the level visibly moves
 * during a demo instead of pinning at "hot".
 */
export const ACTIVITY_THRESHOLDS = { warm: 40, hot: 56 };

const POSITIVE = new Set("amazing awesome beautiful best brilliant cool excellent fun funny gg good great happy hype hyped incredible love lovely nice pog poggers sick win winning wow w yes lfg letsgo مبروك حلو حلوة ممتاز رهيب رهيبة اسطوري أسطوري احب أحب فوز كفو".split(" "));
const NEGATIVE = new Set("awful bad boring cringe fail hate horrible lame lose losing mad sad scam terrible toxic trash ugly worst wtf no سيء سيئة زفت اكره أكره فاشل خسارة حرام كذب".split(" "));
const POSITIVE_EMOTES = /\b(?:W|GG|EZ|POG(?:GERS)?|KEKW|LUL|LOL|OMEGALUL|WICKED|LETSGO|LFG)\b/gi;
const NEGATIVE_EMOTES = /\b(?:L|WTF|SADGE|MADGE|COPIUM|DESPAIR|CRINGE)\b/gi;

/** Approximate local lexicon score of one message, clamped to -3..3. */
export function sentimentScore(text: string): number {
  const normalized = String(text || "").toLowerCase();
  const words = normalized.match(/[\p{L}']+/gu) || [];
  let score = 0;
  for (const word of words) {
    if (POSITIVE.has(word)) score += 1;
    if (NEGATIVE.has(word)) score -= 1;
  }
  score += (String(text || "").match(POSITIVE_EMOTES) || []).length;
  score -= (String(text || "").match(NEGATIVE_EMOTES) || []).length;
  score += (String(text || "").match(/[🔥😂🤣😍❤💚💙👏]+/gu) || []).length;
  score -= (String(text || "").match(/[😡🤬😢😭💀]+/gu) || []).length;
  if (/[!]{2,}/.test(text)) score *= 1.15;
  return Math.max(-3, Math.min(3, score));
}

/** Kick encodes emotes inline as `[emote:{id}:{name}]`. */
const EMOTE_PATTERN = /\[emote:(\d+):([^\]]+)\]/g;

export function emoteUrl(id: string): string {
  return `https://files.kick.com/emotes/${id}/fullsize`;
}

export function parseEmotes(content: string): PulseEmote[] {
  const emotes: PulseEmote[] = [];
  for (const match of String(content || "").matchAll(EMOTE_PATTERN)) {
    emotes.push({ id: match[1], name: match[2], url: emoteUrl(match[1]) });
  }
  return emotes;
}

/** Score a window of chat messages into pulse events. */
export function toPulseEvents(messages: KickChatMessage[]): PulseEvent[] {
  return messages.map((message) => ({
    username: message.username,
    sentiment: sentimentScore(message.content),
    emotes: parseEmotes(message.content),
  }));
}

/** Roll a window of events up into the headline numbers. */
export function summarize(
  events: PulseEvent[],
  windowSeconds: number,
): PulseSummary {
  const uniqueChatters = new Set(
    events.map((event) => event.username.toLowerCase()),
  ).size;
  const scored = events.filter((event) => event.sentiment !== 0);
  const average = scored.length
    ? scored.reduce((sum, event) => sum + event.sentiment, 0) / scored.length
    : 0;
  return {
    uniqueChatters,
    sentiment: Math.round(50 + (average / 3) * 50),
    messagesPerMinute: Math.round((events.length * 60) / windowSeconds),
  };
}

export function activityLevel(
  uniqueChatters: number,
  thresholds = ACTIVITY_THRESHOLDS,
): ActivityLevel {
  if (uniqueChatters >= thresholds.hot) return "hot";
  if (uniqueChatters >= thresholds.warm) return "warm";
  return "calm";
}

/** Emotes of the window ranked by uses, ties broken by first appearance. */
export function trendingEmotes(
  events: PulseEvent[],
  limit = 3,
): (PulseEmote & { count: number })[] {
  const counts = new Map<string, PulseEmote & { count: number }>();
  for (const event of events) {
    for (const emote of event.emotes) {
      const current = counts.get(emote.id) ?? { ...emote, count: 0 };
      current.count += 1;
      counts.set(emote.id, current);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * The "AI-style chat read": a deterministic natural-language line built from
 * the window's local signals only.
 */
export function chatInsight(events: PulseEvent[], summary: PulseSummary): string {
  if (!events.length) return "Waiting for enough chat to read the room.";
  let positive = 0;
  let negative = 0;
  for (const event of events) {
    if (event.sentiment > 0) positive += 1;
    if (event.sentiment < 0) negative += 1;
  }
  const topEmote = trendingEmotes(events, 1)[0];
  let lead;
  if (summary.sentiment >= 72) lead = "Chat is seriously hyped";
  else if (summary.sentiment >= 58) lead = "Chat is feeling upbeat";
  else if (summary.sentiment <= 28) lead = "Chat looks frustrated";
  else if (summary.sentiment <= 42) lead = "Chat energy is leaning negative";
  else if (summary.messagesPerMinute >= 30)
    lead = "Chat is moving fast, but the mood is mixed";
  else lead = "Chat is fairly neutral right now";
  const signals = [
    `${summary.uniqueChatters} unique ${summary.uniqueChatters === 1 ? "chatter" : "chatters"}`,
    `${summary.messagesPerMinute} messages/min`,
  ];
  if (topEmote) signals.push(`${topEmote.name} is leading with ${topEmote.count} uses`);
  else if (positive || negative)
    signals.push(`${positive} positive vs ${negative} negative reactions`);
  return `${lead} — ${signals.join(", ")}.`;
}
