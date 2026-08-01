import { ClipboardList } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";

/** "Mod Actions" panel: timeouts, bans, deleted messages log. Empty in the mock. */
export default function ModActions() {
  return (
    <PanelCard icon={ClipboardList} title="Mod Actions" filter className="h-full">
      <div className="flex h-full min-h-40 items-center justify-center p-4 text-sm text-muted-foreground">
        No mod actions yet
      </div>
    </PanelCard>
  );
}
