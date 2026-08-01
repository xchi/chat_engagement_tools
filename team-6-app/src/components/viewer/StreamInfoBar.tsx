import { BadgeCheck, Flag, Gift, Heart, Share2, Star, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { mockChannel } from "@/lib/mocks/channel";

/** Row under the video: channel identity, title/category/tags, follow & subscribe actions. */
export default function StreamInfoBar() {
  const { stream, stream_title, category, slug } = mockChannel;

  return (
    <section className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
      <div className="flex min-w-0 gap-3">
        <div className="relative shrink-0">
          <Avatar className="size-16 ring-2 ring-primary">
            <AvatarFallback className="bg-emerald-800 text-lg font-bold">
              {slug.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-px text-[10px] font-black text-primary-foreground">
            LIVE
          </span>
        </div>

        <div className="min-w-0">
          <h1 className="flex items-center gap-1 text-lg font-bold">
            TheDoctor
            <BadgeCheck className="size-4 fill-primary text-primary-foreground" />
          </h1>
          <p className="truncate text-sm">{stream_title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm font-semibold text-primary">
              {category.name}
            </span>
            <Badge variant="secondary">
              {stream.language === "en" ? "English" : stream.language}
            </Badge>
            {stream.is_mature && <Badge variant="secondary">18+</Badge>}
            {stream.custom_tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <Badge variant="secondary" className="mt-1.5">
            KICKGoLive
          </Badge>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <Button>
            <Heart />
            Follow
          </Button>
          <Button variant="secondary">
            <Gift />
            Gift Subs
          </Button>
          <Button variant="secondary">
            <Star />
            Subscribe
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <Users className="size-4" />
            {formatCount(stream.viewer_count)} watching
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Share">
            <Share2 />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Report">
            <Flag />
          </Button>
        </div>
      </div>
    </section>
  );
}
