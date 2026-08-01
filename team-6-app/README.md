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
    api/                mock API route handlers (T5 ✅)
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
mock API responses (`src/lib/mocks/`, served via `src/app/api/`) in sync.

## API routes (T5)

Route handlers under `src/app/api/` serve the datasets in `src/lib/mocks/`
as typed JSON, filtered by the stream-clock position when a query param is
given:

| Route | Query params | Response type |
| --- | --- | --- |
| `GET /api/channel` | — | `KickChannel` (`src/types/kick.ts`) |
| `GET /api/chat` | `from`, `to` (offset-seconds range) | `ChatResponse` (`src/types/kick.ts`) |
| `GET /api/highlights` | `until` (stream-clock position) | `HighlightsResponse` (`src/types/features.ts`) |
| `GET /api/chapters` | `until` | `ChaptersResponse` (`src/types/features.ts`) |
| `GET /api/sentiment` | `until` | `SentimentResponse` (`src/types/features.ts`) |

`highlights`/`chapters`/`sentiment` currently return empty arrays since
their mock datasets aren't filled in yet (T6/T7/T8); the `until` filtering
is already correct so those routes need no changes once the data lands.

## Notes

- The "live" video is a looping local file (not sourced yet — will land in
  `public/` as part of T3).
- No real Kick API calls anywhere; don't add credentials to this app.
