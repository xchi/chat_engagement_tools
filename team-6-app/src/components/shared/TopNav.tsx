import Link from "next/link";
import { LayoutDashboard, Menu, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

/** Small green Kick coin used in "Get KICKs" / "Go live" buttons. */
function KickCoin() {
  return (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
      K
    </span>
  );
}

interface TopNavProps {
  /** viewer: search + "Get KICKs" · creator: "Go live" */
  variant?: "viewer" | "creator";
}

/**
 * Kick top bar. The KICK logo navigates "back" (home from the viewer page,
 * back to the viewer page from the creator dashboard). The profile avatar
 * opens a popover with a link to the creator dashboard.
 */
export default function TopNav({ variant = "viewer" }: TopNavProps) {
  const logoHref = variant === "creator" ? "/viewer" : "/";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <Button variant="ghost" size="icon" aria-label="Menu">
        <Menu className="size-5" />
      </Button>

      <Link
        href={logoHref}
        aria-label="KICK — go back"
        className="flex items-start gap-0.5 px-1"
      >
        <span className="text-2xl font-black italic leading-none tracking-tighter text-primary">
          KICK
        </span>
        <span className="text-[8px] font-bold tracking-widest text-foreground">
          BETA
        </span>
      </Link>

      <div className="flex flex-1 justify-center px-4">
        {variant === "viewer" && (
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="border-transparent bg-secondary pl-9"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {variant === "viewer" ? (
          <Button variant="secondary">
            <KickCoin />
            Get KICKs
          </Button>
        ) : (
          <Button>
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary-foreground text-[10px] font-black text-primary">
              K
            </span>
            Go live
          </Button>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Profile menu"
              className="rounded-full outline-none ring-2 ring-primary/70 transition hover:ring-primary focus-visible:ring-primary"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-emerald-700 text-xs font-bold">
                  JP
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="px-2 py-1.5 text-sm font-bold">jp_saturnino</p>
            <Separator className="my-1" />
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/creator">
                <LayoutDashboard />
                Creator dashboard
              </Link>
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
