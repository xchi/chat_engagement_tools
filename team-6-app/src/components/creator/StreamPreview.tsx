import { MonitorPlay } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import { Badge } from "@/components/ui/badge";
import { mockChannel } from "@/lib/mocks/channel";

/**
 * "Stream Preview" panel. Offline banner for now — once T3 exists, this can
 * reuse the mocked live video when the stream is "live".
 */
export default function StreamPreview() {
  return (
    <PanelCard icon={MonitorPlay} title="Stream Preview">
      <div className="relative aspect-video max-h-[52vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#53fc18_0%,#22d3ee_40%,#53fc18_75%,#166534_100%)]" />
        <span className="absolute inset-0 grid select-none place-items-center text-center text-7xl font-black leading-none tracking-tighter text-black/85">
          OFF-
          <br />
          LINE
        </span>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-md bg-black/90 px-5 py-3">
          <Badge className="rounded-sm bg-white font-black text-black">
            OFFLINE
          </Badge>
          <span className="whitespace-nowrap text-lg font-bold text-white">
            {mockChannel.slug} is offline
          </span>
        </div>
      </div>
    </PanelCard>
  );
}
