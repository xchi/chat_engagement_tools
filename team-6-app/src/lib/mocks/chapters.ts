import type { ChaptersResponse } from "@/types/features";

/**
 * Live chapters (T7), served by /api/chapters (T5). Mocked as topic changes
 * coming from the video's captions; each chapter "appears" once the stream
 * clock passes its start_seconds.
 */
export const mockChapters: ChaptersResponse = {
  chapters: [
    { id: "ch-01", start_seconds: 0, title: "Pre-game warmup", source: "captions" },
    { id: "ch-02", start_seconds: 30, title: "Viewer tip drama", source: "captions" },
    { id: "ch-03", start_seconds: 90, title: "Ranked match starts", source: "captions" },
    { id: "ch-04", start_seconds: 120, title: "The clutch", source: "captions" },
    { id: "ch-05", start_seconds: 150, title: "Post-round breakdown", source: "captions" },
    { id: "ch-06", start_seconds: 180, title: "Chat Q&A", source: "captions" },
    { id: "ch-07", start_seconds: 210, title: "Music break", source: "manual" },
    { id: "ch-08", start_seconds: 240, title: "Controversial call", source: "captions" },
  ],
};
