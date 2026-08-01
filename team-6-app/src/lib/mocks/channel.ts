import type { KickChannel } from "@/types/kick";

/**
 * Draft mock channel, shaped after the real payload in
 * kick-chat-explorer/output.json. Seeded to match the captured VOD the mock
 * stream plays (assets/n3on_x_ryan_garcia_day_2.*) — edit freely.
 */
export const mockChannel: KickChannel = {
  broadcaster_user_id: 1,
  slug: "n3on",
  display_name: "N3on",
  channel_description: "",
  banner_picture: "",
  stream: {
    is_live: true,
    is_mature: false,
    language: "en",
    start_time: "2026-08-01T12:00:00Z",
    viewer_count: 27834,
    thumbnail: "",
    custom_tags: ["IRL", "Boxing"],
  },
  stream_title: "N3ON X RYAN GARCIA DAY 2 🥊 - !socials",
  category: { id: 15, name: "IRL", thumbnail: "" },
  active_subscribers_count: 4812,
  canceled_subscribers_count: 391,
  followers_count: 741_002,
};
