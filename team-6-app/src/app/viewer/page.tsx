import ChatPanel from "@/components/shared/ChatPanel";
import TopNav from "@/components/shared/TopNav";
import AboutPanel from "@/components/viewer/AboutPanel";
import SidebarBrowse from "@/components/viewer/SidebarBrowse";
import StreamInfoBar from "@/components/viewer/StreamInfoBar";
import VideoPlayer from "@/components/viewer/VideoPlayer";

/** Kick stream page clone. MomentsGraph (T6) and ChaptersBar (T7) plug into the video area later. */
export default function ViewerPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopNav variant="viewer" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <SidebarBrowse />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <VideoPlayer />
          <StreamInfoBar />
          <AboutPanel />
        </main>
        <aside className="hidden w-[340px] shrink-0 border-l border-border md:block">
          <ChatPanel variant="viewer" />
        </aside>
      </div>
    </div>
  );
}
