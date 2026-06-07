import { useEffect, useState, useCallback } from "react";
import { journalistTaskService } from "@/services/journalistTask";
import type { JournalistTaskResponse } from "@/services/journalistTask";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { StatsCards } from "./tasks/stats-cards";
import { TasksTable } from "./tasks/tasks-table";
import { BottomWidgets } from "./tasks/bottom-widgets";
import { TaskDetailsPanel } from "./tasks/task-details-panel";
import type { User } from "@/lib/tasks-types";

interface Props {
  user: User;
  refreshKey?: number;
}

export function JournalistTasksPage({ user, refreshKey }: Props) {
  const [tasks, setTasks] = useState<JournalistTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const t = await journalistTaskService.getTasks();
      setTasks(t);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [user.id, refreshKey, loadTasks]);

  const handleSelect = (t: JournalistTaskResponse) => {
    setSelectedTaskId(t.id);
    setPanelOpen(true);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: number) => {
    try {
      await journalistTaskService.updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main className="flex-1 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">My Tasks</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Assignments from your partner organizations
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
        </div>

        <StatsCards tasks={tasks} />
        
        <TasksTable 
          tasks={tasks} 
          selectedTaskId={selectedTaskId} 
          onSelect={handleSelect} 
          onUpdateStatus={handleUpdateStatus}
          user={user} 
        />
        
        <BottomWidgets tasks={tasks} />
      </main>

      <TaskDetailsPanel
        taskId={selectedTaskId}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onChanged={() => {
          loadTasks();
        }}
        user={user}
      />
    </div>
  );
}
