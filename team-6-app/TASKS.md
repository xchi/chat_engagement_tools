# Team 6 — Task Breakdown

Mocked Kick.com viewer page + creator dashboard for developing chat-engagement
features. Everything is mocked — no communication with real Kick APIs. Schemas
are drafts (see `src/types/`) shaped after real payloads captured in
`../kick-chat-explorer/output.json`; change them freely as features firm up.

**Core concept — the stream clock:** the mocked stream has a single source of
truth: *seconds elapsed since the mock stream started*. The video (T3), chat
replay (T4), moments graph (T6), chapters (T7), sentiment (T8) and the
dashboard session info all read from it, so everything stays in sync and the
whole app "feels live".

---

## T0 — Scaffold ✅ (done)

Next.js (App Router) + TypeScript + Tailwind v4 + **shadcn/ui** (primitives in
`src/components/ui/`, restyled via the Kick tokens in `src/app/globals.css`);
blank `/viewer` and `/creator` pages; component / mocks / types skeleton; this
file.

## T1 — Viewer page UI clone ✅ (done)

**Goal:** static clone of Kick's stream page layout (see design reference
screenshot: top nav, left "Following/Recommended" sidebar, video area, stream
info row, about + followers-goal cards, right chat column) rendering
`mockChannel` and the seeded chat lines from `src/lib/mocks/chat-messages.ts`.

- **Header navigation:** the profile avatar opens a popover with a "Creator
  dashboard" link (→ `/creator`); clicking the KICK logo navigates back.
- Files: `src/app/viewer/page.tsx`, `src/components/viewer/{SidebarBrowse,StreamInfoBar,AboutPanel}.tsx`, `src/components/shared/{TopNav,ChatPanel,ChatMessage,ChatInput}.tsx`
- The video area is a plain placeholder box until T3.
- Depends on: T0.
- Done when: `/viewer` visually matches the reference layout at desktop width, all data comes from `src/lib/mocks/`, no console errors.

## T2 — Creator dashboard UI clone ✅ (done)

**Goal:** static clone of Kick's dashboard layout (left nav, Session Info
strip, Stream Preview, Activity Feed, Mod Actions, Chat column, Stream info
card, Channel Actions card, right icon rail).

- Files: `src/app/creator/page.tsx`, `src/components/creator/*.tsx` (incl. the shared `PanelCard` card frame), reuses `src/components/shared/*`
- Depends on: T0 (independent of T1 — can run in parallel).
- Done when: `/creator` visually matches the reference layout, panels are componentized, toggles are cosmetic.

## T3 — Mock "live" stream engine ✅ (done)

**Goal:** make the app feel live. A looping local video presented as a live
stream, plus the shared **stream clock**.

- Stream clock: `StreamClockProvider` / `useStreamClock()` in `src/lib/stream-clock.tsx`, mounted in the root layout so any component can read it. Page load = stream already 45 min in (`STREAM_START_OFFSET_SECONDS`), so there's history for the features to show. `useViewerCount()` derives the jittering viewer count from the same clock.
- Video: `public/n3on_x_ryan_garcia_day_2.mp4` — 6h21m Kick VOD capture, gitignored; regen command in README Notes. Joining the page tunes in at the live edge (`clock % duration`); overlays show the LIVE badge, uptime timer and jittering viewer count.
- **Custom `PlayerControls`** (native `<video controls>` can't host overlays): play/pause, volume, current time / total "streamed" time, scrubbable seek bar limited to the already-streamed portion (hover = timestamp tooltip). This seek bar is the surface T6 draws on. Scrubbed back → "GO TO LIVE" returns to the edge.
- Files: `src/components/viewer/{VideoPlayer,PlayerControls}.tsx`, `src/lib/stream-clock.tsx`
- Depends on: T1 (video area exists).
- Done when: video plays "live", scrubbing back and returning to live works, clock is readable from any component.

## T4 — Chat replay engine ✅ (done)

**Goal:** chat that streams in "real time", keyed to the stream clock.

- Dataset: `scripts/build-chat-replay.mjs` processes the real capture `assets/n3on_x_ryan_garcia_day_2_messages.json` (70,684 messages `{content, createdAt, id, userId, username}` from the same stream as the T3 video, same 6h21m span) into `public/chat-replay.json` — compact `[offset_seconds, username, content]` rows (`offset_seconds` = `createdAt` minus the first message's) plus seeded KickBot "gifted KICKs" lines every few minutes. Gitignored like the VOD; regen command in README. Real bursts/unique-chatter spikes survive intact for T6 to highlight.
- Replay: `loadChatReplay()` in `src/lib/mocks/chat-messages.ts` fetches the dataset once (shared by both panels), enriches usernames with deterministic Kick-style colors/badges, and falls back to tiling the seeded messages if the file is missing. `ChatPanel` reveals messages as the clock passes their offset (capped at 150 in the DOM), auto-scrolls, and pauses on scroll-up with Kick's "Chat paused due to scroll" pill. `ChatMessage` renders `[emote:{id}:{name}]` tokens as inline images from `https://files.kick.com/emotes/{id}/fullsize`.
- Files: `scripts/build-chat-replay.mjs`, `src/lib/mocks/chat-messages.ts`, `src/components/shared/{ChatPanel,ChatMessage}.tsx`
- Depends on: T3 (stream clock), T1/T2 (panels exist).
- Done when: both pages show the same chat flowing live; scrubbing the video does NOT rewind chat (chat follows the live edge, like real Kick).

## T5 — Mock API layer ✅ (done)

**Goal:** features consume "an API" as they would in production — Next.js
route handlers serving the mock datasets.

- Routes: `GET /api/channel`, `GET /api/chat?from=&to=&limit=` (offset-seconds range `[from, to)`, newest-`limit` capped), `GET /api/highlights?until=`, `GET /api/chapters?until=`, `GET /api/sentiment?until=` — `until` = stream-clock position, so responses only contain data "up to now". Invalid params → 400 `{error}`.
- Highlights (30s unique-chatter buckets + auto-detected peak moments titled by the token chat was spamming) and sentiment (lexicon-scored 60s windows) are **derived server-side from the T4 chat dataset** (`buildHighlights`/`buildSentiment` in `src/lib/mocks/`), so they stay consistent with chat automatically. Chapters stay hand-authored (T7).
- Files: `src/app/api/*/route.ts`, `src/lib/server/{chat-replay,params}.ts` (fs loader for `public/chat-replay.json` + param parsing), reading from `src/lib/mocks/*`; response types in `src/types/api.ts`.
- Depends on: T0 (can start anytime; datasets get richer via T4/T6/T7/T8).
- Done when: all routes return typed JSON matching `src/types/`, documented in README ("Mock API").

## T6 — Highlights / Moments graph (FEATURE)

**Goal:** YouTube "most replayed"-style engagement curve rendered **on top of
the video scrub bar, synchronized with it**. Peaks = past moments with the
most unique-chatter interaction, so viewers scrubbing can spot and jump to
meaningful moments.

- Data: `GET /api/highlights` → `HighlightsResponse` (per-bucket unique-chatter intensity + moment metadata) — already derived from the T4 chat dataset by T5; hand-curate moment titles via `curatedMoments` in `src/lib/mocks/highlights.ts` if the auto ones read poorly.
- UI: curve above/over the seek bar (visible on hover/scrub like YouTube); moment labels on hover; click a peak → seek there; curve extends live as the clock advances.
- Files: `src/components/viewer/MomentsGraph.tsx`, `src/lib/mocks/highlights.ts`, `src/app/api/highlights/route.ts`
- Depends on: T3 (custom seek bar), T5.
- Done when: hovering the bar shows the curve aligned to video time; clicking a peak seeks; new buckets appear over time.

## T7 — Live chapters (FEATURE)

**Goal:** chapters appear live as the stream progresses, presented as if an
AI service is processing the stream's closed captions and deciding both each
chapter's title and when a topic change warrants starting a new one.

- Concept: Kick has no captions/chapters feature — this is a demo conceit, modeled on Loom's AI chapters (video divided into clickable timestamped sections for navigation, titles auto-generated). We don't build the real CC pipeline; we build just enough to *show the idea working*: the mock API reveals pre-authored chapters over time, and the UI sells the story with a visible "processing captions… → generating chapter…" state before each new chapter pops in.
- Data: `GET /api/chapters` → `ChaptersResponse`. Fill `src/lib/mocks/chapters.ts` with chapters matching the video's content — hand-authored, but framed as caption-derived AI output.
- UI: `ChaptersBar` integrated with the scrub bar — markers/labels on or under the timeline, aligned with video time; current chapter title visible; clicking a chapter seeks to it. When the clock passes a chapter's `start_seconds`, show a brief processing/generating indicator, then the new chapter pops in.
- Files: `src/components/viewer/ChaptersBar.tsx`, `src/lib/mocks/chapters.ts`, `src/app/api/chapters/route.ts`
- Depends on: T3 (custom seek bar), T5.
- Done when: chapters appear over time with a visible "generating" beat, markers align with the scrub bar, and clicking one seeks the video.

## T8 — Sentiment analysis panel (FEATURE)

**Goal:** creator dashboard panel charting live chat sentiment.

- Data: `GET /api/sentiment` → `SentimentResponse` (score trend −1..1 + positive/neutral/negative breakdown) — already derived from the T4 chat dataset by T5 (real dips where chat gets salty); tune the lexicons in `src/lib/mocks/sentiment.ts` if the mood reads wrong.
- UI: `SentimentPanel` on `/creator` — trend chart + current breakdown, updating as the clock advances.
- Files: `src/components/creator/SentimentPanel.tsx`, `src/lib/mocks/sentiment.ts`, `src/app/api/sentiment/route.ts`
- Depends on: T2, T3 (clock), T5.
- Done when: the chart visibly moves during a demo and roughly matches the chat's mood.

## T9 — Demo polish

**Goal:** the 5-minute demo tells a story.

- Seed-data quality pass: chat bursts, 2–3 clear moments, 3–4 chapters, a visible sentiment swing — all aligned on the stream clock.
- Demo script: what to show, in what order, on which page.
- Depends on: everything above.
