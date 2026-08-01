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

## T3 — Mock "live" stream engine

**Goal:** make the app feel live. A looping local video (file TBD — will be
added to `public/`) presented as a live stream, plus the shared **stream
clock**.

- Stream clock: elapsed seconds since mock stream start; exposed via a small provider/hook (e.g. `src/lib/stream-clock.ts(x)`) that any component can read. Suggestion: page load = stream already N minutes in, so there's history for the features to show.
- Video: LIVE badge, elapsed timer, jittering viewer count.
- **Custom `PlayerControls`** (native `<video controls>` can't host overlays): play/pause, volume, current time / total "streamed" time, scrubbable seek bar limited to the already-streamed portion. This seek bar is the surface T6 draws on.
- Files: `src/components/viewer/{VideoPlayer,PlayerControls}.tsx`, `src/lib/stream-clock.ts(x)`
- Depends on: T1 (video area exists).
- Done when: video plays "live", scrubbing back and returning to live works, clock is readable from any component.

## T4 — Chat replay engine

**Goal:** chat that streams in "real time", keyed to the stream clock.

- Fill `src/lib/mocks/chat-messages.ts` with a timestamped dataset (`offset_seconds` per message; schema `KickChatMessage` based on Kick's `chat.message.sent` event — real examples in `../kick-chat-explorer/output.json`). Make it demo-worthy: bursts around the moments T6 will highlight, unique-chatter spikes, some gifted-KICKs bot lines.
- Replay: reveal messages as the clock passes their offset, in the viewer ChatPanel and the dashboard Chat.
- Files: `src/lib/mocks/chat-messages.ts`, `src/components/shared/ChatPanel.tsx`
- Depends on: T3 (stream clock), T1/T2 (panels exist).
- Done when: both pages show the same chat flowing live; scrubbing the video does NOT rewind chat (chat follows the live edge, like real Kick).

## T5 — Mock API layer ✅ (done)

**Goal:** features consume "an API" as they would in production — Next.js
route handlers serving the mock datasets.

- Routes: `GET /api/channel`, `GET /api/chat?from=&to=` (offset-seconds range), `GET /api/highlights?until=`, `GET /api/chapters?until=`, `GET /api/sentiment?until=` — `until` = stream-clock position, so responses only contain data "up to now".
- Files: `src/app/api/*/route.ts`, reading from `src/lib/mocks/*`; response types in `src/types/` (added `ChatResponse` to `src/types/kick.ts`).
- Depends on: T0 (can start anytime; datasets get richer via T4/T6/T7/T8).
- Done when: all routes return typed JSON matching `src/types/`, documented in README.
- Note: `highlights`/`chapters`/`sentiment` mocks are still empty arrays (T6/T7/T8 not built yet) — the routes already filter by `until` correctly, so they'll "just work" once those mocks are filled in.

## T6 — Highlights / Moments graph (FEATURE)

**Goal:** YouTube "most replayed"-style engagement curve rendered **on top of
the video scrub bar, synchronized with it**. Peaks = past moments with the
most unique-chatter interaction, so viewers scrubbing can spot and jump to
meaningful moments.

- Data: `GET /api/highlights` → `HighlightsResponse` (per-bucket unique-chatter intensity + moment metadata). Fill `src/lib/mocks/highlights.ts` consistently with the T4 chat dataset.
- UI: curve above/over the seek bar (visible on hover/scrub like YouTube); moment labels on hover; click a peak → seek there; curve extends live as the clock advances.
- Files: `src/components/viewer/MomentsGraph.tsx`, `src/lib/mocks/highlights.ts`, `src/app/api/highlights/route.ts`
- Depends on: T3 (custom seek bar), T5.
- Done when: hovering the bar shows the curve aligned to video time; clicking a peak seeks; new buckets appear over time.

## T7 — Live chapters (FEATURE)

**Goal:** chapters appear live as the stream progresses, mocked as topic
changes derived from the video captions.

- Data: `GET /api/chapters` → `ChaptersResponse`. Fill `src/lib/mocks/chapters.ts` with chapters matching the (TBD) video's content.
- UI: `ChaptersBar` markers/labels on or under the timeline; current chapter title visible; clicking a chapter seeks to it; a new chapter pops in when the clock passes its `start_seconds`.
- Files: `src/components/viewer/ChaptersBar.tsx`, `src/lib/mocks/chapters.ts`, `src/app/api/chapters/route.ts`
- Depends on: T3, T5.
- Done when: chapters appear over time and clicking one seeks the video.

## T8 — Sentiment analysis panel (FEATURE)

**Goal:** creator dashboard panel charting live chat sentiment.

- Data: `GET /api/sentiment` → `SentimentResponse` (score trend −1..1 + positive/neutral/negative breakdown). Fill `src/lib/mocks/sentiment.ts` consistently with the T4 chat dataset (e.g. sentiment dips where chat gets salty).
- UI: `SentimentPanel` on `/creator` — trend chart + current breakdown, updating as the clock advances.
- Files: `src/components/creator/SentimentPanel.tsx`, `src/lib/mocks/sentiment.ts`, `src/app/api/sentiment/route.ts`
- Depends on: T2, T3 (clock), T5.
- Done when: the chart visibly moves during a demo and roughly matches the chat's mood.

## T9 — Demo polish

**Goal:** the 5-minute demo tells a story.

- Seed-data quality pass: chat bursts, 2–3 clear moments, 3–4 chapters, a visible sentiment swing — all aligned on the stream clock.
- Demo script: what to show, in what order, on which page.
- Depends on: everything above.
