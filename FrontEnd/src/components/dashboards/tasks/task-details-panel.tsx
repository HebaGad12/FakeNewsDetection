import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "./badges";
import { CalendarClock, Clock, FileText, Paperclip, Send, CheckCircle2, Circle, CircleDot, MessageSquarePlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalistTaskResponse, TaskDraft } from "@/services/journalistTask";
import { STATUS_LABELS } from "@/lib/tasks-types";
import { journalistTaskService } from "@/services/journalistTask";
import type { User } from "@/lib/tasks-types";
import { toast } from "sonner";

// Pending(0) -> Accepted(1) -> InProgress(2) -> Submitted(3) -> NeedsRevision(4) -> Completed(7)
const TIMELINE_ORDER = [0, 1, 2, 3, 4, 7];

function fmt(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  if (!name) return "O";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface Props {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  user: User;
}

export function TaskDetailsPanel({ taskId, open, onClose, onChanged, user }: Props) {
  const [task, setTask] = useState<JournalistTaskResponse | null>(null);
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const navigate = useNavigate();

  const loadTaskData = async () => {
    if (!taskId || !open) return;

    setLoadingDrafts(true);
    try {
      const [taskResponse, draftResponse] = await Promise.all([
        journalistTaskService.getTask(taskId),
        journalistTaskService.getTaskDrafts(taskId),
      ]);
      setTask(taskResponse);
      setDrafts(draftResponse);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load task details");
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    if (taskId && open) {
      void loadTaskData();
    } else if (!open) {
      setTimeout(() => setTask(null), 300);
      setDrafts([]);
    }
  }, [taskId, open]);

  const applyStatusChange = async (newStatus: number) => {
    if (!task) return;

    const updatedTask = await journalistTaskService.updateTaskStatus(task.id, newStatus);
    setTask(updatedTask);
    window.dispatchEvent(new CustomEvent("task:status-updated", { detail: { taskId: task.id, status: newStatus } }));
    onChanged?.();
  };

  const handleAcceptTask = () => {
    if (!task) return;
    void (async () => {
      try {
        await applyStatusChange(1);
        navigate(`/create-article?taskId=${task.id}`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to accept task");
      }
    })();
  };

  const handleAddComment = async () => {
    if (!task || !comment.trim()) return;
    try {
      setPosting(true);
      await journalistTaskService.addComment(task.id, comment);
      setComment("");
      await applyStatusChange(4);
      await loadTaskData();
      toast.success("Comment added and task marked for revision");
    } catch (e) {
      console.error("Failed to post comment", e);
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const openDraft = (draftId: string) => {
    if (!task) return;
    navigate(`/create-article?taskId=${task.id}&draftId=${draftId}`);
  };

  const latestDraft = drafts[0];

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 gap-0">
        {!task ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div key={task.id} className="flex flex-col min-h-full">
            <SheetHeader className="space-y-3 border-b border-border bg-gradient-to-b from-accent/40 to-transparent p-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{task.id}</span>
              </div>
              <SheetTitle className="text-xl leading-tight">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">Task details</SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" /> Due {fmt(task.deadline)}
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-7 p-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4">
                <Meta label="Assigned by (Org)">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                        {initials(task.organizationName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{task.organizationName}</span>
                  </div>
                </Meta>
                <Meta label="Assigned to">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                        {initials(task.assignedJournalistName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{task.assignedJournalistName}</span>
                  </div>
                </Meta>
                <Meta label="Created">
                  <span className="text-sm">{fmtTime(task.createdAt)}</span>
                </Meta>
                <Meta label="Last updated">
                  <span className="text-sm">{fmtTime(task.updatedAt)}</span>
                </Meta>
              </div>

              {/* Description */}
              <Section title="Description" icon={FileText}>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </Section>

              {/* Drafts */}
              <Section title={`Drafted Tasks (${drafts.length})`} icon={Paperclip}>
                {loadingDrafts ? (
                  <div className="flex items-center justify-center rounded-lg border border-border bg-card py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : drafts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                    No drafts saved for this task yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft, index) => (
                      <div key={draft.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{draft.title || `Draft ${index + 1}`}</p>
                              {draft.id === latestDraft?.id && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  Latest
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                              {draft.content || "No draft content yet."}
                            </p>
                            {draft.tags?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {draft.tags.map((tag) => (
                                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Updated {fmtTime(draft.updatedAt || draft.createdAt || "")}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openDraft(draft.id)}>
                            Resume
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Timeline */}
              <Section title="Progress" icon={Clock}>
                <ol className="relative space-y-4">
                  {TIMELINE_ORDER.map((s, i) => {
                    const currentIdx = TIMELINE_ORDER.indexOf(task.status);
                    const isDone = i < currentIdx;
                    const isCurrent = i === currentIdx || task.status === s;
                    return (
                      <li key={s} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : isCurrent ? (
                            <CircleDot className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/40" />
                          )}
                          {i < TIMELINE_ORDER.length - 1 && (
                            <span className={cn("mt-1 h-6 w-px", isDone ? "bg-success/50" : "bg-border")} />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <p className={cn("text-sm font-medium", !isDone && !isCurrent && "text-muted-foreground")}>
                            {STATUS_LABELS[s]}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-[var(--primary)]">Current stage</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Section>

              {/* Comments */}
              <Section title={`Comments (${task.comments?.length || 0})`} icon={MessageSquarePlus}>
                <div className="space-y-3">
                  {(!task.comments || task.comments.length === 0) ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                      No comments yet — be the first to add one.
                    </p>
                  ) : (
                    task.comments.map((c) => (
                      <div key={c.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                            {initials(c.authorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium">{c.authorName}</p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{fmtTime(c.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-border bg-card p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="w-full resize-none border-0 bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={posting}
                  />
                  <div className="flex justify-end pt-2 border-t border-border/50">
                    <Button size="sm" disabled={!comment.trim() || posting} onClick={handleAddComment}>
                      {posting ? <Circle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                      Post
                    </Button>
                  </div>
                </div>
              </Section>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 p-4 backdrop-blur mt-auto">
              {task.status === 0 && (
                <Button variant="secondary" onClick={handleAcceptTask} className="gap-1.5">
                  <Check className="h-4 w-4" />
                  Accept task
                </Button>
              )}
              <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}