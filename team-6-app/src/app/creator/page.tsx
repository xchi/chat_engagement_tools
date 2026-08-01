import {
  Camera,
  FileText,
  Grip,
  Info,
  MessageSquareText,
  Pencil,
  Radio,
  Wrench,
  Zap,
} from "lucide-react";

import ActivityFeed from "@/components/creator/ActivityFeed";
import ChannelActionsPanel from "@/components/creator/ChannelActionsPanel";
import DashboardSidebar from "@/components/creator/DashboardSidebar";
import ModActions from "@/components/creator/ModActions";
import SessionInfoBar from "@/components/creator/SessionInfoBar";
import StreamInfoCard from "@/components/creator/StreamInfoCard";
import StreamPreview from "@/components/creator/StreamPreview";
import StreamPulsePanel from "@/components/creator/StreamPulsePanel";
import ChatPanel from "@/components/shared/ChatPanel";
import TopNav from "@/components/shared/TopNav";
import { Button } from "@/components/ui/button";

const RAIL_ICONS = [
  { icon: Info, label: "Info" },
  { icon: Pencil, label: "Edit" },
  { icon: Camera, label: "Clips" },
  { icon: Zap, label: "Activity" },
  { icon: FileText, label: "Logs" },
  { icon: MessageSquareText, label: "Chat" },
  { icon: Radio, label: "Stream" },
  { icon: Wrench, label: "Settings" },
  { icon: Grip, label: "Widgets" },
];

/** Kick creator dashboard clone with StreamPulsePanel in the right column. */
export default function CreatorPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopNav variant="creator" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
          <DashboardSidebar />
        </aside>

        <main className="min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
          <SessionInfoBar />
          <StreamPreview />
          <div className="grid gap-3 md:grid-cols-2">
            <ActivityFeed />
            <ModActions />
          </div>
        </main>

        <aside className="hidden w-[320px] shrink-0 border-l border-border md:block">
          <ChatPanel variant="creator" />
        </aside>

        <aside className="hidden w-[300px] shrink-0 space-y-3 overflow-y-auto border-l border-border p-3 xl:block">
          <StreamPulsePanel />
          <StreamInfoCard />
          <ChannelActionsPanel />
        </aside>

        <aside className="hidden shrink-0 flex-col items-center gap-1 border-l border-border py-3 pl-1 pr-1 xl:flex">
          {RAIL_ICONS.map(({ icon: Icon, label }) => (
            <Button key={label} variant="ghost" size="icon" aria-label={label}>
              <Icon />
            </Button>
          ))}
        </aside>
      </div>
    </div>
  );
}
