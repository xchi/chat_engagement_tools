import { Pencil, Wrench } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockChannel } from "@/lib/mocks/channel";

/** "Stream info" card: title, category, language (edit is cosmetic in the mock). */
export default function StreamInfoCard() {
  const { stream_title, category, stream } = mockChannel;

  return (
    <PanelCard
      icon={Wrench}
      title="Stream info"
      actions={
        <Button variant="ghost" size="icon-sm" aria-label="Edit stream info">
          <Pencil />
        </Button>
      }
    >
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold">{stream_title}</p>
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded bg-secondary text-xs font-black text-primary">
            {category.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 3)
              .toUpperCase()}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{category.name}</p>
            <Badge variant="secondary">
              {stream.language === "en" ? "English" : stream.language}
            </Badge>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
