(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KickChatAnalytics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const POSITIVE = new Set("amazing awesome beautiful best brilliant cool excellent fun funny gg good great happy hype hyped incredible love lovely nice pog poggers sick win winning wow w yes lfg letsgo مبروك حلو حلوة ممتاز رهيب رهيبة اسطوري أسطوري احب أحب فوز كفو".split(" "));
  const NEGATIVE = new Set("awful bad boring cringe fail hate horrible lame lose losing mad sad scam terrible toxic trash ugly worst wtf no سيء سيئة زفت اكره أكره فاشل خسارة حرام كذب".split(" "));
  const POSITIVE_EMOTES = /\b(?:W|GG|EZ|POG(?:GERS)?|KEKW|LUL|LOL|OMEGALUL|WICKED|LETSGO|LFG)\b/gi;
  const NEGATIVE_EMOTES = /\b(?:L|WTF|SADGE|MADGE|COPIUM|DESPAIR|CRINGE)\b/gi;

  function sentimentScore(text) {
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

  function summarize(events, now, windowSeconds) {
    const cutoff = now - windowSeconds * 1000;
    const active = events.filter((event) => event.at >= cutoff);
    const uniqueChatters = new Set(active.map((event) => event.username.toLowerCase())).size;
    const scored = active.filter((event) => event.sentiment !== 0);
    const average = scored.length ? scored.reduce((sum, event) => sum + event.sentiment, 0) / scored.length : 0;
    const sentiment = Math.round(50 + (average / 3) * 50);
    const messagesPerMinute = Math.round(active.length * 60 / windowSeconds);
    return { active, uniqueChatters, sentiment, messagesPerMinute };
  }

  function activityLevel(uniqueChatters, thresholds) {
    if (uniqueChatters >= thresholds.hot) return "hot";
    if (uniqueChatters >= thresholds.warm) return "warm";
    return "calm";
  }

  function chatInsight(events, summary) {
    if (!events.length) return "Waiting for enough chat to read the room.";
    const emotes = new Map();
    let positive = 0;
    let negative = 0;
    for (const event of events) {
      if (event.sentiment > 0) positive += 1;
      if (event.sentiment < 0) negative += 1;
      for (const emote of event.emotes || []) {
        const current = emotes.get(emote.id) || { name: emote.name, count: 0 };
        current.count += 1;
        emotes.set(emote.id, current);
      }
    }
    const topEmote = [...emotes.values()].sort((a, b) => b.count - a.count)[0];
    let lead;
    if (summary.sentiment >= 72) lead = "Chat is seriously hyped";
    else if (summary.sentiment >= 58) lead = "Chat is feeling upbeat";
    else if (summary.sentiment <= 28) lead = "Chat looks frustrated";
    else if (summary.sentiment <= 42) lead = "Chat energy is leaning negative";
    else if (summary.messagesPerMinute >= 30) lead = "Chat is moving fast, but the mood is mixed";
    else lead = "Chat is fairly neutral right now";
    const signals = [`${summary.uniqueChatters} unique ${summary.uniqueChatters === 1 ? "chatter" : "chatters"}`, `${summary.messagesPerMinute} messages/min`];
    if (topEmote) signals.push(`${topEmote.name} is leading with ${topEmote.count} uses`);
    else if (positive || negative) signals.push(`${positive} positive vs ${negative} negative reactions`);
    return `${lead} — ${signals.join(", ")}.`;
  }

  return { sentimentScore, summarize, activityLevel, chatInsight };
});
