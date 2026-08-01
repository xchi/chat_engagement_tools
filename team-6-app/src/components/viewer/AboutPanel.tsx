import { AtSign, BadgeCheck, Heart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCount } from "@/lib/format";
import { mockChannel } from "@/lib/mocks/channel";

/** mock-only: the followers-goal card needs a target to count toward */
const FOLLOWERS_GOAL = 104_300;

/** "About {channel}" card + followers-goal progress card. */
export default function AboutPanel() {
  const followers = mockChannel.followers_count ?? 0;
  const toGo = Math.max(0, FOLLOWERS_GOAL - followers);
  const progress = Math.min(100, (followers / FOLLOWERS_GOAL) * 100);

  return (
    <section className="grid gap-4 px-4 pb-8 lg:grid-cols-3">
      <div className="rounded-lg bg-card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1 text-lg font-bold">
            About TheDoctor
            <BadgeCheck className="size-4 fill-primary text-primary-foreground" />
          </h2>
          <span className="font-bold">{formatCount(followers)} Followers</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <AtSign className="size-4 text-muted-foreground" />
            thedoctorsocial/
          </li>
          <li className="flex items-center gap-2">
            <X className="size-4 text-muted-foreground" />
            TheDoctorGamble
          </li>
        </ul>
      </div>

      <div className="relative rounded-lg bg-card p-5">
        <Button
          size="icon-sm"
          aria-label="Follow"
          className="absolute right-4 top-4"
        >
          <Heart />
        </Button>
        <h3 className="pr-10 text-lg font-bold">
          {toGo.toLocaleString("en-US")} followers to go!
        </h3>
        <div className="relative mt-5">
          <Progress value={progress} className="h-5 rounded-full" />
          <span className="absolute inset-y-0 right-1 flex items-center">
            <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {followers.toLocaleString("en-US")} / {formatCount(FOLLOWERS_GOAL)}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
