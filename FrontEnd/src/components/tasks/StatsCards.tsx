import { ListChecks, Clock3, Loader2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import type { Task } from "@/lib/tasks-mock";
import { cn } from "@/lib/utils";

const cards = [
  { key: "total", label: "Total Tasks", icon: ListChecks, tone: "bg-primary/10 text-primary" },
  { key: "pending", label: "Pending", icon: Clock3, tone: "bg-muted text-muted-foreground" },
  { key: "inProgress", label: "In Progress", icon: Loader2, tone: "bg-info/15 text-info" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "bg-success/15 text-success" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, tone: "bg-destructive/15 text-destructive" },
  { key: "review", label: "Under Review", icon: Eye, tone: "bg-warning/20 text-warning-foreground dark:text-warning" },
] as const;

export function StatsCards({ tasks }: { tasks: Task[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "Pending").length,
    inProgress: tasks.filter((t) => t.status === "In Progress" || t.status === "Accepted").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
    overdue: tasks.filter((t) => t.deadline < today && t.status !== "Completed" && t.status !== "Cancelled").length,
    review: tasks.filter((t) => t.status === "Submitted for Review" || t.status === "Needs Revision").length,
  };
  const trends = ["+12%", "−4%", "+8%", "+15%", "−2%", "+6%"];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const value = counts[c.key];
        return (
          <div
            key={c.key}
            className="group rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.tone)}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{trends[i]}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}
