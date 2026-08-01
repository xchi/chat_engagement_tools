import { MessageSquareText, PanelRightClose, SquareArrowOutUpRight, Users } from "lucide-react";

import ChatInput from "@/components/shared/ChatInput";
import ChatMessage from "@/components/shared/ChatMessage";
import { Button } from "@/components/ui/button";
import { mockChatMessages } from "@/lib/mocks/chat-messages";

interface ChatPanelProps {
  /** viewer: stream-page chat column · creator: dashboard chat card */
  variant?: "viewer" | "creator";
}

/**
 * Chat column used on BOTH pages. Static list from mocks for now — the T4
 * replay engine will reveal messages as the stream clock passes their
 * offset_seconds (chat follows the live edge; scrubbing doesn't rewind it).
 */
export default function ChatPanel({ variant = "viewer" }: ChatPanelProps) {
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-end gap-0.5 p-1">
          {mockChatMessages.map((message) => (
            <ChatMessage key={message.message_id} message={message} />
          ))}
        </div>
      </div>

      <ChatInput variant={variant} />
    </div>
  );
}
