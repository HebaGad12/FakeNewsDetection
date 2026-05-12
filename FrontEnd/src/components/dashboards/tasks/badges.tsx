import { cn } from "@/lib/utils";
import { STATUS_LABELS, PRIORITY_LABELS, statusTone, priorityTone } from "@/lib/tasks-types";

// Instead of string literals, we use numbers based on our API map.
const toneClasses: Record<string, string> = {
  default: "bg-secondary text-secondary-foreground ring-border",
  muted: "bg-muted text-muted-foreground ring-border",
  info: "bg-[color-mix(in_oklab,var(--info)_15%,transparent)] text-[var(--info)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--info)_30%,transparent)]",
  success: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[var(--success)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--success)_30%,transparent)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_22%,transparent)] text-[oklch(0.42_0.12_75)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--warning)_40%,transparent)]",
  destructive: "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[var(--destructive)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--destructive)_30%,transparent)]",
};

export function StatusBadge({ status, className }: { status: number; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: number; className?: string }) {
  const tone = priorityTone(priority);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}