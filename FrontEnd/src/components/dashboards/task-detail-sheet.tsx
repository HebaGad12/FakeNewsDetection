import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { organizationTaskService } from "@/services/organizationTask";
import { journalistTaskService } from "@/services/journalistTask";
import type { OrgJournalistResponse } from "@/services/organization";
import { STATUS_LABELS, type Task, type Comment, type User } from "@/lib/tasks-types";
import { StatusBadge, PriorityChip, DeadlinePill } from "./task-badges";
import { toast } from "sonner";
import { Trash2, Send, Calendar, User as UserIcon, Building2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  task: any | null;
  journalists?: OrgJournalistResponse[];
  user: User;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

const ALL_STATUSES: Task["status"][] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function TaskDetailSheet({ task, user, open, onOpenChange, onChanged }: Props) {
  const comments = task?.comments || [];
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task && open) {
      setNewComment("");
    }
  }, [task, open]);

  if (!task) return null;
  const isOrg = user.role === "organization";
  
  const service = isOrg ? organizationTaskService : journalistTaskService;

  async function reassign(id: string) {
    if (!isOrg) return;
    const j = journalists?.find((u) => u.id === id);
    setBusy(true);
    try {
      await organizationTaskService.updateTask(task!.id, { 
        title: task.title,
        description: task.description,
        priority: task.priority,
        deadline: task.deadline,
        assignedJournalistId: j?.id
      } as any);
      toast.success("Assignment updated");
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function changePriority(p: string) {
    if (!isOrg) return;
    setBusy(true);
    try {
      await organizationTaskService.updateTask(task!.id, { 
        title: task.title,
        description: task.description,
        priority: Number(p),
        deadline: task.deadline
      } as any);
      toast.success("Priority updated");
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      await service.addComment(task!.id, newComment.trim());
      setNewComment("");
      toast.success("Comment added");
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function remove() {
    if (!isOrg) return;
    setBusy(true);
    try {
      await organizationTaskService.deleteTask(task!.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="border-b bg-gradient-to-br from-accent/40 to-transparent p-6">
          <SheetHeader className="space-y-3 p-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityChip priority={task.priority} />
              <DeadlinePill deadline={task.deadline} status={task.status} />
            </div>
            <SheetTitle className="text-2xl leading-tight">{task.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{task.organizationName}</span>
            <span className="inline-flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{task.assignedJournalistName ?? "Unassigned"}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Brief</h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{task.description}</p>
          </section>

          <Separator />

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Status</label>
              <div className="rounded-lg border border-border bg-background p-3 text-sm font-medium">
                {STATUS_LABELS[task.status]}
              </div>
            </div>
            {isOrg && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Priority</label>
                  <Select value={String(task.priority)} onValueChange={changePriority} disabled={busy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                      <SelectItem value="3">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">AssignedJournalist</label>
                  <Select value={task.assignedJournalistId ?? "none"} onValueChange={reassign} disabled={busy}>
                    <SelectTrigger><SelectValue placeholder="Assign journalist" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                        {(journalists || []).map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </section>

          <Separator />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Discussion</h3>
              <span className="text-xs text-muted-foreground">{comments.length} comments</span>
            </div>
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">No comments yet — start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{c.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{c.authorName}</span>
                      <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                rows={2}
              />
              <Button onClick={postComment} disabled={!newComment.trim()} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {isOrg && (
            <>
              <Separator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full"><Trash2 className="mr-2 h-4 w-4" />Delete task</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
