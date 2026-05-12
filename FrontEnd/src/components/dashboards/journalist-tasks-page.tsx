import { useEffect, useState, useCallback } from "react";
import { journalistTaskService } from "@/services/journalistTask";
import type { JournalistTaskResponse } from "@/services/journalistTask";
import { StatsCards } from "./tasks/stats-cards";
import { TasksTable } from "./tasks/tasks-table";
import { BottomWidgets } from "./tasks/bottom-widgets";
import { TaskDetailsPanel } from "./tasks/task-details-panel";
import type { User } from "@/lib/tasks-types";

interface Props {
  user: User;
  refreshKey?: number;
  onRefresh?: () => void;
}

export function JournalistTasksPage({ user, refreshKey, onRefresh }: Props) {
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
      if (onRefresh) onRefresh();
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
        <div className="md:hidden">
          <h1 className="text-xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-xs text-muted-foreground">
            Assignments from your partner organizations
          </p>
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
          if (onRefresh) onRefresh();
        }}
        user={user}
      />
    </div>
  );
}
