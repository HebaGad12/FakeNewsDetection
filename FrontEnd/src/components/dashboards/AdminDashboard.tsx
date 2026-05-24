import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Menu, 
  Search,
  Database,
  Cloud,
  Lock,
  Zap,
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
  Home,
  LogOut,
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
    <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
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
    <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
      <span className="text-sm">
        Showing {Math.min((page - 1) * pageSize + 1, totalCount)}-
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
        <span className="flex items-center px-3 text-sm font-medium">
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
// SideNavBar Component - Enhanced Typography
// ============================================================================

interface SideNavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user?: { name?: string } | null;
  onLogout?: () => void;
  isSidebarOpen: boolean;
}

const SideNavBar = ({ activeTab, onTabChange, user, onLogout, isSidebarOpen }: SideNavBarProps) => {
  const navigate = useNavigate();

  const navGroups = [
    {
      items: [
        { id: "overview",      label: "Dashboard",       icon: TrendingUp  },
      ],
    },
    {
      label: "Content",
      items: [
        { id: "users",         label: "User Management", icon: Users       },
        { id: "posts",         label: "Posts",           icon: FileText    },
      ],
    },
    {
      label: "Verification",
      items: [
        { id: "journalists",   label: "Journalists",     icon: UserCheck   },
        { id: "organizations", label: "Organizations",   icon: Building2   },
      ],
    },
    {
      label: "Finance",
      items: [
        { id: "wallets",       label: "Wallets",         icon: Wallet      },
        { id: "donations",     label: "Donations",       icon: Send        },
      ],
    },
  ] as { label?: string; items: { id: Tab; label: string; icon: React.ElementType }[] }[];

  return (
    <aside className={cn("h-screen w-64 fixed left-0 top-0 flex flex-col z-50 bg-[#0f172a] border-r border-white/5 shadow-2xl transition-transform duration-300", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
      {/* ── Brand ── */}
      <div className="px-5 pt-7 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight tracking-wide">Admin Portal</h1>
            <p className="text-blue-400/60 text-[11px] font-mono uppercase tracking-widest mt-0.5">System Administration</p>
          </div>
        </div>

        {/* User badge */}
        {user?.name && (
          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold uppercase">
                {user.name.substring(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user.name}</p>
              <p className="text-white/35 text-[11px] font-mono">Administrator</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex-grow flex flex-col gap-0 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {/* divider + group label (skip for first group) */}
            {gi > 0 && (
              <div className="my-3 px-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-white/8" />
                {group.label && (
                  <span className="text-white/20 text-[9px] font-mono uppercase tracking-[0.18em] flex-shrink-0">
                    {group.label}
                  </span>
                )}
                <div className="flex-1 h-px bg-white/8" />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                        : "text-white/45 hover:text-white hover:bg-white/6"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-300 rounded-r-full" />
                    )}
                    <Icon className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-white/35 group-hover:text-white/70"
                    )} />
                    <span className="flex-1 text-left text-sm">{label}</span>
                    {isActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-blue-200/50 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer Buttons ── */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5 flex flex-col gap-2">
        {/* Go to Home */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/30"
        >
          <Home className="h-4 w-4 flex-shrink-0 transition-transform group-hover:-translate-y-0.5 duration-150" />
          <span className="flex-1 text-left">Go to Home</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-white/4 text-white/40 hover:bg-red-600/80 hover:text-white border border-white/5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-900/20"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>
    </aside>
  );
};

// ============================================================================
// Overview Reports Panel (embedded in Dashboard)
// ============================================================================

const OverviewReportsPanel = () => {
  const navigate = useNavigate();
  const [postReports, setPostReports] = useState<PostReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
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
      toast.error("Failed to load report details");
      setSelectedPostReport(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => { void loadReports(); }, [loadReports]);

  const reportedPosts = postReports.filter(
    (r) => r.totalReports > 0 || r.reports.length > 0
  );

  const getSeverityColor = (count: number) => {
    if (count >= 5) return { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800/50", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", icon: "bg-red-100 dark:bg-red-900/40 text-red-500", dot: "bg-red-500" };
    if (count >= 3) return { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800/50", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: "bg-orange-100 dark:bg-orange-900/40 text-orange-500", dot: "bg-orange-500" };
    return { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/40", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-500", dot: "bg-amber-400" };
  };

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {reportedPosts.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {reportedPosts.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => void loadReports()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reportedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-foreground">All clear!</p>
          <p className="text-xs text-muted-foreground mt-0.5">No reported posts at the moment.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
          {reportedPosts.slice(0, 7).map((report) => {
            const colors = getSeverityColor(report.totalReports);
            return (
              <motion.div
                key={report.postId}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer",
                  colors.bg, colors.border,
                  "hover:shadow-sm hover:scale-[1.01]"
                )}
                onClick={() => void openPostReportDetails(report.postId)}
              >
                {/* severity dot */}
                <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", colors.dot)} />

                {/* icon */}
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colors.icon)}>
                  <AlertTriangle className="h-4 w-4" />
                </div>

                {/* text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight" title={report.title}>
                    {report.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    ID: {report.postId.slice(0, 10)}…
                  </p>
                </div>

                {/* badge + eye */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", colors.badge)}>
                    {report.totalReports}×
                  </span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            );
          })}

          {reportedPosts.length > 7 && (
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              +{reportedPosts.length - 7} more flagged posts
            </p>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold leading-tight">Post Report Details</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {selectedPostReport
                    ? `${selectedPostReport.reports.length} report(s) for post #${selectedPostReport.postId}`
                    : "Loading report details…"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}
            </div>
          ) : !selectedPostReport || selectedPostReport.reports.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-5 text-center">
              No report details found.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {selectedPostReport.reports.map((item: PostReportItem, idx: number) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                  {/* report header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-foreground">{item.reporterName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.reporterRole}</Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(item.reportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {/* reason */}
                  <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-sm text-foreground leading-relaxed">{item.reason || "No reason provided."}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                if (!selectedPostReport) return;
                setDetailsOpen(false);
                navigate(`/article/${selectedPostReport.postId}`);
              }}
              disabled={!selectedPostReport}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Go to Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ============================================================================
// Tab: Overview - Enhanced Typography
// ============================================================================

const OverviewTab = ({ stats }: { stats: AdminDashboardStats | null }) => {
  if (!stats)
    return <div className="py-20 text-center text-muted-foreground text-base">Loading stats...</div>;

  return (
    <div className="space-y-10">

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-2xl font-bold">User Management</h3>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-outline" />
              <input 
                className="bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-primary font-body text-sm w-48 py-1" 
                placeholder="Filter by name or role..." 
                type="text"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-body font-semibold text-base">Total Active Users</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-headline">{stats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-body font-semibold text-base">Verified Journalists</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-headline">{stats.totalJournalists}</span>
            </div>
            <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-body font-semibold text-base">Organizations</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-headline">{stats.totalOrganizations}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <h3 className="font-headline text-2xl font-bold mb-6">Reported Posts</h3>
          <OverviewReportsPanel />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Tab: Users - Enhanced Table Typography
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
      const params: Parameters<typeof adminService.getUsers>[0] = {
        page, pageSize: 20,
        search: ""
      };
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
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
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
        <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Name", "Email", "Role", "Status", "Posts", "Followers", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-4 text-left font-semibold text-muted-foreground text-sm">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result?.data.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4 font-semibold text-foreground">{u.name}</td>
                    <td className="px-4 py-4 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-foreground">{u.postCount}</td>
                    <td className="px-4 py-4 text-foreground">{u.followerCount}</td>
                    <td className="px-4 py-4 text-muted-foreground text-sm">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
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
            <DialogTitle className="text-xl font-bold">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-muted-foreground font-medium">{k}</p>
                    <p className="font-semibold text-sm">{String(v)}</p>
                  </div>
                ))}
              </div>
              {selectedUser.journalistExternalId && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Journalist ID</p>
                  <p className="font-mono text-sm">{selectedUser.journalistExternalId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete User</DialogTitle>
            <DialogDescription className="text-sm">
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
// Tab: Posts - Enhanced Table Typography
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
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={modFilter} onValueChange={(v) => { setModFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
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
        <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Title", "Author", "Moderation", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-4 text-left font-semibold text-muted-foreground text-sm">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result?.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4 max-w-48 truncate font-semibold text-foreground" title={p.title}>
                      {p.title}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{p.authorName}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        moderationColor[normalizeModerationStatus(p.moderationStatus)] ?? "bg-gray-100 text-gray-600"
                      )}>
                        {moderationStatusLabel(p.moderationStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground text-sm">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
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
            <DialogTitle className="text-xl font-bold">Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Title</p>
                <p className="font-semibold text-lg">{selectedPost.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-muted-foreground font-medium">{k}</p>
                    <p className="font-semibold text-sm">{String(v)}</p>
                  </div>
                ))}
              </div>
              {selectedPost.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Content</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4 leading-relaxed">{selectedPost.content}</p>
              </div>
              {selectedPost.moderationNotes && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Moderation Notes</p>
                  <p className="text-sm bg-muted/20 rounded-lg p-3">{selectedPost.moderationNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!moderationDialog} onOpenChange={() => setModerationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Update Moderation Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Status</Label>
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
            <DialogTitle className="text-xl font-bold">Delete Post</DialogTitle>
            <DialogDescription className="text-sm">This post will be permanently deleted.</DialogDescription>
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
// Tab: Journalists - Enhanced Cards Typography
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
      <div className="flex gap-3 mb-6">
        <Button variant={subTab === "pending" ? "default" : "outline"} size="default" onClick={() => setSubTab("pending")}>
          Pending ({pending.length})
        </Button>
        <Button variant={subTab === "rejected" ? "default" : "outline"} size="default" onClick={() => setSubTab("rejected")}>
          Rejected ({rejected.length})
        </Button>
      </div>

      {subTab === "pending" && (
        loadingPending ? (
          <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-base">No pending journalist requests.</div>
        ) : (
          <div className="space-y-4">
            {pending.map((j) => (
              <div key={j.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{j.name}</p>
                    <p className="text-sm text-muted-foreground">{j.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press ID: {j.journalistExternalId} &middot; {formatDate(j.registeredAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="default"
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
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => { setReviewDialog(j); setApprove(false); setRejectionReason(""); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === "rejected" && (
        loadingRejected ? (
          <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
        ) : rejected.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-base">No rejected journalist requests.</div>
        ) : (
          <div className="space-y-4">
            {rejected.map((j) => (
              <div key={j.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{j.name}</p>
                    <p className="text-sm text-muted-foreground">{j.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press ID: {j.journalistId} &middot; {formatDate(j.registeredAt)}
                    </p>
                    {j.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {j.rejectionReason}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="default"
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
                  <RefreshCw className="h-4 w-4 mr-2" /> Reopen
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{approve ? "Approve" : "Reject"} Journalist Request</DialogTitle>
            {reviewDialog && (
              <DialogDescription className="text-sm">{reviewDialog.name} ({reviewDialog.email})</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button size="default" variant={approve ? "default" : "outline"} onClick={() => setApprove(true)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
              <Button size="default" variant={!approve ? "destructive" : "outline"} onClick={() => setApprove(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
            {!approve && (
              <div>
                <Label className="text-sm font-semibold">Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  className="mt-1"
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
// Tab: Organizations - Enhanced Cards Typography
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
      <div className="flex gap-3 mb-6">
        <Button variant={subTab === "pending" ? "default" : "outline"} size="default" onClick={() => setSubTab("pending")}>
          Pending ({pending.length})
        </Button>
        <Button variant={subTab === "rejected" ? "default" : "outline"} size="default" onClick={() => setSubTab("rejected")}>
          Rejected ({rejected.length})
        </Button>
      </div>

      {subTab === "pending" && (
        loadingPending ? (
          <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-base">No pending organization requests.</div>
        ) : (
          <div className="space-y-4">
            {pending.map((org) => (
              <div key={org.userId} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      License: {org.license} &middot; {formatDate(org.registeredAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="default"
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
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => { setReviewDialog(org.userId); setApprove(false); setRejectionReason(""); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === "rejected" && (
        loadingRejected ? (
          <div className="py-20 text-center text-muted-foreground text-base">Loading...</div>
        ) : rejected.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-base">No rejected organization requests.</div>
        ) : (
          <div className="space-y-4">
            {rejected.map((org) => (
              <div key={org.userId} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{org.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
            <DialogTitle className="text-xl font-bold">{approve ? "Approve" : "Reject"} Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button size="default" variant={approve ? "default" : "outline"} onClick={() => setApprove(true)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
              <Button size="default" variant={!approve ? "destructive" : "outline"} onClick={() => setApprove(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
            {!approve && (
              <div>
                <Label className="text-sm font-semibold">Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  className="mt-1"
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
// Tab: Wallets - Enhanced Typography
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
    <div className="space-y-5">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 py-2 text-sm"
          />
        </div>
        <Button variant="outline" size="default" onClick={loadWallets} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-base">Loading wallets...</div>
      ) : filteredWallets.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-base">
          {search ? "No wallets matching your search." : "No wallets found."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">User</th>
                  <th className="text-right py-4 px-4 font-semibold text-muted-foreground text-sm">Balance</th>
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">Last Updated</th>
                  <th className="text-right py-4 px-4 font-semibold text-muted-foreground text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWallets.map((w) => (
                  <tr key={w.walletId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-foreground">{w.userName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{w.userId}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={cn("font-bold text-base", w.balance >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatCurrency(w.balance)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground text-xs">
                      {formatDateTime(w.updatedAt)}
                    </td>
                    <td className="py-4 px-4 text-right">
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
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="h-5 w-5 text-accent" />
              Transaction History
            </DialogTitle>
            {selectedWallet && (
              <DialogDescription className="text-sm">
                {selectedWallet.userName} &middot; Balance: <span className="font-semibold">{formatCurrency(selectedWallet.balance)}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loadingTx ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No transactions found.</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className={cn(
                    "mt-0.5 p-1.5 rounded-full",
                    tx.amount >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {tx.amount >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{tx.description || tx.type}</p>
                      <span className={cn("font-bold text-sm whitespace-nowrap", tx.amount >= 0 ? "text-green-600" : "text-red-600")}>
                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <DollarSign className="h-5 w-5 text-accent" />
              Adjust Balance
            </DialogTitle>
            {adjustDialog && (
              <DialogDescription className="text-sm">
                {adjustDialog.userName} &middot; Current balance: <span className="font-semibold">{formatCurrency(adjustDialog.balance)}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount (positive to add, negative to deduct)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a positive number to credit, negative to debit.
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Description (optional)</Label>
              <Textarea
                placeholder="Reason for adjustment (optional)..."
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
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
// Tab: Donations (all platform donations) - Enhanced Typography
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
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Donations</p>
          <p className="text-3xl font-bold text-foreground">{donations.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-emerald-500">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Avg Donation</p>
          <p className="text-3xl font-bold text-foreground">
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
            className="pl-10 py-2 text-sm"
          />
        </div>
        <Button variant="outline" size="default" onClick={loadDonations} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-base">Loading donations...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-base">
          {search ? "No donations matching your search." : "No donations found."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">Sender</th>
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">Recipient</th>
                  <th className="text-right py-4 px-4 font-semibold text-muted-foreground text-sm">Amount</th>
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">Message</th>
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-foreground">{d.senderName}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-foreground">{d.recipientName}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-emerald-500 text-base">${d.amount.toFixed(2)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-muted-foreground truncate max-w-[200px] text-sm">{d.message || "—"}</p>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground text-xs whitespace-nowrap">
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
// Main AdminDashboard
// ============================================================================

type Tab = "overview" | "users" | "posts" | "journalists" | "organizations" | "wallets" | "donations";

const tabItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "journalists", label: "Journalists", icon: UserCheck },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "donations", label: "Donations", icon: Send },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const tabLabel: Record<Tab, string> = {
    overview: "Dashboard",
    users: "User Management",
    posts: "Posts",
    journalists: "Journalists",
    organizations: "Organizations",
    wallets: "Wallets",
    donations: "Donations",
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      <SideNavBar activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={logout} isSidebarOpen={isSidebarOpen} />

      <main className={cn("transition-all duration-300 w-full min-h-screen bg-background flex flex-col", isSidebarOpen ? "ml-64" : "ml-0")}>

        {/* ── Global Top Header ── */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border/50 px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-black/8 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline tracking-tight text-2xl font-bold text-on-surface leading-tight">
              The Veritas Archive
            </h2>
            <p className="font-label text-[11px] text-outline-variant tracking-[0.18em] uppercase mt-0.5">
              System Administration Portal · {tabLabel[activeTab]}
            </p>
          </div>
        </header>

        {/* ── Tab Content ── */}
        <div className="flex-1 p-8">
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
            {activeTab === "wallets" && <WalletsTab />}
            {activeTab === "donations" && <DonationsTab />}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;