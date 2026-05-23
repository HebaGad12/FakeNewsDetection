import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS, priorityTone, statusTone } from "@/lib/tasks-types";

const toneClasses: Record<string, string> = {
  default: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  info: "bg-[color-mix(in_oklab,var(--info)_15%,transparent)] text-[var(--info)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--info)_30%,transparent)]",
  success: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[var(--success)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--success)_30%,transparent)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_22%,transparent)] text-[oklch(0.42_0.12_75)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--warning)_40%,transparent)]",
  destructive: "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[var(--destructive)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--destructive)_30%,transparent)]",
};

export function StatusBadge({ status, className }: { status: number; className?: string }) {
  const tone = statusTone(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityChip({ priority, className }: { priority: number; className?: string }) {
  const tone = priorityTone(priority);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", toneClasses[tone], className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function DeadlinePill({ deadline, status }: { deadline: string; status: number }) {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const done = status === 6 || status === 5 || status === 8;
  const overdue = diffMs < 0 && !done;
  const soon = diffDays <= 1 && !done && !overdue;
  const label = overdue
    ? `Overdue ${Math.abs(diffDays)}d`
    : diffDays === 0
      ? "Due today"
      : diffDays < 0
        ? d.toLocaleDateString()
        : `Due in ${diffDays}d`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
        overdue && "bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[var(--destructive)]",
        soon && "bg-[color-mix(in_oklab,var(--warning)_22%,transparent)] text-[oklch(0.42_0.12_75)]",
        !overdue && !soon && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
