import { useEffect, useState, useCallback } from "react";
import { journalistTaskService } from "@/services/journalistTask";
import type { JournalistTaskResponse, TaskDraft } from "@/services/journalistTask";
import { Button } from "@/components/ui/button";
import { RefreshCw, Paperclip, ArrowRight } from "lucide-react";
import { StatsCards } from "./tasks/stats-cards";
import { TasksTable } from "./tasks/tasks-table";
import { BottomWidgets } from "./tasks/bottom-widgets";
import { TaskDetailsPanel } from "./tasks/task-details-panel";
import type { User } from "@/lib/tasks-types";
import { StatusBadge } from "./tasks/badges";
import { useNavigate } from "react-router-dom";

interface Props {
  user: User;
  refreshKey?: number;
}

export function JournalistTasksPage({ user, refreshKey }: Props) {
  const [tasks, setTasks] = useState<JournalistTaskResponse[]>([]);
  const [draftSummaries, setDraftSummaries] = useState<Array<{ task: JournalistTaskResponse; drafts: TaskDraft[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();

  const loadDrafts = useCallback(async (taskList: JournalistTaskResponse[]) => {
    const summaries = await Promise.all(
      taskList.map(async (task) => {
        const drafts = await journalistTaskService.getTaskDrafts(task.id).catch(() => []);
        return { task, drafts };
      })
    );

    setDraftSummaries(summaries.filter((entry) => entry.drafts.length > 0));
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const t = await journalistTaskService.getTasks();
      setTasks(t);
      await loadDrafts(t);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  }, [loadDrafts]);

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

        {draftSummaries.length > 0 && (
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-semibold">Drafted Tasks</h2>
                <p className="text-xs text-muted-foreground">Resume saved drafts from the tasks you are working on.</p>
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {draftSummaries.map(({ task, drafts }) => {
                const latestDraft = drafts[0];
                return (
                  <div key={task.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {drafts.length} saved draft{drafts.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {latestDraft.content || "Draft content is empty."}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        Updated {new Date(latestDraft.updatedAt || latestDraft.createdAt || task.updatedAt).toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/create-article?taskId=${task.id}&draftId=${latestDraft.id}`)}>
                        Resume <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        
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
