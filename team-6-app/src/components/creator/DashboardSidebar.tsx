import {
  ChartNoAxesColumn,
  ChevronDown,
  Clapperboard,
  Gift,
  Link2,
  Radio,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  expandable?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Radio, label: "Stream", active: true },
  { icon: Link2, label: "Stream URL & Key" },
  { icon: ChartNoAxesColumn, label: "Revenue" },
  { icon: Trophy, label: "Achievements" },
  { icon: Clapperboard, label: "Studio", expandable: true },
  { icon: ChartNoAxesColumn, label: "Analytics", expandable: true },
  { icon: Wrench, label: "Moderation" },
  { icon: Users, label: "Community", expandable: true },
  { icon: Gift, label: "Drops & rewards" },
];

/** Creator dashboard left nav. Only "Stream" is a real page in this mock. */
export default function DashboardSidebar() {
  return (
    <nav className="h-full overflow-y-auto p-2">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, active, expandable }) => (
          <li key={label}>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent",
                active && "bg-accent"
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {expandable && (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
