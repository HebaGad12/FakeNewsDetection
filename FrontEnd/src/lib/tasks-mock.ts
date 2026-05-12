export type TaskStatus =
  | "Pending"
  | "Accepted"
  | "In Progress"
  | "Submitted for Review"
  | "Needs Revision"
  | "Completed"
  | "Cancelled";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type Role = "Organization" | "Journalist";

export interface Journalist {
  id: string;
  name: string;
  avatar: string;
  beat: string;
  completed: number;
  onTime: number;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  journalistId: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  comments: Comment[];
}

export const journalists: Journalist[] = [
  { id: "j1", name: "Amelia Hartwood", avatar: "AH", beat: "Politics", completed: 42, onTime: 95 },
  { id: "j2", name: "Marcus Okafor", avatar: "MO", beat: "Investigations", completed: 31, onTime: 88 },
  { id: "j3", name: "Sora Tanaka", avatar: "ST", beat: "Tech", completed: 58, onTime: 92 },
  { id: "j4", name: "Diego Marín", avatar: "DM", beat: "Culture", completed: 27, onTime: 81 },
  { id: "j5", name: "Priya Raghavan", avatar: "PR", beat: "Climate", completed: 39, onTime: 90 },
  { id: "j6", name: "Noah Bergström", avatar: "NB", beat: "Business", completed: 22, onTime: 78 },
];

export const tasks: Task[] = [
  {
    id: "T-1042",
    title: "Investigation: Municipal contracting irregularities",
    description:
      "Three-part investigative series examining unusual procurement patterns across five city departments over the last fiscal year. Coordinate with data desk for FOIA records and visualization.",
    journalistId: "j2",
    priority: "Critical",
    status: "In Progress",
    deadline: "2026-05-22",
    createdAt: "2026-04-30",
    updatedAt: "2026-05-11",
    progress: 60,
    comments: [
      { id: "c1", author: "Editor Liu", avatar: "EL", text: "FOIA response just came in — let's discuss in standup.", time: "2h ago" },
      { id: "c2", author: "Marcus Okafor", avatar: "MO", text: "Drafting the second piece tonight. Source confirmed.", time: "45m ago" },
    ],
  },
  {
    id: "T-1041",
    title: "Explainer: New EU AI Act enforcement timeline",
    description: "Reader-friendly explainer with embedded timeline graphic. 1200 words.",
    journalistId: "j3",
    priority: "High",
    status: "Submitted for Review",
    deadline: "2026-05-14",
    createdAt: "2026-05-05",
    updatedAt: "2026-05-12",
    progress: 90,
    comments: [{ id: "c3", author: "Sora Tanaka", avatar: "ST", text: "Ready for copy edit.", time: "1h ago" }],
  },
  {
    id: "T-1040",
    title: "Profile: City climate adaptation chief",
    description: "Long-form profile, 2500 words, with original photography.",
    journalistId: "j5",
    priority: "Medium",
    status: "Pending",
    deadline: "2026-05-29",
    createdAt: "2026-05-10",
    updatedAt: "2026-05-10",
    progress: 5,
    comments: [],
  },
  {
    id: "T-1039",
    title: "Breaking: Fed rate decision coverage",
    description: "Live coverage and follow-up analysis piece by EOD.",
    journalistId: "j6",
    priority: "Critical",
    status: "Accepted",
    deadline: "2026-05-13",
    createdAt: "2026-05-12",
    updatedAt: "2026-05-12",
    progress: 20,
    comments: [],
  },
  {
    id: "T-1038",
    title: "Review: Cannes opening night film",
    description: "800-word review filed within 3 hours of screening.",
    journalistId: "j4",
    priority: "Medium",
    status: "Needs Revision",
    deadline: "2026-05-15",
    createdAt: "2026-05-08",
    updatedAt: "2026-05-12",
    progress: 70,
    comments: [{ id: "c4", author: "Editor Liu", avatar: "EL", text: "Tighten the second act analysis.", time: "30m ago" }],
  },
  {
    id: "T-1037",
    title: "Election day prep: Polling station logistics",
    description: "Coordinate stringers across 12 districts.",
    journalistId: "j1",
    priority: "High",
    status: "In Progress",
    deadline: "2026-05-20",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-11",
    progress: 45,
    comments: [],
  },
  {
    id: "T-1036",
    title: "Newsletter: Weekly tech roundup",
    description: "Curate top 5 stories with brief commentary.",
    journalistId: "j3",
    priority: "Low",
    status: "Completed",
    deadline: "2026-05-09",
    createdAt: "2026-05-04",
    updatedAt: "2026-05-09",
    progress: 100,
    comments: [],
  },
  {
    id: "T-1035",
    title: "Q&A: Senator on infrastructure bill",
    description: "Lightly edited transcript, 1500 words.",
    journalistId: "j1",
    priority: "Medium",
    status: "Submitted for Review",
    deadline: "2026-05-16",
    createdAt: "2026-05-06",
    updatedAt: "2026-05-12",
    progress: 85,
    comments: [],
  },
  {
    id: "T-1034",
    title: "Photo essay: Urban farming collectives",
    description: "10-image essay with captions and short intro.",
    journalistId: "j4",
    priority: "Low",
    status: "Pending",
    deadline: "2026-06-02",
    createdAt: "2026-05-11",
    updatedAt: "2026-05-11",
    progress: 0,
    comments: [],
  },
  {
    id: "T-1033",
    title: "Data piece: Climate migration patterns",
    description: "Interactive data story with 3 charts.",
    journalistId: "j5",
    priority: "High",
    status: "Cancelled",
    deadline: "2026-05-18",
    createdAt: "2026-04-28",
    updatedAt: "2026-05-10",
    progress: 30,
    comments: [],
  },
];

export const statusList: TaskStatus[] = [
  "Pending", "Accepted", "In Progress", "Submitted for Review", "Needs Revision", "Completed", "Cancelled",
];
export const priorityList: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

export const journalistById = (id: string) =>
  journalists.find((j) => j.id === id) ?? journalists[0];

export const statusStyle: Record<TaskStatus, string> = {
  "Pending": "bg-muted text-muted-foreground border-border",
  "Accepted": "bg-info/15 text-info border-info/30",
  "In Progress": "bg-primary/15 text-primary border-primary/30",
  "Submitted for Review": "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
  "Needs Revision": "bg-destructive/15 text-destructive border-destructive/30",
  "Completed": "bg-success/15 text-success border-success/30",
  "Cancelled": "bg-muted text-muted-foreground/70 border-border line-through",
};

export const priorityStyle: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-info/15 text-info border-info/30",
  High: "bg-warning/20 text-warning-foreground dark:text-warning border-warning/40",
  Critical: "bg-destructive/15 text-destructive border-destructive/30",
};
