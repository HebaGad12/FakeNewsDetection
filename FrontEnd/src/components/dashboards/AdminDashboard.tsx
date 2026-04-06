import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  Building2,
  TrendingUp,
  RefreshCw,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Send,
  ArrowDownLeft,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import adminService, {
  AdminDashboardStats,
  AdminUserListItem,
  AdminUserDetail,
  AdminPostListItem,
  AdminPostDetail,
  PendingJournalistRequest,
  RejectedJournalistRequest,
  PendingOrganizationRequest,
  RejectedOrganizationRequest,
  PaginatedResult,
} from "@/services/adminService";
import adminWalletService, {
  WalletSummary,
  WalletTransaction,
} from "@/services/adminWalletService";
import donationService, { DonationRecord } from "@/services/donationService";
import postReportsService, {
  PostReportItem,
  PostReportSummary,
} from "@/services/postReportsService";

// ============================================================================
// Helper utilities
// ============================================================================

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const moderationColor: Record<string, string> = {
  Pending: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Flagged: "bg-orange-100 text-orange-700",
  Removed: "bg-red-100 text-red-700",
  UnderReview: "bg-yellow-100 text-yellow-700",
  Activated: "bg-green-100 text-green-700",
  Deactivated: "bg-red-100 text-red-700",
};

const normalizeModerationStatus = (status: string) =>
  status === "Removed" || status === "Deactivated" ? "Removed" : "Approved";

const moderationStatusLabel = (status: string) => {
  const normalized = normalizeModerationStatus(status);
  return normalized === "Removed" ? "Deactivated" : "Activated";
};

// ============================================================================
// Sub-components
// ============================================================================

const DashStatCard = ({
  label,
  value,
  icon: Icon,
  sub,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-border rounded-xl p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <Icon className="h-5 w-5 text-accent" />
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
    <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </motion.div>
);

const Pagination = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (p: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
      <span>
        Showing {Math.min((page - 1) * pageSize + 1, totalCount)}{String.fromCharCode(8211)}
        {Math.min(page * pageSize, totalCount)} of {totalCount}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex items-center px-2">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Tab: Overview
// ============================================================================

const OverviewTab = ({ stats }: { stats: AdminDashboardStats | null }) => {
  if (!stats)
    return <div className="py-16 text-center text-muted-foreground">Loading stats...</div>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, sub: `${stats.activeUsers} active` },
    { label: "Total Posts", value: stats.totalPosts, icon: FileText, sub: `${stats.pendingPosts} pending` },
    { label: "Journalists", value: stats.totalJournalists, icon: UserCheck, sub: `${stats.pendingJournalistRequests} pending` },
    { label: "Organizations", value: stats.totalOrganizations, icon: Building2, sub: `${stats.pendingOrganizationRequests} pending` },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <DashStatCard key={c.label} {...c} delay={i * 0.07} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Users by Role
          </h3>
          <div className="space-y-3">
            {[
              { label: "Regular Users", value: stats.totalRegularUsers, color: "bg-blue-400" },
              { label: "Journalists", value: stats.totalJournalists, color: "bg-purple-400" },
              { label: "Organizations", value: stats.totalOrganizations, color: "bg-orange-400" },
              { label: "Admins", value: stats.totalAdmins, color: "bg-red-400" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", r.color)} />
                <span className="text-sm flex-1">{r.label}</span>
                <span className="font-semibold text-sm">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" /> Posts by Status
          </h3>
          <div className="space-y-3">
            {[
              { label: "Pending", value: stats.pendingPosts, color: "bg-blue-400" },
              { label: "Approved", value: stats.approvedPosts, color: "bg-green-400" },
              { label: "Rejected", value: stats.rejectedPosts, color: "bg-red-400" },
              { label: "Flagged", value: stats.flaggedPosts, color: "bg-orange-400" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", r.color)} />
                <span className="text-sm flex-1">{r.label}</span>
                <span className="font-semibold text-sm">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" /> Pending Requests
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Journalist Requests", value: stats.pendingJournalistRequests },
            { label: "Rejected Journalists", value: stats.rejectedJournalistRequests },
            { label: "Org Requests", value: stats.pendingOrganizationRequests },
            { label: "Rejected Orgs", value: stats.rejectedOrganizationRequests },
          ].map((r) => (
            <div key={r.label} className="text-center p-3 bg-muted/40 rounded-lg">
              <p className="text-2xl font-bold">{r.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Tab: Users
// ============================================================================

const UsersTab = () => {
  const [result, setResult] = useState<PaginatedResult<AdminUserListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof adminService.getUsers>[0] = { page, pageSize: 20 };
      if (roleFilter !== "all") params.role = roleFilter;
      if (activeFilter !== "all") params.isActive = activeFilter === "active";
      const data = await adminService.getUsers(params);
      setResult(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activeFilter]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    try {
      const u = await adminService.getUserById(id);
      setSelectedUser(u);
      setDetailOpen(true);
    } catch {
      toast.error("Failed to load user details");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adminService.deleteUser(deleteId);
      toast.success("User deleted");
      setDeleteId(null);
      void load();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const toggleStatus = async (u: AdminUserListItem) => {
    try {
      await adminService.updateUserStatus(u.id, { isActive: !u.isActive });
      toast.success(`User ${u.isActive ? "deactivated" : "activated"}`);
      void load();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Journalist">Journalist</SelectItem>
            <SelectItem value="Organization">Organization</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {loading && !result ? (
        <div className="py-16 text-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Name", "Email", "Role", "Status", "Posts", "Followers", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result?.data.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.postCount}</td>
                    <td className="px-4 py-3">{u.followerCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openDetail(u.id)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void toggleStatus(u)}
                          title={u.isActive ? "Deactivate" : "Activate"}
                        >
                          {u.isActive
                            ? <ToggleRight className="h-4 w-4 text-green-600" />
                            : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(u.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              totalCount={result.totalCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Name", selectedUser.name],
                  ["Email", selectedUser.email],
                  ["Role", selectedUser.role],
                  ["Status", selectedUser.isActive ? "Active" : "Inactive"],
                  ["Posts", selectedUser.postCount],
                  ["Followers", selectedUser.followerCount],
                  ["Following", selectedUser.followingCount],
                  ["Likes Received", selectedUser.totalLikesReceived],
                  ["Comments Received", selectedUser.totalCommentsReceived],
                  ["Total Interactions", selectedUser.totalInteractions],
                  ["Moderation Actions", selectedUser.moderationActionsCount],
                  ["Joined", formatDate(selectedUser.createdAt)],
                ] as [string, string | number][]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-medium">{String(v)}</p>
                  </div>
                ))}
              </div>
              {selectedUser.journalistExternalId && (
                <div>
                  <p className="text-xs text-muted-foreground">Journalist ID</p>
                  <p className="font-mono text-xs">{selectedUser.journalistExternalId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The user and all their data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Tab: Posts
// ============================================================================

const PostsTab = () => {
  const [result, setResult] = useState<PaginatedResult<AdminPostListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modFilter, setModFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState<AdminPostDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moderationDialog, setModerationDialog] = useState<AdminPostListItem | null>(null);
  const [modStatus, setModStatus] = useState("Approved");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof adminService.getPosts>[0] = { page, pageSize: 20 };
      if (modFilter !== "all") params.moderationStatus = modFilter;
      const data = await adminService.getPosts(params);
      setResult(data);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [page, modFilter]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    try {
      const p = await adminService.getPostById(id);
      setSelectedPost(p);
      setDetailOpen(true);
    } catch {
      toast.error("Failed to load post details");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adminService.deletePost(deleteId);
      toast.success("Post deleted");
      setDeleteId(null);
      void load();
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const submitModeration = async () => {
    if (!moderationDialog || !modStatus) return;
    try {
      await adminService.updatePostModeration(moderationDialog.id, {
        moderationStatus: modStatus,
      });
      toast.success("Moderation status updated");
      setModerationDialog(null);
      void load();
    } catch {
      toast.error("Failed to update moderation");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={modFilter} onValueChange={(v) => { setModFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Moderation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Moderation</SelectItem>
            <SelectItem value="Approved">Activated</SelectItem>
            <SelectItem value="Removed">Deactivated</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {loading && !result ? (
        <div className="py-16 text-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Title", "Author", "Moderation", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result?.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 max-w-48 truncate font-medium" title={p.title}>
                      {p.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.authorName}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        moderationColor[normalizeModerationStatus(p.moderationStatus)] ?? "bg-gray-100 text-gray-600"
                      )}>
                        {moderationStatusLabel(p.moderationStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openDetail(p.id)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Moderation"
                          onClick={() => {
                            setModerationDialog(p);
                            setModStatus(normalizeModerationStatus(p.moderationStatus));
                          }}
                        >
                          <Filter className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              totalCount={result.totalCount}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Title</p>
                <p className="font-semibold text-base">{selectedPost.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Author", selectedPost.authorName],
                  ["Author Role", selectedPost.authorRole],
                  ["Organization", selectedPost.organizationName ?? "none"],
                  ["Moderation", selectedPost.moderationStatus],
                  ["Verification", selectedPost.verificationStatus],
                  ["Confidence", `${selectedPost.confidenceScore}%`],
                  ["Community Cred.", `${selectedPost.communityCredibilityPercent}%`],
                  ["Likes", selectedPost.likeCount],
                  ["Comments", selectedPost.commentCount],
                  ["Shares", selectedPost.shareCount],
                  ["Reports", selectedPost.reportCount],
                  ["Total Interactions", selectedPost.totalInteractions],
                  ["Created", formatDate(selectedPost.createdAt)],
                ] as [string, string | number][]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-medium">{String(v)}</p>
                  </div>
                ))}
              </div>
              {selectedPost.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPost.tags.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Content</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">{selectedPost.content}</p>
              </div>
              {selectedPost.moderationNotes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Moderation Notes</p>
                  <p className="text-sm">{selectedPost.moderationNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!moderationDialog} onOpenChange={() => setModerationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Moderation Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={modStatus} onValueChange={setModStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Activated</SelectItem>
                  <SelectItem value="Removed">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerationDialog(null)}>Cancel</Button>
            <Button onClick={() => void submitModeration()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>This post will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Tab: Journalists
// ============================================================================

const JournalistsTab = () => {
  const [pending, setPending] = useState<PendingJournalistRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejected, setRejected] = useState<RejectedJournalistRequest[]>([]);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [subTab, setSubTab] = useState<"pending" | "rejected">("pending");
  const [reviewDialog, setReviewDialog] = useState<PendingJournalistRequest | null>(null);
  const [approve, setApprove] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      setPending(await adminService.getPendingJournalists());
    } catch {
      toast.error("Failed to load pending journalists");
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const loadRejected = useCallback(async () => {
    setLoadingRejected(true);
    try {
      setRejected(await adminService.getRejectedJournalists());
    } catch {
      toast.error("Failed to load rejected journalists");
    } finally {
      setLoadingRejected(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "pending") void loadPending();
    else void loadRejected();
  }, [subTab, loadPending, loadRejected]);

  const submitReview = async () => {
    if (!reviewDialog) return;
    try {
      await adminService.reviewJournalist(reviewDialog.id, {
        approve,
        rejectionReason: approve ? undefined : rejectionReason,
      });
      toast.success(approve ? "Journalist approved!" : "Journalist rejected");
      setReviewDialog(null);
      void loadPending();
    } catch {
      toast.error("Failed to submit review");
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Button variant={subTab === "pending" ? "default" : "outline"} size="sm" onClick={() => setSubTab("pending")}>
          Pending ({pending.length})
        </Button>
        <Button variant={subTab === "rejected" ? "default" : "outline"} size="sm" onClick={() => setSubTab("rejected")}>
          Rejected ({rejected.length})
        </Button>
      </div>

      {subTab === "pending" && (
        loadingPending ? (
          <div className="py-16 text-center text-muted-foreground">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No pending journalist requests.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((j) => (
              <div key={j.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{j.name}</p>
                    <p className="text-sm text-muted-foreground">{j.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Press ID: {j.journalistExternalId} &middot; {formatDate(j.registeredAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      try {
                        await adminService.reviewJournalist(j.id, {
                          approve: true,
                          rejectionReason: undefined,
                        });
                        toast.success("Journalist approved!");
                        void loadPending();
                      } catch {
                        toast.error("Failed to approve journalist");
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setReviewDialog(j); setApprove(false); setRejectionReason(""); }}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === "rejected" && (
        loadingRejected ? (
          <div className="py-16 text-center text-muted-foreground">Loading...</div>
        ) : rejected.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No rejected journalist requests.</div>
        ) : (
          <div className="space-y-3">
            {rejected.map((j) => (
              <div key={j.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{j.name}</p>
                    <p className="text-sm text-muted-foreground">{j.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Press ID: {j.journalistId} &middot; {formatDate(j.registeredAt)}
                    </p>
                    {j.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">Reason: {j.rejectionReason}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await adminService.reopenJournalistRequest(j.id);
                      toast.success("Request reopened");
                      void loadRejected();
                    } catch {
                      toast.error("Failed to reopen request");
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Reopen
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approve ? "Approve" : "Reject"} Journalist Request</DialogTitle>
            {reviewDialog && (
              <DialogDescription>{reviewDialog.name} ({reviewDialog.email})</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button size="sm" variant={approve ? "default" : "outline"} onClick={() => setApprove(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant={!approve ? "destructive" : "outline"} onClick={() => setApprove(false)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
            {!approve && (
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant={approve ? "default" : "destructive"} onClick={() => void submitReview()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Tab: Organizations
// ============================================================================

const OrganizationsTab = () => {
  const [pending, setPending] = useState<PendingOrganizationRequest[]>([]);
  const [rejected, setRejected] = useState<RejectedOrganizationRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [subTab, setSubTab] = useState<"pending" | "rejected">("pending");
  const [reviewDialog, setReviewDialog] = useState<string | null>(null);
  const [approve, setApprove] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      setPending(await adminService.getPendingOrganizations());
    } catch {
      toast.error("Failed to load pending organizations");
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const loadRejected = useCallback(async () => {
    setLoadingRejected(true);
    try {
      setRejected(await adminService.getRejectedOrganizations());
    } catch {
      toast.error("Failed to load rejected organizations");
    } finally {
      setLoadingRejected(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "pending") void loadPending();
    else void loadRejected();
  }, [subTab, loadPending, loadRejected]);

  const submitReview = async () => {
    if (!reviewDialog) return;
    try {
      await adminService.reviewOrganization(reviewDialog, {
        approve,
        rejectionReason: approve ? undefined : rejectionReason,
      });
      toast.success(approve ? "Organization approved!" : "Organization rejected");
      setReviewDialog(null);
      void loadPending();
    } catch {
      toast.error("Failed to submit review");
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Button variant={subTab === "pending" ? "default" : "outline"} size="sm" onClick={() => setSubTab("pending")}>
          Pending ({pending.length})
        </Button>
        <Button variant={subTab === "rejected" ? "default" : "outline"} size="sm" onClick={() => setSubTab("rejected")}>
          Rejected ({rejected.length})
        </Button>
      </div>

      {subTab === "pending" && (
        loadingPending ? (
          <div className="py-16 text-center text-muted-foreground">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No pending organization requests.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((org) => (
              <div key={org.userId} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.email}</p>
                    <p className="text-xs text-muted-foreground">
                      License: {org.license} &middot; {formatDate(org.registeredAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      try {
                        await adminService.reviewOrganization(org.userId, {
                          approve: true,
                          rejectionReason: undefined,
                        });
                        toast.success("Organization approved!");
                        void loadPending();
                      } catch {
                        toast.error("Failed to approve organization");
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setReviewDialog(org.userId); setApprove(false); setRejectionReason(""); }}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === "rejected" && (
        loadingRejected ? (
          <div className="py-16 text-center text-muted-foreground">Loading...</div>
        ) : rejected.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No rejected organization requests.</div>
        ) : (
          <div className="space-y-3">
            {rejected.map((org) => (
              <div key={org.userId} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.email}</p>
                    <p className="text-xs text-muted-foreground">
                      License: {org.license} &middot; {formatDate(org.registeredAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approve ? "Approve" : "Reject"} Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button size="sm" variant={approve ? "default" : "outline"} onClick={() => setApprove(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant={!approve ? "destructive" : "outline"} onClick={() => setApprove(false)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
            {!approve && (
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant={approve ? "default" : "destructive"} onClick={() => void submitReview()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Tab: Wallets
// ============================================================================

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const WalletsTab = () => {
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Transaction viewer
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Adjust balance dialog
  const [adjustDialog, setAdjustDialog] = useState<WalletSummary | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      setWallets(await adminWalletService.getAllWallets());
    } catch {
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const openTransactions = async (wallet: WalletSummary) => {
    setSelectedWallet(wallet);
    setLoadingTx(true);
    try {
      setTransactions(await adminWalletService.getTransactions(wallet.userId));
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTx(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustDialog) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid non-zero amount");
      return;
    }
    
    setAdjusting(true);
    try {
      await adminWalletService.adjustBalance({
  userId: adjustDialog.userId,
  amount,
  ...(adjustDescription.trim() && { description: adjustDescription })
});

      toast.success("Balance adjusted successfully");
      setAdjustDialog(null);
      setAdjustAmount("");
      setAdjustDescription("");
      void loadWallets();
      // Refresh transactions if viewing this wallet
      if (selectedWallet?.userId === adjustDialog.userId) {
        setLoadingTx(true);
        adminWalletService
          .getTransactions(adjustDialog.userId)
          .then(setTransactions)
          .catch(() => toast.error("Failed to refresh transactions"))
          .finally(() => setLoadingTx(false));
      }
    } catch {
      toast.error("Failed to adjust balance");
    } finally {
      setAdjusting(false);
    }
  };

  const filteredWallets = wallets.filter(
    (w) =>
      w.userName.toLowerCase().includes(search.toLowerCase()) ||
      w.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadWallets} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading wallets...</div>
      ) : filteredWallets.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          {search ? "No wallets matching your search." : "No wallets found."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Updated</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map((w) => (
                  <tr key={w.walletId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{w.userName}</p>
                        <p className="text-xs text-muted-foreground">{w.userId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("font-semibold", w.balance >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(w.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {formatDateTime(w.updatedAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTransactions(w)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> History
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAdjustDialog(w);
                            setAdjustAmount("");
                            setAdjustDescription("");
                          }}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" /> Adjust
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Dialog */}
      <Dialog open={!!selectedWallet} onOpenChange={() => setSelectedWallet(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-accent" />
              Transaction History
            </DialogTitle>
            {selectedWallet && (
              <DialogDescription>
                {selectedWallet.userName} &middot; Balance: {formatCurrency(selectedWallet.balance)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingTx ? (
              <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No transactions found.</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className={cn(
                    "mt-0.5 p-1.5 rounded-full",
                    tx.amount >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {tx.amount >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{tx.description || tx.type}</p>
                      <span className={cn("font-semibold text-sm whitespace-nowrap", tx.amount >= 0 ? "text-green-600" : "text-red-600")}>
                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">{tx.type}</Badge>
                      {tx.actorName && <span>by {tx.actorName}</span>}
                      <span>&middot;</span>
                      <span>{formatDateTime(tx.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              Adjust Balance
            </DialogTitle>
            {adjustDialog && (
              <DialogDescription>
                {adjustDialog.userName} &middot; Current balance: {formatCurrency(adjustDialog.balance)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount (positive to add, negative to deduct)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a positive number to credit, negative to debit.
              </p>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Reason for adjustment (optional)..."
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-1" />
              )}
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Tab: Donations (all platform donations)
// ============================================================================

const DonationsTab = () => {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      setDonations(await donationService.getAllDonations());
    } catch {
      toast.error("Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDonations();
  }, [loadDonations]);

  const filtered = donations.filter(
    (d) =>
      d.senderName.toLowerCase().includes(search.toLowerCase()) ||
      d.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      (d.message && d.message.toLowerCase().includes(search.toLowerCase()))
  );

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">Total Donations</p>
          <p className="text-2xl font-bold text-foreground">{donations.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-emerald-500">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">Avg Donation</p>
          <p className="text-2xl font-bold text-foreground">
            ${donations.length > 0 ? (totalAmount / donations.length).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by sender, recipient, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadDonations} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading donations...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          {search ? "No donations matching your search." : "No donations found."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sender</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Recipient</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Message</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium">{d.senderName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{d.recipientName}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-emerald-500">${d.amount.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-muted-foreground truncate max-w-[200px]">{d.message || "—"}</p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Tab: Reports
// ============================================================================

const ReportsTab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [postReports, setPostReports] = useState<PostReportSummary[]>([]);
  const [selectedPostReport, setSelectedPostReport] = useState<PostReportSummary | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const reports = await postReportsService.getPostReports();
      setPostReports(reports);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPostReportDetails = async (postId: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedPostReport(null);
    try {
      const details = await postReportsService.getPostReportById(postId);
      setSelectedPostReport(details);
    } catch {
      toast.error("Failed to load post report details");
      setSelectedPostReport(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const reportedPosts = postReports.filter(
    (report) => report.totalReports > 0 || report.reports.length > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Posts reported by users</p>
        <Button variant="outline" size="sm" onClick={() => void loadReports()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Reported Posts</h3>
          <span className="text-xs text-muted-foreground">Total: {reportedPosts.length}</span>
        </div>

        {loading && reportedPosts.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">Loading reported posts...</div>
        ) : reportedPosts.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">No reported posts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="py-2 pr-3">Post ID</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Author ID</th>
                  <th className="py-2 pr-3">Reports</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportedPosts.map((report) => (
                  <tr key={report.postId} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-medium text-foreground">#{report.postId}</td>
                    <td className="py-2 pr-3 text-foreground max-w-[300px] truncate" title={report.title}>
                      {report.title}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{report.authorId}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="secondary">{report.totalReports}</Badge>
                    </td>
                    <td className="py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void openPostReportDetails(report.postId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Report Details</DialogTitle>
            <DialogDescription>
              {selectedPostReport ? `Reports submitted for post #${selectedPostReport.postId}` : "Report details"}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          ) : !selectedPostReport || selectedPostReport.reports.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">No report details found.</div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {selectedPostReport.reports.map((item: PostReportItem) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">Report #{item.id}</span>
                    <span className="text-xs text-muted-foreground">Reporter: {item.reporterName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Role: {item.reporterRole}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Reported at: {new Date(item.reportedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.reason || "No reason provided."}</p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!selectedPostReport) return;
                setDetailsOpen(false);
                navigate(`/article/${selectedPostReport.postId}`);
              }}
              disabled={!selectedPostReport}
            >
              Go to Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Main AdminDashboard
// ============================================================================

type Tab = "overview" | "users" | "posts" | "journalists" | "organizations" | "reports" | "wallets" | "donations";

const tabItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "journalists", label: "Journalists", icon: UserCheck },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "reports", label: "Reports", icon: AlertTriangle },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "donations", label: "Donations", icon: Send },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        setStats(await adminService.getDashboardStats());
      } catch {
        toast.error("Failed to load dashboard stats");
      } finally {
        setStatsLoading(false);
      }
    };
    void fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Welcome, {user?.name}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
          {tabItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && <OverviewTab stats={statsLoading ? null : stats} />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "posts" && <PostsTab />}
          {activeTab === "journalists" && <JournalistsTab />}
          {activeTab === "organizations" && <OrganizationsTab />}
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "wallets" && <WalletsTab />}
          {activeTab === "donations" && <DonationsTab />}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;