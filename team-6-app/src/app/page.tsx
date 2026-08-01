import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Team 6 — <span className="text-primary">Kick Mock</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mocked Kick.com pages for building chat-engagement features.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/viewer"
          className="flex h-12 w-56 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Viewer page
        </Link>
        <Link
          href="/creator"
          className="flex h-12 w-56 items-center justify-center rounded-md border border-border bg-card font-semibold transition-colors hover:bg-accent"
        >
          Creator dashboard
        </Link>
      </div>
    </main>
  );
}
