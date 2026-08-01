// Generates public/chat-replay.json (the T4 chat replay dataset) from the
// real capture assets/n3on_x_ryan_garcia_day_2_messages.json.
//
//   node scripts/build-chat-replay.mjs
//
// Output is a compact JSON array of [offset_seconds, username, content] rows
// sorted by offset — identities (colors/badges) are derived at runtime in
// src/lib/mocks/chat-messages.ts. Both files are gitignored (the capture is
// local-only, like the VOD); this script is the regen path.
//
// On top of the real messages it injects KickBot "gifted KICKs" lines at
// deterministic (seeded) intervals, crediting a recently active chatter.

import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL(
  "../assets/n3on_x_ryan_garcia_day_2_messages.json",
  import.meta.url,
);
const OUT = new URL("../public/chat-replay.json", import.meta.url);

const capture = JSON.parse(readFileSync(SRC, "utf8"));
const t0 = Date.parse(capture[0].createdAt);

/** @type {[number, string, string][]} */
const rows = capture.map((m) => [
  Math.round((Date.parse(m.createdAt) - t0) / 1000),
  m.username,
  m.content,
]);

// Seeded LCG so regenerating produces the identical dataset.
let seed = 42;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;

/** Index of the first row with offset > t. */
function upperBound(t) {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const KICKS_AMOUNTS = [5, 10, 20, 50, 100];
const span = rows[rows.length - 1][0];
const botLines = [];
for (let t = 180; t < span; t += 180 + Math.floor(rand() * 240)) {
  const amount = KICKS_AMOUNTS[Math.floor(rand() * KICKS_AMOUNTS.length)];
  const gifter = rows[Math.max(0, upperBound(t) - 1)][1];
  botLines.push([t, "KickBot", `@${gifter} just gifted ${amount} KICKs!`]);
}

// Stable sort keeps real messages ahead of bot lines on equal offsets.
const merged = rows.concat(botLines).sort((a, b) => a[0] - b[0]);

const json = `[\n${merged.map((r) => JSON.stringify(r)).join(",\n")}\n]`;
writeFileSync(OUT, json);

const hours = Math.floor(span / 3600);
const minutes = Math.floor((span % 3600) / 60);
console.log(
  `Wrote ${merged.length} rows (${rows.length} captured + ${botLines.length} KickBot) ` +
    `spanning ${hours}h${String(minutes).padStart(2, "0")}m ` +
    `→ public/chat-replay.json (${(json.length / 1e6).toFixed(1)} MB)`,
);
