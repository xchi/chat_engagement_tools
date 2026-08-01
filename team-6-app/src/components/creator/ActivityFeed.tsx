import { Zap } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";

/**
 * "Activity Feed" panel: follows, subs, gifted KICKs as they happen.
 * Empty until the mocked stream events exist (T3+).
 */
export default function ActivityFeed() {
  return (
    <PanelCard icon={Zap} title="Activity Feed" filter className="h-full">
      <div className="flex h-full min-h-40 items-center justify-center p-4 text-sm text-muted-foreground">
        No recent activity
      </div>
    </PanelCard>
  );
}
