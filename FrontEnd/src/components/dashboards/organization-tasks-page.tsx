import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { StatsCards } from "../tasks/StatsCards";
import { FiltersBar, type Filters } from "../tasks/FiltersBar";
import { TasksTable } from "../tasks/TasksTable";
import { TaskDetailsPanel } from "../tasks/TaskDetailsPanel";
import { AnalyticsWidgets } from "../tasks/AnalyticsWidgets";
import { organizationTaskService, type OrganizationTaskResponse, type OrganizationTaskDashboardResponse } from '@/services/organizationTask';
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks-mock";

const defaultFilters: Filters = { q: "", status: "all", priority: "all", journalist: "all" };

const PRIORITY_MAP: Record<number, TaskPriority> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

const STATUS_MAP: Record<number, TaskStatus> = {
  0: "Pending",
  1: "Accepted",
  2: "In Progress",
  3: "Submitted for Review",
  4: "Needs Revision",
  5: "Completed",
  6: "Cancelled",
};

function mapTaskResponse(res: OrganizationTaskResponse): Task {
  return {
    id: res.id,
    title: res.title,
    description: res.description || "",
    journalistId: res.assignedJournalistId || "",
    priority: PRIORITY_MAP[res.priority] ?? "Medium",
    status: STATUS_MAP[res.status] ?? "Pending",
    deadline: res.deadline,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    progress: res.status === 5 ? 100 : res.status === 2 ? 50 : res.status === 3 ? 90 : res.status === 4 ? 75 : 0,
    comments: res.comments?.map((c) => ({
      id: c.id,
      author: c.authorName,
      avatar: c.authorName?.slice(0, 2).toUpperCase() || "?",
      text: c.content,
      time: new Date(c.createdAt).toLocaleDateString(),
    })) || [],
  };
}

export function OrganizationTasksPage({ 
  user, 
  journalists, 
  refreshKey, 
  onRefresh 
}: { 
  user: any; 
  journalists: any[]; 
  refreshKey?: number; 
  onRefresh?: () => void; 
}) {
  const role = "Organization";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrganizationTaskDashboardResponse | null>(null);

    const mappedJournalists = useMemo(() => {
    return journalists.map((j) => {
      const perf = stats?.journalistPerformance?.find((p) => p.journalistId === j.id);
      return {
        id: j.id,
        name: j.name || "Unknown Journalist",
        avatar: (j.name || "U").slice(0, 2).toUpperCase(),
        beat: "Journalist",
        completed: perf?.completed || 0,
        onTime: perf ? Math.round(perf.completionRate * 100) : 100
      };
    });
  }, [journalists, stats]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await organizationTaskService.getTasks();
      const mappedTasks = data.map(mapTaskResponse);
      setTasks(mappedTasks);
      const dash = await organizationTaskService.getDashboard();
      setStats(dash);
      
      if (selected) {
        const updatedSelected = mappedTasks.find((t) => t.id === selected.id);
        setSelected(updatedSelected || null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.organizationId, refreshKey]);

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((t) => 
        (`${t.title} ${t.description}`).toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q)
      );
    }
    
    if (filters.status !== "all") {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters.priority !== "all") {
      list = list.filter((t) => t.priority === filters.priority);
    }
    if (filters.journalist !== "all") {
      list = list.filter((t) => t.journalistId === filters.journalist);
    }
    return list;
  }, [filters, tasks]);

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] w-full bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 space-y-5 p-4 md:p-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1 text-sm">Editorial assignments and production pipeline</p>
          </div>

          <StatsCards tasks={tasks} />

          <FiltersBar
            journalists={mappedJournalists}
            role={role}
            filters={filters}
            setFilters={setFilters}
            onCreate={() => toast.success("Create task dialog to be implemented")}
            onReset={() => setFilters(defaultFilters)}
          />

          <TasksTable
            journalists={mappedJournalists}
            tasks={visibleTasks}
            loading={loading}
            selectedId={selected?.id}
            onSelect={(t) => { setSelected(t); setPanelOpen(true); }}
            role={role}
          />

          <AnalyticsWidgets tasks={tasks} journalists={mappedJournalists} />
        </main>
      </div>

      <TaskDetailsPanel
        journalists={mappedJournalists} 
        task={selected} 
        open={panelOpen} 
        onClose={() => setPanelOpen(false)} 
        role={role} 
        onUpdate={() => {
           fetchTasks();
           if(onRefresh) onRefresh();
        }}
      />
      <Toaster position="top-right" richColors />
    </div>
  );
}
