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

  // Emote-heavy messages using the same catalog (id:name pairs) as the
  // EMOTES table in ../../../../chat_engagement/app.py, encoded as Kick's
  // real inline `[emote:id:name]` content tokens (see kick-chat-explorer/
  // output.json for captured examples of this format).
  {
    message_id: "msg-015",
    username: "quicksilver_q",
    content: "[emote:37226:KEKW]",
    timestamp: at(109),
    offset_seconds: 109,
    identity: {
      username_color: "#ff6b6b",
      badges: [{ type: "subscriber", text: "Subscriber", count: 3 }],
    },
  },
  {
    message_id: "msg-016",
    username: "Deuces_tm",
    content: "no way [emote:37233:PogU]",
    timestamp: at(115),
    offset_seconds: 115,
    identity: {
      username_color: "#31c4f3",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 5 }],
    },
  },
  {
    message_id: "msg-017",
    username: "riverside_rik",
    content: "[emote:4148074:HYPERCLAP]",
    timestamp: at(121),
    offset_seconds: 121,
    identity: { username_color: "#2dd4bf", badges: [] },
  },
  {
    message_id: "msg-018",
    username: "midnight_moo92",
    content: "[emote:37232:PeepoClap] gg",
    timestamp: at(127),
    offset_seconds: 127,
    identity: { username_color: "#c084fc", badges: [{ type: "vip", text: "VIP" }] },
  },
  {
    message_id: "msg-019",
    username: "papercut_pam",
    content: "[emote:5756671:GIGACHAD]",
    timestamp: at(133),
    offset_seconds: 133,
    identity: {
      username_color: "#fbbf24",
      badges: [{ type: "subscriber", text: "Subscriber", count: 8 }],
    },
  },
  {
    message_id: "msg-020",
    username: "thunderclap_tj",
    content: "EZ [emote:5756668:EZ]",
    timestamp: at(139),
    offset_seconds: 139,
    identity: { username_color: "#60a5fa", badges: [] },
  },
  {
    message_id: "msg-021",
    username: "Xsarahannx",
    content: "[emote:5380971:AURAPULSE]",
    timestamp: at(145),
    offset_seconds: 145,
    identity: {
      username_color: "#a970ff",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
  {
    message_id: "msg-022",
    username: "glazed_donut",
    content: "[emote:37227:LULW] no shot",
    timestamp: at(151),
    offset_seconds: 151,
    identity: {
      username_color: "#f472b6",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 2 }],
    },
  },
  {
    message_id: "msg-023",
    username: "static_noise99",
    content: "[emote:5756504:NODDERS]",
    timestamp: at(157),
    offset_seconds: 157,
    identity: { username_color: "#94a3b8", badges: [] },
  },
  {
    message_id: "msg-024",
    username: "echo_chamber",
    content: "[emote:4148081:Sadge] that's rough",
    timestamp: at(163),
    offset_seconds: 163,
    identity: {
      username_color: "#34d399",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
  {
    message_id: "msg-025",
    username: "TheBrotherRik",
    content: "[emote:4147902:KEKBye]",
    timestamp: at(169),
    offset_seconds: 169,
    identity: {
      username_color: "#4ade80",
      badges: [
        { type: "subscriber", text: "Subscriber", count: 23 },
        { type: "sub_gifter", text: "Sub Gifter", count: 10 },
      ],
    },
  },
  {
    message_id: "msg-026",
    username: "sadgirlsummer",
    content: "mic cut [emote:5756628:MuteD]",
    timestamp: at(175),
    offset_seconds: 175,
    identity: { username_color: "#f87171", badges: [] },
  },
  {
    message_id: "msg-027",
    username: "vinylvoyager",
    content: "[emote:5273243:lowCortisol] chat needs a nap",
    timestamp: at(181),
    offset_seconds: 181,
    identity: { username_color: "#a78bfa", badges: [{ type: "moderator", text: "Moderator" }] },
  },
  {
    message_id: "msg-028",
    username: "loopstation",
    content: "[emote:4148076:HaHaa]",
    timestamp: at(187),
    offset_seconds: 187,
    identity: { username_color: "#22d3ee", badges: [] },
  },
  {
    message_id: "msg-029",
    username: "unclefrank77",
    content: "[emote:5756623:OuttaPocket] that was wild",
    timestamp: at(193),
    offset_seconds: 193,
    identity: { username_color: "#facc15", badges: [] },
  },
  {
    message_id: "msg-030",
    username: "BahRykz",
    content: "[emote:5756632:SUSSY]",
    timestamp: at(199),
    offset_seconds: 199,
    identity: {
      username_color: "#f3d02f",
      badges: [{ type: "subscriber", text: "Subscriber", count: 14 }],
    },
  },
  {
    message_id: "msg-031",
    username: "Catto095",
    content: "chat what [emote:5756678:WeirdChamp]",
    timestamp: at(205),
    offset_seconds: 205,
    identity: {
      username_color: "#fb7185",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
  {
    message_id: "msg-032",
    username: "KickBot",
    content: "[emote:37236:ThisIsFine] stream lagging",
    timestamp: at(211),
    offset_seconds: 211,
    identity: { username_color: "#53fc18", badges: [{ type: "bot", text: "Bot" }] },
  },
  {
    message_id: "msg-033",
    username: "DamaniStrange",
    content: "[emote:4148144:catblobDance]",
    timestamp: at(217),
    offset_seconds: 217,
    identity: { username_color: "#f97316", badges: [] },
  },
  {
    message_id: "msg-034",
    username: "quicksilver_q",
    content: "vibes immaculate [emote:4147884:vibePls]",
    timestamp: at(223),
    offset_seconds: 223,
    identity: {
      username_color: "#ff6b6b",
      badges: [{ type: "subscriber", text: "Subscriber", count: 3 }],
    },
  },
  {
    message_id: "msg-035",
    username: "mu1ishatr00p",
    content: "[emote:5756644:ratJAM] this track",
    timestamp: at(229),
    offset_seconds: 229,
    identity: {
      username_color: "#38bdf8",
      badges: [{ type: "subscriber", text: "Subscriber", count: 5 }],
    },
  },
  {
    message_id: "msg-036",
    username: "riverside_rik",
    content: "[emote:37245:peepoDJ]",
    timestamp: at(235),
    offset_seconds: 235,
    identity: { username_color: "#2dd4bf", badges: [] },
  },
  {
    message_id: "msg-037",
    username: "midnight_moo92",
    content: "[emote:5756616:DanceDance] cant stop",
    timestamp: at(241),
    offset_seconds: 241,
    identity: { username_color: "#c084fc", badges: [{ type: "vip", text: "VIP" }] },
  },
  {
    message_id: "msg-038",
    username: "papercut_pam",
    content: "[emote:5756675:peepoRiot] not the ref again",
    timestamp: at(247),
    offset_seconds: 247,
    identity: {
      username_color: "#fbbf24",
      badges: [{ type: "subscriber", text: "Subscriber", count: 8 }],
    },
  },
  {
    message_id: "msg-039",
    username: "thunderclap_tj",
    content: "[emote:4147892:PatrickBoo]",
    timestamp: at(253),
    offset_seconds: 253,
    identity: { username_color: "#60a5fa", badges: [] },
  },
  {
    message_id: "msg-040",
    username: "Xsarahannx",
    content: "chat calm down [emote:5273247:highCortisol]",
    timestamp: at(259),
    offset_seconds: 259,
    identity: {
      username_color: "#a970ff",
      badges: [{ type: "subscriber", text: "Subscriber", count: 1 }],
    },
  },
  {
    message_id: "msg-041",
    username: "glazed_donut",
    content: "[emote:5273241:MOGGED] rip",
    timestamp: at(265),
    offset_seconds: 265,
    identity: {
      username_color: "#f472b6",
      badges: [{ type: "sub_gifter", text: "Sub Gifter", count: 2 }],
    },
  },
];
