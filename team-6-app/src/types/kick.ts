/**
 * Draft types modeled on real Kick Public API payloads captured live in
 * `../../kick-chat-explorer/output.json` (channel lookup + `chat.message.sent`
 * webhook events). These are intentionally loose drafts — adjust freely as
 * features firm up. Fields marked "mock-only" don't exist on the real API;
 * we add them because the UI or the replay engine needs them.
 */

export interface KickCategory {
  id: number;
  name: string;
  thumbnail: string;
}

export interface KickStream {
  is_live: boolean;
  is_mature: boolean;
  language: string;
  /** ISO 8601, e.g. "2026-07-25T19:02:11Z" */
  start_time: string;
  viewer_count: number;
  thumbnail: string;
  custom_tags: string[];
}

export interface KickChannel {
  broadcaster_user_id: number;
  slug: string;
  channel_description: string;
  banner_picture: string;
  stream: KickStream;
  stream_title: string;
  category: KickCategory;
  active_subscribers_count: number;
  canceled_subscribers_count: number;
  /** mock-only: real channel payload doesn't expose this, but the UI shows it */
  followers_count?: number;
}

/** Badge as carried by the sender identity in `chat.message.sent` events. */
export interface KickBadge {
  /** e.g. "subscriber", "sub_gifter", "moderator", "vip", "og" */
  type: string;
  text: string;
  /** e.g. months subscribed / subs gifted */
  count?: number;
}

export interface KickUserIdentity {
  /** hex color for the username in chat */
  username_color: string;
  badges: KickBadge[];
}

/**
 * Chat message, based on Kick's `chat.message.sent` webhook event.
 * The capture in output.json is a simplified {username, content, timestamp};
 * the full event also carries message_id, sender identity (color/badges) and
 * emote positions — modeled here so the UI can render Kick-like chat.
 */
export interface KickChatMessage {
  message_id: string;
  username: string;
  content: string;
  /** ISO 8601 with sub-second precision */
  timestamp: string;
  identity?: KickUserIdentity;
  /** mock-only: seconds since stream start — lets the replay engine (T4) key
   * messages to the stream clock without re-deriving from timestamps */
  offset_seconds?: number;
}

/** Response of GET /api/chat (T5). */
export interface ChatResponse {
  messages: KickChatMessage[];
}
