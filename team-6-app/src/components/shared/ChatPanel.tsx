"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  MessageSquareText,
  PanelRightClose,
  SquareArrowOutUpRight,
  Users,
} from "lucide-react";

import ChatInput from "@/components/shared/ChatInput";
import ChatMessage from "@/components/shared/ChatMessage";
import { Button } from "@/components/ui/button";
import { loadChatReplay } from "@/lib/mocks/chat-messages";
import { useStreamClock } from "@/lib/stream-clock";
import type { KickChatMessage } from "@/types/kick";

interface ChatPanelProps {
  /** viewer: stream-page chat column · creator: dashboard chat card */
  variant?: "viewer" | "creator";
}

/** Rendered chat lines are capped so hours of history don't pile up in the DOM. */
const MAX_VISIBLE_MESSAGES = 150;

/** Within this many px of the bottom still counts as following the chat. */
const PIN_THRESHOLD_PX = 48;

/** Index of the first message with offset_seconds > edge (binary search). */
function upperBound(messages: KickChatMessage[], edge: number): number {
  let lo = 0;
  let hi = messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((messages[mid].offset_seconds ?? 0) <= edge) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Chat column used on BOTH pages — the T4 replay engine. Messages stream in
 * as the stream clock passes their offset_seconds; joining mid-stream shows
 * the most recent history, like tuning into a live chat. Scrolling up pauses
 * auto-scroll (Kick's "Chat paused" pill) until you jump back down.
 */
export default function ChatPanel({ variant = "viewer" }: ChatPanelProps) {
  const clock = useStreamClock();
  const [replay, setReplay] = useState<KickChatMessage[] | null>(null);
  const [pinned, setPinned] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadChatReplay().then((messages) => {
      if (!cancelled) setReplay(messages);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chat follows the live edge (the stream clock), NOT the video playhead —
  // scrubbing the video back must not rewind chat, just like real Kick. The
  // modulo makes chat loop alongside the VOD if the clock ever outruns it.
  const visible = useMemo(() => {
    if (!replay || replay.length === 0) return [];
    const span = (replay[replay.length - 1].offset_seconds ?? 0) + 1;
    const end = upperBound(replay, clock % span);
    return replay.slice(Math.max(0, end - MAX_VISIBLE_MESSAGES), end);
  }, [replay, clock]);

  // Pre-paint (useLayoutEffect) so trimming old rows + appending new ones +
  // re-bottoming land in one frame — no intermediate scroll position that
  // could read as the user scrolling up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [visible, pinned]);

  const resumeScroll = () => {
    setPinned(true);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2">
        {variant === "viewer" ? (
          <>
            <Button variant="ghost" size="icon-sm" aria-label="Collapse chat">
              <PanelRightClose />
            </Button>
            <h2 className="flex-1 text-center text-sm font-bold">Chat</h2>
            <Button variant="ghost" size="icon-sm" aria-label="Chatters">
              <Users />
            </Button>
          </>
        ) : (
          <>
            <MessageSquareText className="ml-2 size-4" />
            <h2 className="flex-1 text-sm font-bold">Chat</h2>
            <Button variant="ghost" size="icon-sm" aria-label="Open chat in new window">
              <SquareArrowOutUpRight />
            </Button>
          </>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setPinned(
              el.scrollHeight - el.scrollTop - el.clientHeight <
                PIN_THRESHOLD_PX,
            );
          }}
          // overflow-anchor off: when the replay trims rows off the top,
          // Chrome's scroll anchoring would shift scrollTop and fire a
          // scroll event that reads as the user scrolling up (spurious
          // "Chat paused" pill).
          className="h-full overflow-y-auto [overflow-anchor:none]"
        >
          <div className="flex min-h-full flex-col justify-end gap-0.5 p-1">
            {replay === null ? (
              <div className="pb-4 text-center text-xs text-muted-foreground">
                Connecting to chat…
              </div>
            ) : (
              visible.map((message) => (
                <ChatMessage key={message.message_id} message={message} />
              ))
            )}
          </div>
        </div>

        {!pinned && (
          <button
            onClick={resumeScroll}
            className="absolute inset-x-4 bottom-2 flex items-center justify-center gap-1.5 rounded bg-secondary/95 px-3 py-1.5 text-xs font-semibold shadow-md transition hover:bg-secondary"
          >
            <ArrowDown className="size-3.5" />
            Chat paused due to scroll
          </button>
        )}
      </div>

      <ChatInput variant={variant} />
    </div>
  );
}
