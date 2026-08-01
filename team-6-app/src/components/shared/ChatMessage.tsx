import { memo } from "react";
import Image from "next/image";
import { Bot, Gift, ShieldCheck } from "lucide-react";

import type { KickBadge, KickChatMessage } from "@/types/kick";

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

/** Kick encodes emotes inline as `[emote:{id}:{name}]`. */
const EMOTE_PATTERN = /\[emote:(\d+):([^\]]*)\]/g;

/** Message content with emote tokens swapped for their images. */
function renderContent(content: string): React.ReactNode {
  if (!content.includes("[emote:")) return content;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of content.matchAll(EMOTE_PATTERN)) {
    if (match.index > last) nodes.push(content.slice(last, match.index));
    nodes.push(
      <Image
        key={`${match.index}-${match[1]}`}
        src={`https://files.kick.com/emotes/${match[1]}/fullsize`}
        alt={match[2]}
        title={match[2]}
        width={24}
        height={24}
        unoptimized
        className="inline-block size-6 object-contain align-text-bottom"
      />,
    );
    last = match.index + match[0].length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

/** A single chat line: badges, colored username, content with emotes. */
function ChatMessage({ message }: { message: KickChatMessage }) {
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

// Rows re-render every clock tick while the panel streams; memo keeps the
// unchanged (immutable) lines out of that work.
export default memo(ChatMessage);
