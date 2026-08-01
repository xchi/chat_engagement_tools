import type { HighlightsResponse } from "@/types/features";

/**
 * Engagement curve + moments for the scrub-bar highlights graph (T6),
 * served by /api/highlights (T5).
 *
 * The curve follows the same beat-for-beat arc as mockChatMessages — warmup
 * banter, tip drama, a hype peak at 120-150s, a lull, a funny stretch, a
 * music break, then a controversy spike at the end. Counts are scaled to a
 * plausible full-chat volume; mockChatMessages is a readable *sample* of that
 * chat (41 messages), so its raw per-bucket counts are deliberately not used
 * — they're flat and would render a peak-less curve.
 */
export const mockHighlights: HighlightsResponse = {
  bucket_seconds: 30,
  buckets: [
    // warmup banter — "😂 😂", the fake-tip joke starting up
    { start_seconds: 0, end_seconds: 30, unique_chatters: 96, message_count: 148, intensity: 0.24 },
    // tip drama + KickBot's 100 KICKs gift
    { start_seconds: 30, end_seconds: 60, unique_chatters: 171, message_count: 262, intensity: 0.43 },
    { start_seconds: 60, end_seconds: 90, unique_chatters: 128, message_count: 196, intensity: 0.32 },
    // "LETS GO DOC 🔥" / "W" / KEKW / PogU — hype building
    { start_seconds: 90, end_seconds: 120, unique_chatters: 274, message_count: 431, intensity: 0.68 },
    // HYPERCLAP / PeepoClap / GIGACHAD / EZ / AURAPULSE — the peak
    { start_seconds: 120, end_seconds: 150, unique_chatters: 402, message_count: 688, intensity: 1 },
    // LULW into NODDERS / Sadge / KEKBye / MuteD — chat deflates
    { start_seconds: 150, end_seconds: 180, unique_chatters: 240, message_count: 372, intensity: 0.6 },
    // HaHaa / OuttaPocket / SUSSY / WeirdChamp — chat piles on
    { start_seconds: 180, end_seconds: 210, unique_chatters: 318, message_count: 504, intensity: 0.79 },
    // catblobDance / vibePls / ratJAM / peepoDJ — music break
    { start_seconds: 210, end_seconds: 240, unique_chatters: 259, message_count: 407, intensity: 0.64 },
    // peepoRiot / PatrickBoo / highCortisol / MOGGED — controversy spike
    { start_seconds: 240, end_seconds: 270, unique_chatters: 366, message_count: 619, intensity: 0.91 },
  ],
  moments: [
    {
      id: "moment-tip-drama",
      start_seconds: 30,
      end_seconds: 60,
      title: "Is the tip fake?",
      description: "Chat argues over a money tip, then someone gifts 100 KICKs mid-argument.",
      unique_chatters: 171,
      peak_intensity: 0.43,
    },
    {
      id: "moment-clutch",
      start_seconds: 120,
      end_seconds: 150,
      title: "The clutch",
      description: "Biggest reaction of the stream — chat floods with HYPERCLAP and GIGACHAD.",
      unique_chatters: 402,
      peak_intensity: 1,
    },
    {
      id: "moment-roast",
      start_seconds: 180,
      end_seconds: 210,
      title: "Chat roasts the callout",
      description: "An out-of-pocket take sends chat into SUSSY and WeirdChamp spam.",
      unique_chatters: 318,
      peak_intensity: 0.79,
    },
    {
      id: "moment-controversy",
      start_seconds: 240,
      end_seconds: 270,
      title: "Controversial call",
      description: "peepoRiot everywhere — chat splits over the decision.",
      unique_chatters: 366,
      peak_intensity: 0.91,
    },
  ],
};
