import { ChevronRight, SlidersHorizontal, SquareArrowOutUpRight } from "lucide-react";

import PanelCard from "@/components/creator/PanelCard";
import { Switch } from "@/components/ui/switch";

interface ActionRowProps {
  label: string;
  /** current value shown muted before the chevron (e.g. "Off") */
  value?: string;
  /** external-link icon instead of chevron (AI Chat Moderation) */
  external?: boolean;
}

function ActionRow({ label, value, external = false }: ActionRowProps) {
  return (
    <button className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-accent">
      <span className="flex-1 text-left">{label}</span>
      {value && <span className="text-muted-foreground">{value}</span>}
      {external ? (
        <SquareArrowOutUpRight className="size-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}

function SwitchRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2.5 text-sm">
      <span className="flex-1">{label}</span>
      <Switch aria-label={label} />
    </div>
  );
}

/** "Channel Actions" card: chat access / chat options. Toggles are cosmetic in the mock. */
export default function ChannelActionsPanel() {
  return (
    <PanelCard icon={SlidersHorizontal} title="Channel Actions">
      <div className="space-y-4 p-2">
        <section>
          <h3 className="px-2 pb-1 text-sm font-bold">Chat access</h3>
          <ActionRow label="Account age" value="Off" />
          <ActionRow label="Followers only" value="Off" />
          <SwitchRow label="Subscribers only" />
        </section>

        <section>
          <h3 className="px-2 pb-1 text-sm font-bold">Chat options</h3>
          <SwitchRow label="Emotes only" />
          <ActionRow label="Slow mode" value="Off" />
          <ActionRow label="Banned words" />
          <ActionRow label="AI Chat Moderation" external />
        </section>

        <section>
          <h3 className="px-2 pb-1 text-sm font-bold">Channel options</h3>
        </section>
      </div>
    </PanelCard>
  );
}
