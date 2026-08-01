import { Radio } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import { Badge } from "@/components/ui/badge";

const STATS = ["Viewers", "Followers", "Sub Counts", "Time Live"];

/**
 * "Session Info" strip. Static OFFLINE state for now — T3's stream clock
 * makes it live (viewer count, time live, etc.).
 */
export default function SessionInfoBar() {
  return (
    <PanelCard icon={Radio} title="Session Info">
      <div className="grid grid-cols-2 divide-border sm:grid-cols-5 sm:divide-x">
        <div className="px-4 py-3">
          <Badge className="rounded-sm bg-white font-black text-black">
            OFFLINE
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">Session</p>
        </div>
        {STATS.map((label) => (
          <div key={label} className="px-4 py-3">
            <p className="text-lg font-semibold text-muted-foreground">-</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
