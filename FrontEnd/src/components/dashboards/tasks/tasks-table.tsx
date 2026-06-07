import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, MoreHorizontal, CalendarDays, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "./badges";
import { cn } from "@/lib/utils";
import type { JournalistTaskResponse } from "@/services/journalistTask";
import type { User } from "@/lib/tasks-types";

interface Props {
  tasks: JournalistTaskResponse[];
  selectedTaskId: string | null;
  onSelect: (task: JournalistTaskResponse) => void;
  onUpdateStatus?: (taskId: string, status: number) => void;
  user: User;
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  if (!name) return "O";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function TasksTable({ tasks, selectedTaskId, onSelect, onUpdateStatus, user }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [deadline, setDeadline] = useState<string>("all");
  const navigate = useNavigate();

  const handleAcceptTask = (taskId: string) => {
    if (onUpdateStatus) {
      onUpdateStatus(taskId, 1); // Status 1 = Accepted
      // Navigate to create article page with taskId
      navigate(`/create-article?taskId=${taskId}`);
    }
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (status !== "all" && t.status.toString() !== status) return false;
      if (priority !== "all" && t.priority.toString() !== priority) return false;
      if (deadline !== "all") {
        const d = new Date(t.deadline).getTime();
        const now = Date.now();
        const days = (d - now) / (1000 * 60 * 60 * 24);
        if (deadline === "week" && days > 7) return false;
        if (deadline === "month" && days > 30) return false;
        if (deadline === "overdue" && days >= 0) return false;
      }
      return true;
    });
  }, [tasks, query, status, priority, deadline]);

  const reset = () => {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setDeadline("all");
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="0">Pending</SelectItem>
            <SelectItem value="1">Accepted</SelectItem>
            <SelectItem value="2">In Progress</SelectItem>
            <SelectItem value="3">Submitted</SelectItem>
            <SelectItem value="4">Needs Revision</SelectItem>
            <SelectItem value="7">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="0">Low</SelectItem>
            <SelectItem value="1">Medium</SelectItem>
            <SelectItem value="2">High</SelectItem>
            <SelectItem value="3">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deadline} onValueChange={setDeadline}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Deadline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="week">Within a week</SelectItem>
            <SelectItem value="month">Within a month</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={reset} className="h-9 gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Task</th>
              <th className="px-3 py-3 font-medium">Priority</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Deadline</th>
              <th className="px-3 py-3 font-medium">Assigned by</th>
              <th className="px-3 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="mx-auto max-w-sm">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No tasks match your filters</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try adjusting search or resetting filters.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={reset}>Reset filters</Button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className={cn(
                    "group cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40",
                    selectedTaskId === task.id && "bg-accent/60",
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground line-clamp-1 group-hover:text-primary">
                        {task.title}
                      </span>
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {task.id.split("-")[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-3 py-4"><StatusBadge status={task.status} /></td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDeadline(task.deadline)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                          {initials(task.organizationName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs line-clamp-1 max-w-[120px]">{task.organizationName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelect(task)}>View details</DropdownMenuItem>
                        {task.status === 0 && (
                          <DropdownMenuItem onClick={() => handleAcceptTask(task.id)} className="text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Accept Task
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}