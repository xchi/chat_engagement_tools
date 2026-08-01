/**
 * VideoPlayer — the mocked "live" video area. T3 replaces the placeholder
 * with a looping local file presented as live (LIVE badge, elapsed timer,
 * jittering viewer count), custom PlayerControls, and the stream clock.
 * MomentsGraph (T6) and ChaptersBar (T7) overlay the controls' seek bar.
 */
export default function VideoPlayer() {
  return (
    <div className="relative flex aspect-video max-h-[70vh] w-full items-center justify-center bg-black">
      <p className="text-sm text-muted-foreground">
        Mocked live video — coming in T3
      </p>
    </div>
  );
}
