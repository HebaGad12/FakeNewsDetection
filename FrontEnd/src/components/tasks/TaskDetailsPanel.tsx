import { X, Calendar, Clock, User, MessageSquare, Send, CheckCircle2, XCircle, RotateCcw, Pencil, Trash2, RefreshCw, Upload } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type Journalist, priorityStyle, statusStyle, type Role, type Task } from "@/lib/tasks-mock";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { postsService } from "@/services/postsService";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/services/types";

interface Props {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  role: Role;
  onUpdate?: () => void;
  journalists: Journalist[];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TaskDetailsPanel({ task, open, onClose, role, onUpdate, journalists }: Props) {
  const [comment, setComment] = useState("");
  const [article, setArticle] = useState<Post | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && task?.id) {
      setLoadingArticle(true);
      postsService.getPostByTaskId(task.id)
        .then(setArticle)
        .catch(() => setArticle(null))
        .finally(() => setLoadingArticle(false));
    } else {
      setArticle(null);
    }
  }, [open, task?.id]);

  if (!open || !task) return null;
  const j = journalists.find(x => x.id === task.journalistId) || { id: "unknown", name: "Unassigned", avatar: "?", beat: "Unknown", completed: 0, onTime: 0 };

  const send = () => {
    if (!comment.trim()) return;
    toast.success("Comment posted");
    setComment("");
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm animate-fade-in" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-slide-in-right sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{task.id}</div>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug">{task.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn(statusStyle[task.status])}>{task.status}</Badge>
              <Badge variant="outline" className={cn(priorityStyle[task.priority])}>{task.priority} priority</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta icon={User} label="Assigned to" value={
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-accent">{j.avatar}</AvatarFallback></Avatar>
                  <span>{j.name}</span>
                </div>
              } />
              <Meta icon={Calendar} label="Deadline" value={fmt(task.deadline)} />
              <Meta icon={Clock} label="Created" value={fmt(task.createdAt)} />
              <Meta icon={RefreshCw} label="Updated" value={fmt(task.updatedAt)} />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
              <p className="text-sm leading-relaxed text-foreground/90">{task.description}</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</h3>
                <span className="text-xs font-medium tabular-nums">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
              <div className="mt-3 grid grid-cols-4 gap-1 text-[10px]">
                {["Briefed", "In Progress", "Review", "Published"].map((s, i) => (
                  <div key={s} className="space-y-1">
                    <div className={cn("h-1 rounded-full", task.progress >= (i + 1) * 25 ? "bg-primary" : "bg-muted")} />
                    <div className="text-muted-foreground">{s}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted Article</h3>
              {loadingArticle ? (
                <div className="text-xs text-muted-foreground">Loading article...</div>
              ) : article ? (
                <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
                  <p className="font-semibold text-sm line-clamp-1 text-foreground">{article.title}</p>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/article/${article.id}`)}>
                    View Article
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                  No article has been submitted for this task yet.
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> Comments ({task.comments.length})
              </h3>
              {task.comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  No comments yet â€” start the conversation.
                </div>
              ) : (
                <div className="space-y-3">
                  {task.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px] bg-accent">{c.avatar}</AvatarFallback></Avatar>
                      <div className="flex-1 rounded-lg border border-border bg-background p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{c.author}</span>
                          <span className="text-[11px] text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="mt-1 text-sm text-foreground/90">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a commentâ€¦"
                  className="min-h-[70px] resize-none"
                />
                <Button onClick={send} size="icon" className="self-end h-9 w-9 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          {role === "Organization" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => toast.success("Task approved")}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast("Revision requested")}>
                <RotateCcw className="h-4 w-4" /> Request Revision
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast("Edit task")}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => toast.error("Task rejected")}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button size="sm" variant="ghost" className="col-span-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => toast.error("Task deleted")}>
                <Trash2 className="h-4 w-4" /> Delete task
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => toast.success("Status updated")}>
                <RefreshCw className="h-4 w-4" /> Update Status
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast("Submitted for review")}>
                <Upload className="h-4 w-4" /> Submit for Review
              </Button>
              <Button size="sm" variant="outline" className="col-span-2 bg-success/10 text-success hover:bg-success/20 border-success/30" onClick={() => toast.success("Marked completed")}>
                <CheckCircle2 className="h-4 w-4" /> Mark as Completed
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5 text-sm">{value}</div>
    </div>
  );
}
