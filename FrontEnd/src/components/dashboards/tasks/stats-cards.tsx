import {
  ListChecks,
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalistTaskResponse } from "@/services/journalistTask";

interface Stat {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
}

export function StatsCards({ tasks }: { tasks: JournalistTaskResponse[] }) {
  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 0).length,
    in_progress: tasks.filter((t) => t.status === 2).length,
    submitted: tasks.filter((t) => t.status === 3).length,
    completed: tasks.filter((t) => t.status === 7).length,
    needs_revision: tasks.filter((t) => t.status === 4).length,
  };

  const stats: Stat[] = [
    { key: "total", label: "Total Tasks", count: counts.total, icon: ListChecks, accent: "from-primary/15 to-primary/0", iconBg: "bg-primary/10 text-primary" },
    { key: "pending", label: "Pending", count: counts.pending, icon: Clock, accent: "from-muted-foreground/10 to-transparent", iconBg: "bg-muted text-muted-foreground" },
    { key: "in_progress", label: "In Progress", count: counts.in_progress, icon: Loader2, accent: "from-info/15 to-transparent", iconBg: "bg-info/10 text-info" },
    { key: "submitted", label: "Submitted", count: counts.submitted, icon: Send, accent: "from-chart-5/15 to-transparent", iconBg: "bg-chart-5/10 text-chart-5" },
    { key: "completed", label: "Completed", count: counts.completed, icon: CheckCircle2, accent: "from-success/15 to-transparent", iconBg: "bg-success/10 text-success" },
    { key: "needs_revision", label: "Needs Revision", count: counts.needs_revision, icon: RefreshCw, accent: "from-warning/20 to-transparent", iconBg: "bg-warning/15 text-[var(--warning)]" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s, i) => (
        <div
          key={s.key}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", s.accent)} />
          <div className="relative flex items-start justify-between">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", s.iconBg)}>
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            <div className="h-1 w-8 rounded-full bg-foreground/5 group-hover:bg-foreground/10" />
          </div>
          <div className="relative mt-4">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{s.count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}