const assert = require("node:assert/strict");
const { sentimentScore, summarize, activityLevel, chatInsight } = require("./chat-analytics.js");
assert(sentimentScore("this is amazing POG!!") > 0);
assert(sentimentScore("awful boring stream Sadge") < 0);
assert(sentimentScore("رهيب كفو 🔥") > 0);
assert(sentimentScore("سيء فاشل 😡") < 0);
assert.equal(sentimentScore("hello chat"), 0);
const now = 100000;
const summary = summarize([
  { username: "Alice", sentiment: 2, at: now - 1000 },
  { username: "alice", sentiment: 1, at: now - 2000 },
  { username: "Bob", sentiment: -1, at: now - 5000 },
  { username: "Old", sentiment: 3, at: now - 31000 }
], now, 30);
assert.equal(summary.uniqueChatters, 2);
assert.equal(summary.active.length, 3);
assert.equal(summary.messagesPerMinute, 6);
assert.equal(activityLevel(4, { warm: 5, hot: 12 }), "calm");
assert.equal(activityLevel(8, { warm: 5, hot: 12 }), "warm");
assert.equal(activityLevel(12, { warm: 5, hot: 12 }), "hot");
const insight = chatInsight([
  { sentiment: 2, emotes: [{ id: "1", name: "HYPE" }] },
  { sentiment: 1, emotes: [{ id: "1", name: "HYPE" }] }
], { sentiment: 75, uniqueChatters: 2, messagesPerMinute: 8 });
assert.match(insight, /seriously hyped/);
assert.match(insight, /HYPE is leading with 2 uses/);
console.log("chat analytics tests passed");
