# Team 6 — Kick Mock

A mocked Kick.com **viewer page** (`/viewer`) and **creator dashboard**
(`/creator`) used to develop chat-engagement features without depending on
Kick's real APIs or a live stream. Everything is mocked and intentionally
easy to change.

Stack: Next.js (App Router) + React + TypeScript + Tailwind CSS v4 +
[shadcn/ui](https://ui.shadcn.com) (radix "nova" preset).

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

The index page links to both pages: `/viewer` and `/creator`. In the app
itself: the top-bar profile avatar opens a popover with a **Creator
dashboard** link, and clicking the **KICK logo** navigates back.

## UI conventions

- **shadcn/ui primitives** live in `src/components/ui/` (Button, Popover,
  Avatar, Badge, Switch, Progress, Input, ...). Add more with
  `npx shadcn@latest add <component>` — they automatically pick up the Kick
  theme.
- **Kick theme** is mapped onto shadcn's semantic tokens in
  `src/app/globals.css` — never hardcode colors. Cheat sheet:
  `bg-background` (page), `bg-card` (panels), `bg-primary`/`text-primary`
  (Kick green), `bg-secondary` (raised dark controls), `bg-accent` (hover
  surfaces), `text-muted-foreground` (secondary text), `border-border`.
- Icons: [lucide-react](https://lucide.dev).

## What we're building

See **[TASKS.md](./TASKS.md)** for the full task breakdown (T0–T9). Short
version: a mocked video that "looks live" + chat replay keyed to a shared
**stream clock**, then three features on top:

- **Moments graph** (viewer): YouTube "most replayed"-style engagement curve
  over the video scrub bar — peaks = moments with most unique-chatter
  interaction.
- **Live chapters** (viewer): chapters appearing over time from mocked
  caption/topic changes.
- **Sentiment analysis** (creator dashboard): live chart of chat sentiment.

## Project layout

```
src/
  app/
    page.tsx            index (links to the two pages)
    viewer/page.tsx     viewer page (T1 ✅)
    creator/page.tsx    creator dashboard (T2 ✅)
    globals.css         Kick dark theme mapped onto shadcn tokens
    api/                mock API route handlers (added in T5)
  components/
    ui/                 shadcn/ui primitives (generated — restyle via tokens)
    shared/             used by both pages (TopNav, ChatPanel, ...)
    viewer/             viewer-page components (VideoPlayer, MomentsGraph, ...)
    creator/            dashboard components (SessionInfoBar, SentimentPanel, ...)
  lib/mocks/            mock datasets served by the API routes
  types/
    kick.ts             draft types shaped after REAL Kick API payloads
    features.ts         draft schemas for OUR new features
```

The feature components (`VideoPlayer` internals, `PlayerControls`,
`MomentsGraph`, `ChaptersBar`, `SentimentPanel`) are still stubs with a
comment describing their responsibility and which task (T#) implements them.

## Schemas

- `src/types/kick.ts` mirrors real Kick Public API payloads. Source of truth:
  `../kick-chat-explorer/output.json` (live capture of a channel lookup and
  `chat.message.sent` webhook events — see `../kick-chat-explorer/README.md`).
- `src/types/features.ts` is ours (highlights/moments, chapters, sentiment).

All types are **drafts** — evolve them as the features firm up; just keep the
mock API responses (`src/lib/mocks/`, `src/app/api/`) in sync.

## Mock API (T5)

The datasets are served through Next.js route handlers (`src/app/api/`), so
features consume "an API" as they would in production. Response envelopes
live in `src/types/api.ts` (re-exporting the feature responses from
`src/types/features.ts`); invalid params answer 400 `{ "error": string }`.

- `GET /api/channel` → `ChannelResponse` — the mocked channel payload.
- `GET /api/chat?from=&to=&limit=` → `ChatResponse` — messages in the
  half-open offset-seconds range `[from, to)`. Defaults to the whole stream;
  when more than `limit` (default 500, max 5000) match, the **newest** are
  kept (`total` reports the uncapped count). Pollers page gap-free with
  `from = previous to`.
- `GET /api/highlights?until=` → `HighlightsResponse` — engagement curve
  (unique chatters per 30s bucket) + peak moments.
- `GET /api/chapters?until=` → `ChaptersResponse` — chapters already started
  (hand-authored in `src/lib/mocks/chapters.ts`; filled in T7).
- `GET /api/sentiment?until=` → `SentimentResponse` — chat sentiment trend
  (60s window, one point every 30s).

`until` is a stream-clock position: responses only contain data "up to now"
(pass `useStreamClock()`'s current value); omit it to get the full stream.

Highlights and sentiment aren't hand-seeded — they're **derived
server-side from the T4 chat replay dataset** (`buildHighlights` /
`buildSentiment` in `src/lib/mocks/`), so curve peaks, moment titles (the
token chat was spamming) and mood swings always agree with what the chat
panel shows. Hand-curation hooks: `curatedMoments` in
`src/lib/mocks/highlights.ts` (T6/T9) and the sentiment lexicons in
`src/lib/mocks/sentiment.ts` (T8/T9). Without `public/chat-replay.json`
everything falls back to the looped seed messages, same as the chat panels.

## Notes

- The "live" video is `public/n3on_x_ryan_garcia_day_2.mp4` — a lossless remux
  of the captured Kick VOD `assets/n3on_x_ryan_garcia_day_2.ts` (H.264/AAC,
  6h21m). Both are gitignored (multi-GB); regenerate the mp4 with:
  ```bash
  ffmpeg -i assets/n3on_x_ryan_garcia_day_2.ts -map 0:v:0 -map 0:a:0 \
    -c copy -movflags +faststart public/n3on_x_ryan_garcia_day_2.mp4
  ```
- The chat replay dataset is `public/chat-replay.json` — compact
  `[offset_seconds, username, content]` rows generated from the matching chat
  capture `assets/n3on_x_ryan_garcia_day_2_messages.json` (70,684 messages,
  ~14 MB, spanning the same 6h21m as the video), plus injected KickBot
  "gifted KICKs" lines. Also gitignored; regenerate with:
  ```bash
  node scripts/build-chat-replay.mjs
  ```
  Usernames get deterministic colors/badges at runtime (the capture has
  none) in `src/lib/mocks/chat-messages.ts`. Emote syntax
  `[emote:{id}:{name}]`; images at
  `https://files.kick.com/emotes/{id}/fullsize`. Without the generated file,
  chat falls back to looping the small seeded dataset.
- The **stream clock** (`src/lib/stream-clock.tsx`) is the single source of
  truth for "how long has the stream been live"; it's mounted in the root
  layout — read it anywhere with `useStreamClock()`.
- No real Kick API calls anywhere; don't add credentials to this app.
