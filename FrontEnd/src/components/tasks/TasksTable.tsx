import { MoreHorizontal, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type Journalist, priorityStyle, statusStyle, type Role, type Task } from "@/lib/tasks-mock";

interface Props {
  tasks: Task[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect: (t: Task) => void;
  role: Role;
  journalists: Journalist[];
  onEdit?: (t: Task) => void;
  onReassign?: (t: Task) => void;
  onDelete?: (t: Task) => void;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function deadlineTone(deadline: string, status: Task["status"]) {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "Completed" || status === "Cancelled") return "text-muted-foreground";
  if (deadline < today) return "text-destructive font-medium";
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days <= 3) return "text-warning-foreground dark:text-warning font-medium";
  return "";
}

export function TasksTable({ 
  tasks, 
  loading, 
  selectedId, 
  onSelect, 
  role, 
  journalists,
  onEdit,
  onReassign,
  onDelete
}: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-semibold">No tasks found</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Try adjusting your filters, or create a new assignment to populate your queue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[34%]">Task</TableHead>
              <TableHead>Journalist</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const j = journalists.find(x => x.id === t.journalistId) || { id: "unknown", name: "Unassigned", avatar: "?", beat: "Unknown", completed: 0, onTime: 0 };
              const selected = selectedId === t.id;
              return (
                <TableRow
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selected && "bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <TableCell>
                    <div className="font-medium leading-snug">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-semibold">
                          {j.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm">{j.name}</div>
                        <div className="text-[11px] text-muted-foreground">{j.beat}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-medium", priorityStyle[t.priority])}>{t.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-medium whitespace-nowrap", statusStyle[t.status])}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-sm whitespace-nowrap", deadlineTone(t.deadline, t.status))}>{fmt(t.deadline)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{fmt(t.createdAt)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onSelect(t)}>View details</DropdownMenuItem>
                        {role === "Organization" ? (
                          <>
                            <DropdownMenuItem onClick={() => onEdit?.(t)}>Edit task</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReassign?.(t)}>Reassign</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(t)}>Delete</DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem>Add comment</DropdownMenuItem>
                            <DropdownMenuItem>Submit for review</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {tasks.map((t) => {
          const j = journalists.find(x => x.id === t.journalistId) || { id: "unknown", name: "Unassigned", avatar: "?", beat: "Unknown", completed: 0, onTime: 0 };
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="block w-full p-4 text-left hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t.id}</div>
                  <div className="font-medium leading-snug">{t.title}</div>
                </div>
                <Badge variant="outline" className={cn("shrink-0", priorityStyle[t.priority])}>{t.priority}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{j.avatar}</AvatarFallback></Avatar>
                  <span className="truncate text-sm">{j.name}</span>
                </div>
                <Badge variant="outline" className={cn("shrink-0", statusStyle[t.status])}>{t.status}</Badge>
              </div>
              <div className={cn("mt-2 text-xs", deadlineTone(t.deadline, t.status))}>Due {fmt(t.deadline)}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground text-xs">
          Showing <span className="font-medium text-foreground">1â€“{tasks.length}</span> of {tasks.length}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8 px-3 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground">1</Button>
          <Button variant="outline" size="sm" className="h-8 px-3">2</Button>
          <Button variant="outline" size="sm" className="h-8 px-3">3</Button>
          <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
