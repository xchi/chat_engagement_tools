import type { LucideIcon } from "lucide-react";
import { ListFilter, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PanelCardProps {
  icon: LucideIcon;
  title: string;
  /** show the filter icon next to the expand icon (Activity Feed, Mod Actions) */
  filter?: boolean;
  /** extra header actions rendered before the expand icon */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Dashboard card frame: "icon + title" header with expand/filter actions. */
export default function PanelCard({
  icon: Icon,
  title,
  filter = false,
  actions,
  className,
  children,
}: PanelCardProps) {
  return (
    <section
      className={cn("flex flex-col overflow-hidden rounded-lg bg-card", className)}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Icon className="size-4" />
        <h2 className="text-sm font-bold">{title}</h2>
        <div className="ml-auto flex items-center gap-1">
          {actions}
          {filter && (
            <Button variant="ghost" size="icon-sm" aria-label={`Filter ${title}`}>
              <ListFilter />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label={`Expand ${title}`}>
            <Maximize2 />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
