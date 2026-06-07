import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { CalendarClock } from "lucide-react";
import type { JournalistTaskResponse } from "@/services/journalistTask";
import { STATUS_LABELS } from "@/lib/tasks-types";
import { StatusBadge, PriorityBadge } from "./badges";

const STATUS_COLORS: Record<number, string> = {
  0: "var(--muted-foreground)", // Pending
  1: "var(--info)", // Accepted
  2: "var(--primary)", // In Progress
  3: "var(--chart-5)", // Submitted For Review
  4: "var(--warning)", // Needs Revision
  5: "var(--success)", // Approved
  6: "var(--destructive)", // Rejected
  7: "var(--success)", // Completed
  8: "var(--muted-foreground)", // Cancelled
};

// Use statuses that make sense for the chart
const RELEVANT_STATUSES = [0, 1, 2, 3, 4, 7];

export function BottomWidgets({ tasks }: { tasks: JournalistTaskResponse[] }) {
  const statusData = RELEVANT_STATUSES.map((s) => ({
    name: STATUS_LABELS[s].replace("Submitted For Review", "Submitted"),
    value: tasks.filter((t) => t.status === s).length,
    status: s,
  }));

  const upcoming = [...tasks]
    .filter(t => ![7, 8].includes(t.status)) // Exclude completed & cancelled
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold">Tasks by status</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Distribution across your active workload</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{tasks.length} total</span>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {statusData.map((d) => (
                  <Cell key={d.status} fill={`hsl(${STATUS_COLORS[d.status]})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold">Upcoming deadlines</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Sorted by closest due date</p>
          </div>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </div>
        <ul className="mt-4 space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-8 text-center">No upcoming deadlines</p>
          ) : (
            upcoming.map((t) => {
              const d = new Date(t.deadline);
              const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const dayLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`;
              return (
                <li key={t.id} className="group flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-accent/40">
                  <div className="flex h-10 w-12 flex-col items-center justify-center rounded-lg bg-muted text-center">
                    <span className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                    <span className="text-sm font-semibold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <span className={"shrink-0 text-xs font-medium tabular-nums " + (days < 0 ? "text-destructive" : days <= 2 ? "text-[var(--warning)]" : "text-muted-foreground")}>
                    {dayLabel}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}