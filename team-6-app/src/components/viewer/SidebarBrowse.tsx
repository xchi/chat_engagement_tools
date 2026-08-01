import { Compass, Heart, House } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCount } from "@/lib/format";
import { mockRecommended } from "@/lib/mocks/recommended";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: House, label: "Home" },
  { icon: Compass, label: "Browse" },
  { icon: Heart, label: "Following" },
];

/** Viewer left sidebar: nav links, Following (empty state), Recommended channels. */
export default function SidebarBrowse() {
  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ icon: Icon, label }) => (
          <li key={label}>
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold transition-colors hover:bg-accent">
              <Icon className="size-5" />
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="px-2">
        <h3 className="text-sm font-bold">Following</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You are not following any channel yet.
        </p>
        <p className="mt-2 text-xs font-semibold text-muted-foreground/60">
          Show More
        </p>
      </div>

      <div>
        <h3 className="px-2 text-sm font-bold">Recommended</h3>
        <ul className="mt-2 space-y-0.5">
          {mockRecommended.map((channel, index) => (
            <li key={channel.slug}>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                  index === 0 && "bg-accent"
                )}
              >
                <Avatar className="size-8">
                  <AvatarFallback
                    className="text-xs font-bold text-white"
                    style={{ backgroundColor: channel.color }}
                  >
                    {channel.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {channel.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {channel.category}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-primary" />
                  {channel.viewers === null ? "LIVE" : formatCount(channel.viewers)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
