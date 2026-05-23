import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Journalist, statusList, priorityList, type Task } from "@/lib/tasks-mock";
import { CalendarClock, TrendingUp } from "lucide-react";

const STATUS_COLORS = ["oklch(0.55 0.04 258)", "oklch(0.65 0.13 230)", "var(--primary)", "oklch(0.78 0.15 75)", "var(--destructive)", "oklch(0.65 0.15 155)", "oklch(0.5 0.02 258)"];
const PRIORITY_COLORS = ["oklch(0.6 0.02 258)", "oklch(0.65 0.13 230)", "oklch(0.78 0.15 75)", "var(--destructive)"];

export function AnalyticsWidgets({ tasks, journalists }: { tasks: Task[], journalists: Journalist[] }) {
  const byStatus = statusList.map((s) => ({ name: s, value: tasks.filter((t) => t.status === s).length }));
  const byPriority = priorityList.map((p) => ({ name: p, value: tasks.filter((t) => t.priority === p).length }));
  const upcoming = [...tasks]
    .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card title="Tasks by Status">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {byStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Legend items={byStatus.map((s, i) => ({ name: s.name, color: STATUS_COLORS[i] }))} />
      </Card>

      <Card title="Tasks by Priority">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPriority} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {byPriority.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Upcoming Deadlines" icon={<CalendarClock className="h-3.5 w-3.5" />}>
        {upcoming.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No upcoming deadlines</div>
        ) : (
          <ul className="space-y-2.5">
            {upcoming.map((t) => {
              const days = Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000);
              return (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${days < 0 ? "bg-destructive/15 text-destructive" : days <= 3 ? "bg-warning/20 text-warning-foreground dark:text-warning" : "bg-muted text-muted-foreground"}`}>
                    {days < 0 ? `${-days}d late` : days === 0 ? "Today" : `${days}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Top Journalists" icon={<TrendingUp className="h-3.5 w-3.5" />}>
        <ul className="space-y-3">
          {journalists.slice(0, 4).sort((a, b) => b.completed - a.completed).map((j) => (
            <li key={j.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-accent">{j.avatar}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{j.name}</div>
                <div className="text-[11px] text-muted-foreground">{j.beat} Â· {j.completed} pubs</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums text-success">{j.onTime}%</div>
                <div className="text-[10px] text-muted-foreground">on-time</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const tipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((i) => (
        <div key={i.name} className="flex items-center gap-1.5 truncate">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: i.color }} />
          <span className="truncate">{i.name}</span>
        </div>
      ))}
    </div>
  );
}
