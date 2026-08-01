import { Bot, Gift, ShieldCheck } from "lucide-react";
import Image from "next/image";

import type { KickBadge, KickChatMessage } from "@/types/kick";

/** Matches Kick's inline emote token, e.g. "[emote:37226:KEKW]". */
const EMOTE_TOKEN = /\[emote:(\d+):(\w+)\]/g;

/** Splits message content into text and emote-image parts for rendering. */
function renderContent(content: string) {
  const parts: (string | { id: string; name: string })[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(EMOTE_TOKEN)) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ id: match[1], name: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <Image
        key={i}
        src={`https://files.kick.com/emotes/${part.id}/fullsize`}
        alt={part.name}
        title={part.name}
        width={24}
        height={24}
        unoptimized
        className="mx-0.5 inline-block h-6 w-6 align-middle"
      />
    ),
  );
}

function BadgeChip({ badge }: { badge: KickBadge }) {
  const base =
    "inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-0.5 align-middle text-[10px] font-bold leading-none";

  switch (badge.type) {
    case "subscriber":
      return (
        <span className={`${base} bg-pink-500 text-white`}>{badge.count}</span>
      );
    case "sub_gifter":
      return (
        <span className={`${base} bg-emerald-600 text-white`}>
          <Gift className="size-2.5" />
        </span>
      );
    case "moderator":
      return (
        <span className={`${base} bg-primary text-primary-foreground`}>
          <ShieldCheck className="size-2.5" />
        </span>
      );
    case "bot":
      return (
        <span className={`${base} bg-secondary text-foreground`}>
          <Bot className="size-2.5" />
        </span>
      );
    default:
      return (
        <span className={`${base} bg-secondary text-foreground`}>
          {badge.count ?? badge.text.slice(0, 2)}
        </span>
      );
  }
}

/** A single chat line: badges, colored username, content. */
export default function ChatMessage({ message }: { message: KickChatMessage }) {
  return (
    <div className="rounded px-2 py-0.5 text-sm leading-6 hover:bg-accent/50">
      {message.identity?.badges.map((badge, i) => (
        <span key={i} className="mr-1">
          <BadgeChip badge={badge} />
        </span>
      ))}
      <span
        className="font-semibold"
        style={{ color: message.identity?.username_color ?? "#efeff1" }}
      >
        {message.username}
      </span>
      <span className="text-muted-foreground">: </span>
      <span className="break-words">{renderContent(message.content)}</span>
    </div>
  );
}
