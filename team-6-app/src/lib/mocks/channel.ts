import type { KickChannel } from "@/types/kick";

/**
 * Draft mock channel, shaped after the real payload in
 * kick-chat-explorer/output.json. Seed data for T1/T2 — edit freely.
 */
export const mockChannel: KickChannel = {
  broadcaster_user_id: 1,
  slug: "thedoctor",
  channel_description: "",
  banner_picture: "",
  stream: {
    is_live: true,
    is_mature: true,
    language: "en",
    start_time: "2026-08-01T12:00:00Z",
    viewer_count: 139,
    thumbnail: "",
    custom_tags: ["gambling"],
  },
  stream_title: "MORNING SLAPS WITH K.A.C!!!! - !doc",
  category: { id: 28, name: "Slots & Casino", thumbnail: "" },
  active_subscribers_count: 32,
  canceled_subscribers_count: 4,
  followers_count: 96115,
};
