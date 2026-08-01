import type { KickChatMessage } from "@/types/kick";

/**
 * Timestamped chat dataset for the replay engine (T4).
 * Messages are keyed to the stream clock via `offset_seconds`; the replay
 * engine reveals each message when the clock passes its offset.
 * Real captured examples to mimic: kick-chat-explorer/output.json.
 *
 * Seeded with a handful of Kick-flavored messages for the T1/T2 static
 * layout; T4 grows this into a full demo dataset (bursts around the T6
 * moments, unique-chatter spikes, gifted-KICKs bot lines).
 */

const STREAM_START = Date.parse("2026-08-01T12:00:00Z");

/** Build an ISO timestamp `offset` seconds after the mock stream start. */
function at(offset: number): string {
  return new Date(STREAM_START + offset * 1000).toISOString();
}

export const mockChatMessages: KickChatMessage[] = [
  {
    message_id: "msg-001",
    username: "Trisha82",
    content: "😂 😂",
    timestamp: at(8),
    offset_seconds: 8,
    identity: {
      username_color: "#ff75c8",
      badges: [
        { type: "subscriber", text: "Subscriber", count: 20 },
        { type: "sub_gifter", text: "Sub Gifter", count: 50 },
      ],
    },
  },
  {
    message_id: "msg-002",
    username: "Trisha82",
    content: "😂",
    timestamp: at(14),
    offset_seconds: 14,
    identity: {
      username_color: "#ff75c8",
      badges: [
        { type: "subscriber", text: "Subscriber", count: 20 },
        { type: "sub_gifter", text: "Sub Gifter", count: 50 },
      ],
    },
  },
  {
    message_id: "msg-003",
    username: "Yernutmydad",
    content: "😂 😂 😂",
    timestamp: at(21),
    offset_seconds: 21,
    identity: { username_color: "#e9c46a", badges: [] },
  },
  {
    message_id: "msg-004",
    username: "Deuces_tm",
    content: "now now, just because you got a real money tip doesn't mean it's fake",
    timestamp: at(30),
    offset_seconds: 30,
    identity: {
      username_color: "#31c4f3",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 5 }],
    },
  },
  {
    message_id: "msg-005",
    username: "BahRykz",
    content: ", ml",
    timestamp: at(37),
    offset_seconds: 37,
    identity: {
      username_color: "#f3d02f",
      badges: [{ type: "subscriber", text: "Subscriber", count: 14 }],
    },
  },
  {
    message_id: "msg-006",
    username: "Deuces_tm",
    content: "I will always believe it's fake",
    timestamp: at(45),
    offset_seconds: 45,
    identity: {
      username_color: "#31c4f3",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 5 }],
    },
  },
  {
    message_id: "msg-007",
    username: "KickBot",
    content: "@DamaniStrange just gifted 100 KICKs!",
    timestamp: at(52),
    offset_seconds: 52,
    identity: { username_color: "#53fc18", badges: [{ type: "bot", text: "Bot" }] },
  },
  {
    message_id: "msg-008",
    username: "Xsarahannx",
    content: "🐱",
    timestamp: at(60),
    offset_seconds: 60,
    identity: {
      username_color: "#a970ff",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
  {
    message_id: "msg-009",
    username: "BahRykz",
    content: "#,,",
    timestamp: at(66),
    offset_seconds: 66,
    identity: {
      username_color: "#f3d02f",
      badges: [{ type: "subscriber", text: "Subscriber", count: 14 }],
    },
  },
  {
    message_id: "msg-010",
    username: "TheBrotherRik",
    content: "Chur brother i didn't see who it was my chat freezes all the time 🙃",
    timestamp: at(74),
    offset_seconds: 74,
    identity: {
      username_color: "#4ade80",
      badges: [
        { type: "subscriber", text: "Subscriber", count: 23 },
        { type: "sub_gifter", text: "Sub Gifter", count: 10 },
      ],
    },
  },
  {
    message_id: "msg-011",
    username: "Deuces_tm",
    content: "I looked at the job, said yup time for a smoke and a coffee",
    timestamp: at(83),
    offset_seconds: 83,
    identity: {
      username_color: "#31c4f3",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 5 }],
    },
  },
  {
    message_id: "msg-012",
    username: "DamaniStrange",
    content: "50 followers",
    timestamp: at(90),
    offset_seconds: 90,
    identity: { username_color: "#f97316", badges: [] },
  },
  {
    message_id: "msg-013",
    username: "mu1ishatr00p",
    content: "LETS GO DOC 🔥",
    timestamp: at(97),
    offset_seconds: 97,
    identity: {
      username_color: "#38bdf8",
      badges: [{ type: "subscriber", text: "Subscriber", count: 5 }],
    },
  },
  {
    message_id: "msg-014",
    username: "Catto095",
    content: "W",
    timestamp: at(103),
    offset_seconds: 103,
    identity: {
      username_color: "#fb7185",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
];
