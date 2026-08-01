import type { ChaptersResponse } from "@/types/features";

/**
 * Live chapters (T7), served by /api/chapters (T5). Mocked as topic changes
 * coming from the video's captions; each chapter "appears" once the stream
 * clock passes its start_seconds.
 *
 * Hand-authored against the actual VOD (frames sampled every few minutes)
 * and the chat replay, so titles match what's really on screen. With the 5h
 * join offset (T3), ch-01..ch-10 are already live on page load; ch-11 pops
 * in ~13 min of uptime, ch-12 at ~27 min, ch-13 at ~53 min — that pop-in is
 * the T7 demo beat (see ChaptersBar).
 */
export const mockChapters: ChaptersResponse = {
  chapters: [
    {
      id: "ch-01",
      start_seconds: 0,
      title: "Day 2 kickoff: rolling with Ryan Garcia",
      source: "captions",
    },
    {
      id: "ch-02",
      start_seconds: 2820, // 0h47 — chat: "MEET AND GREET", camera setup on the Blvd
      title: "Hollywood Blvd meet & greet",
      source: "captions",
    },
    {
      id: "ch-03",
      start_seconds: 4800, // 1h20 — back in the van, chat dares take over
      title: "Chat dares on the drive over",
      source: "captions",
    },
    {
      id: "ch-04",
      start_seconds: 7080, // 1h58 — walking up to the gym parking lot
      title: "Pulling up to the boxing gym",
      source: "captions",
    },
    {
      id: "ch-05",
      start_seconds: 7860, // 2h11 — Gorlock interviewed ringside, gloves go on
      title: "Gorlock gets in the ring with Ryan",
      source: "captions",
    },
    {
      id: "ch-06",
      start_seconds: 9900, // 2h45 — the rest of the crew takes the mitts
      title: "Open ring: the crew laces up",
      source: "captions",
    },
    {
      id: "ch-07",
      start_seconds: 12240, // 3h24 — van ride, religion/life conversation
      title: "Van ride back: faith and life talk",
      source: "captions",
    },
    {
      id: "ch-08",
      start_seconds: 13740, // 3h49 — house hallway, food trays on the counter
      title: "Kitchen refuel at the house",
      source: "captions",
    },
    {
      id: "ch-09",
      start_seconds: 15120, // 4h12 — ice bags out back, two tubs by the umbrellas
      title: "Ice bath challenge with Gorlock",
      source: "captions",
    },
    {
      id: "ch-10",
      start_seconds: 17160, // 4h46 — night drive, chat picks the songs
      title: "Night drive: chat picks the playlist",
      source: "captions",
    },
    {
      id: "ch-11",
      start_seconds: 18780, // 5h13 — back home, puppy gets fed in the kitchen
      title: "Home again: feeding the puppy",
      source: "captions",
    },
    {
      id: "ch-12",
      start_seconds: 19620, // 5h27 — whiteboard out, 2026 goals + hypnotherapy talk
      title: "Whiteboard session: 2026 goals",
      source: "captions",
    },
    {
      id: "ch-13",
      start_seconds: 21180, // 5h53 — Maserati out of the garage, downtown at night
      title: "Maserati run through downtown",
      source: "captions",
    },
  ],
};
