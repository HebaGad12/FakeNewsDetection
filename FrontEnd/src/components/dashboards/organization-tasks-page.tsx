import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { StatsCards } from "../tasks/StatsCards";
import { FiltersBar, type Filters } from "../tasks/FiltersBar";
import { TasksTable } from "../tasks/TasksTable";
import { TaskDetailsPanel } from "../tasks/TaskDetailsPanel";
import { AnalyticsWidgets } from "../tasks/AnalyticsWidgets";
import { organizationTaskService, type OrganizationTaskResponse, type OrganizationTaskDashboardResponse } from '@/services/organizationTask';
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks-mock";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  5: "Approved",
  6: "Rejected",
  7: "Completed",
  8: "Cancelled",
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
    progress: res.status === 7 ? 100 : res.status === 5 ? 95 : res.status === 3 ? 90 : res.status === 4 ? 75 : res.status === 2 ? 50 : res.status === 1 ? 25 : 0,
    comments: res.comments?.map((c) => ({
      id: c.id,
      author: c.authorName,
      avatar: c.authorName?.slice(0, 2).toUpperCase() || "?",
      text: c.content,
      time: new Date(c.createdAt).toLocaleDateString(),
    })) || [],
  };
}

function getValidTransitions(status: TaskStatus): { value: number; label: string }[] {
  switch (status) {
    case "Submitted for Review":
      return [
        { value: 5, label: "Approved" },
        { value: 6, label: "Rejected" },
        { value: 4, label: "Needs Revision" },
      ];
    case "Approved":
      return [
        { value: 7, label: "Completed" },
      ];
    case "Pending":
    case "Accepted":
    case "In Progress":
      return [
        { value: 8, label: "Cancelled" },
      ];
    default:
      return [];
  }
}

function getErrorMessage(err: any, defaultMsg: string): string {
  if (err.response?.data) {
    if (typeof err.response.data === "string") return err.response.data;
    if (err.response.data.message) return err.response.data.message;
  }
  return defaultMsg;
}

export function OrganizationTasksPage({ 
  user, 
  journalists, 
  refreshKey, 
  onRefresh,
  onCreate,
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  journalists: any[]; 
  refreshKey?: number; 
  onRefresh?: () => void; 
  onCreate?: () => void;
}) {
  const role = "Organization";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrganizationTaskDashboardResponse | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reassigningTask, setReassigningTask] = useState<Task | null>(null);
  const [changingStatusTask, setChangingStatusTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Edit form states
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("1");
  const [editDeadline, setEditDeadline] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reassign form states
  const [reassignJournalistId, setReassignJournalistId] = useState("");
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Status change form states
  const [newStatusVal, setNewStatusVal] = useState("");
  const [submittingStatusChange, setSubmittingStatusChange] = useState(false);

  // Delete form states
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setEditTitle(editingTask.title);
      setEditDescription(editingTask.description);
      const prioMap: Record<string, string> = { "Low": "0", "Medium": "1", "High": "2", "Critical": "3" };
      setEditPriority(prioMap[editingTask.priority] || "1");
      setEditDeadline(editingTask.deadline ? editingTask.deadline.slice(0, 10) : "");
    }
  }, [editingTask]);

  useEffect(() => {
    if (reassigningTask) {
      setReassignJournalistId(reassigningTask.journalistId || "none");
    }
  }, [reassigningTask]);

  useEffect(() => {
    if (changingStatusTask) {
      const transitions = getValidTransitions(changingStatusTask.status);
      if (transitions.length > 0) {
        setNewStatusVal(transitions[0].value.toString());
      } else {
        setNewStatusVal("");
      }
    }
  }, [changingStatusTask]);

  const handleEditSubmit = async () => {
    if (!editingTask) return;
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editDeadline) {
      toast.error("Deadline is required");
      return;
    }
    setSubmittingEdit(true);
    try {
      await organizationTaskService.updateTask(editingTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: parseInt(editPriority),
        deadline: new Date(editDeadline).toISOString(),
      });
      toast.success("Task updated successfully");
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to update task"));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleReassignSubmit = async () => {
    if (!reassigningTask) return;
    setSubmittingReassign(true);
    try {
      const prioMap: Record<string, number> = { "Low": 0, "Medium": 1, "High": 2, "Critical": 3 };
      const priorityVal = prioMap[reassigningTask.priority] ?? 1;

      await organizationTaskService.updateTask(reassigningTask.id, {
        title: reassigningTask.title,
        description: reassigningTask.description,
        priority: priorityVal,
        deadline: reassigningTask.deadline,
        assignedJournalistId: reassignJournalistId === "none" ? "" : reassignJournalistId,
      } as any);
      toast.success("Task reassigned successfully");
      setReassigningTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to reassign task"));
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!changingStatusTask || !newStatusVal) return;
    setSubmittingStatusChange(true);
    try {
      await organizationTaskService.updateTaskStatus(changingStatusTask.id, parseInt(newStatusVal));
      toast.success("Task status updated");
      setChangingStatusTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to update status"));
    } finally {
      setSubmittingStatusChange(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingTask) return;

    if (deletingTask.status !== "Pending") {
      toast.error("Only Pending tasks can be deleted. Use 'Change Status' → Cancelled instead.");
      setDeletingTask(null);
      return;
    }

    setSubmittingDelete(true);
    try {
      await organizationTaskService.deleteTask(deletingTask.id);
      toast.success("Task deleted successfully");
      if (selected?.id === deletingTask.id) {
        setSelected(null);
        setPanelOpen(false);
      }
      setDeletingTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to delete task"));
    } finally {
      setSubmittingDelete(false);
    }
  };

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
            onCreate={() => {
              if (onCreate) onCreate();
              else toast.success("Create task dialog to be implemented");
            }}
            onReset={() => setFilters(defaultFilters)}
          />

          <TasksTable
            journalists={mappedJournalists}
            tasks={visibleTasks}
            loading={loading}
            selectedId={selected?.id}
            onSelect={(t) => { setSelected(t); setPanelOpen(true); }}
            role={role}
            onEdit={(t) => setEditingTask(t)}
            onReassign={(t) => setReassigningTask(t)}
            onChangeStatus={(t) => setChangingStatusTask(t)}
            onDelete={(t) => setDeletingTask(t)}
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
        onEdit={(t) => setEditingTask(t)}
        onDelete={(t) => setDeletingTask(t)}
      />

      {/* Edit Task Dialog */}
      <Dialog open={editingTask !== null} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task briefing, priority, or deadline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input 
                id="edit-title"
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="e.g. Investigate transit fare hikes" 
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Brief</Label>
              <Textarea 
                id="edit-desc"
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                rows={4} 
                placeholder="What needs to be reported?" 
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger id="edit-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Low</SelectItem>
                    <SelectItem value="1">Medium</SelectItem>
                    <SelectItem value="2">High</SelectItem>
                    <SelectItem value="3">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-deadline">Deadline</Label>
                <Input 
                  id="edit-deadline"
                  type="date" 
                  value={editDeadline} 
                  onChange={(e) => setEditDeadline(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTask(null)} disabled={submittingEdit}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={submittingEdit}>
              {submittingEdit ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog */}
      <Dialog open={reassigningTask !== null} onOpenChange={(open) => { if (!open) setReassigningTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>Assign this task to another journalist in your newsroom.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="reassign-select">Journalist</Label>
              <Select value={reassignJournalistId} onValueChange={setReassignJournalistId}>
                <SelectTrigger id="reassign-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {mappedJournalists.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReassigningTask(null)} disabled={submittingReassign}>Cancel</Button>
            <Button onClick={handleReassignSubmit} disabled={submittingReassign}>
              {submittingReassign ? "Reassigning..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={changingStatusTask !== null} onOpenChange={(open) => { if (!open) setChangingStatusTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Update the status of this task. Current status: <span className="font-semibold">{changingStatusTask?.status}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {changingStatusTask && getValidTransitions(changingStatusTask.status).length === 0 ? (
              <p className="text-sm text-destructive">No status transitions are currently available for this task status.</p>
            ) : (
              <div>
                <Label htmlFor="status-select">New Status</Label>
                <Select value={newStatusVal} onValueChange={setNewStatusVal}>
                  <SelectTrigger id="status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {changingStatusTask && getValidTransitions(changingStatusTask.status).map((s) => (
                      <SelectItem key={s.value} value={s.value.toString()}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangingStatusTask(null)} disabled={submittingStatusChange}>Cancel</Button>
            <Button 
              onClick={handleStatusChangeSubmit} 
              disabled={submittingStatusChange || !newStatusVal || (changingStatusTask && getValidTransitions(changingStatusTask.status).length === 0)}
            >
              {submittingStatusChange ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={deletingTask !== null} onOpenChange={(open) => { if (!open) setDeletingTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Task</DialogTitle>
            <DialogDescription asChild>
              <div>
                {deletingTask && deletingTask.status !== "Pending" ? (
                  <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-semibold">Cannot delete this task</p>
                    <p className="mt-1">
                      Only <span className="font-semibold">Pending</span> tasks can be deleted.
                      This task is currently <span className="font-semibold">{deletingTask.status}</span>.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      To remove it from view, use <span className="font-semibold">Change Status → Cancelled</span> instead.
                    </p>
                  </div>
                ) : (
                  <>
                    <p>Are you sure you want to delete this task?</p>
                    <p className="mt-1 font-semibold text-foreground">&quot;{deletingTask?.title}&quot;</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This is a soft delete — the task will be marked as <span className="font-semibold">Cancelled</span> on the backend.
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeletingTask(null)} disabled={submittingDelete}>Close</Button>
            {deletingTask?.status === "Pending" && (
              <Button variant="destructive" onClick={handleDeleteSubmit} disabled={submittingDelete}>
                {submittingDelete ? "Deleting..." : "Delete task"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </div>
  );
}
