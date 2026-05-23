import { Search, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Journalist, priorityList, statusList, type Role } from "@/lib/tasks-mock";

export interface Filters {
  q: string;
  status: string;
  priority: string;
  journalist: string;
}

interface Props {
  role: Role;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onCreate: () => void;
  onReset: () => void;
  journalists: Journalist[];
}

export function FiltersBar({ role, filters, setFilters, onCreate, onReset, journalists }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search tasks by title or IDâ€¦"
          className="h-9 pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {priorityList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        {role === "Organization" && (
          <Select value={filters.journalist} onValueChange={(v) => setFilters({ ...filters, journalist: v })}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Journalist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All journalists</SelectItem>
              {journalists.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>

        {role === "Organization" && (
          <Button size="sm" onClick={onCreate} className="h-9 gap-1.5">
            <Plus className="h-4 w-4" /> Create Task
          </Button>
        )}
      </div>
    </div>
  );
}
