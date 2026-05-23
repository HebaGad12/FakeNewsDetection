import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { organizationTaskService } from "@/services/organizationTask";
import type { OrgJournalistResponse } from "@/services/organization";
import type { User } from "@/lib/tasks-types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function CreateTaskDialog({ user, journalists, onCreated }: { user: any; journalists: OrgJournalistResponse[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [assignedJournalist, setAssignedJournalist] = useState("none");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  

  async function submit() {
    if (!title.trim()) { toast.error("Title required"); return; }
    const j = journalists.find((u) => u.id === assignedJournalist);
    await organizationTaskService.createTask({
      title: title.trim(),
      description: description.trim(),
      priority: parseInt(priority),
      deadline,
      assignedJournalistId: assignedJournalist === "none" ? "" : assignedJournalist,
    });
    toast.success("Task created");
    setOpen(false);
    setTitle(""); setDescription(""); setAssignedJournalist("none");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />New task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create assignment</DialogTitle>
          <DialogDescription>Brief your newsroom and assign it to a journalist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Investigate transit fare hikes" />
          </div>
          <div>
            <Label>Brief</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What needs to be reported, written, or filed?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Low</SelectItem>
                  <SelectItem value="1">Medium</SelectItem>
                  <SelectItem value="2">High</SelectItem>
                  <SelectItem value="3">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Assign to</Label>
            <Select value={assignedJournalist} onValueChange={setAssignedJournalist}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Leave unassigned</SelectItem>
                  {(journalists || []).map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
