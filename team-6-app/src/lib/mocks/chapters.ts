import type { ChaptersResponse } from "@/types/features";

/**
 * Live chapters (T7), served by /api/chapters (T5). Mocked as topic changes
 * coming from the video's captions; each chapter "appears" once the stream
 * clock passes its start_seconds.
 */
export const mockChapters: ChaptersResponse = {
  chapters: [],
};
