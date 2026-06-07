export type Role = "organization" | "journalist" | "viewer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId?: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 0 | 1 | 2 | 3;
  status: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  deadline: string;
  organizationId: string;
  organizationName: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<number, string> = {
  0: "Pending", // Was Draft, backend maps 0 to Pending
  1: "Accepted", // Was Pending, backend maps 1 to Accepted
  2: "In Progress", // Was Assigned, backend maps 2 to InProgress
  3: "Submitted For Review", // Was In Progress, backend maps 3 to SubmittedForReview
  4: "Need Revision", // Was Under Review, backend maps 4 to NeedsRevision
  5: "Approved",
  6: "Rejected", // Backend maps 6 to Rejected
  7: "Completed", // Backend maps 7 to Completed
  8: "Cancelled",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

export const KANBAN_COLUMNS: { status: Task["status"]; label: string }[] = [
  { status: 0, label: "Pending" },
  { status: 1, label: "Accepted" },
  { status: 2, label: "In Progress" },
  { status: 3, label: "Submitted For Review" },
  { status: 7, label: "Completed" },
];

export function statusTone(status: number): "default" | "info" | "warning" | "success" | "destructive" | "muted" {
  switch (status) {
    case 0: return "muted"; // Pending
    case 1: return "info"; // Accepted
    case 2: return "info"; // In Progress
    case 3: return "warning"; // Submitted For Review
    case 4: return "warning"; // Needs Revision
    case 5: return "success"; // Approved
    case 6: return "destructive"; // Rejected
    case 7: return "success"; // Completed
    case 8: return "muted"; // Cancelled
    default: return "default";
  }
}

export function priorityTone(p: number): "muted" | "info" | "warning" | "destructive" {
  if (p === 0) return "muted";
  if (p === 1) return "info";
  if (p === 2) return "warning";
  return "destructive";
}