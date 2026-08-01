import { Lock, Settings, Shield, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOTES = ["😇", "🤡", "😂", "🐸", "😁", "🤠", "😎", "🥳", "😜", "🫠"];

interface ChatInputProps {
  /** viewer: followers-only locked state + KICKs balance · creator: editable */
  variant?: "viewer" | "creator";
}

/** "Send a message" area at the bottom of ChatPanel. Static in T1; sending is out of scope until the features need it. */
export default function ChatInput({ variant = "viewer" }: ChatInputProps) {
  return (
    <div className="shrink-0 space-y-2 border-t border-border p-2">
      <div className="flex items-center gap-0.5 overflow-hidden">
        {EMOTES.map((emote) => (
          <button
            key={emote}
            className="rounded p-1 text-base leading-none transition-colors hover:bg-accent"
            aria-label={`Emote ${emote}`}
          >
            {emote}
          </button>
        ))}
      </div>

      {variant === "viewer" ? (
        <div className="flex h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm text-muted-foreground">
          <Lock className="size-4" />
          Followers only
        </div>
      ) : (
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Send a message"
            className="border-transparent bg-secondary px-9"
          />
          <Smile className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      <div className="flex items-center justify-between">
        {variant === "viewer" ? (
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
              K
            </span>
            0
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Chat settings">
            <Settings />
          </Button>
          <Button size="sm">Chat</Button>
        </div>
      </div>
    </div>
  );
}
