import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  Users,
  FileText,
  Wallet,
  UserPlus,
  Check,
  X,
  Clock,
  ChevronRight,
  TrendingUp,
  Heart,
  MessageSquare,
  Flag,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Eye,
  EyeOff,
  BadgeCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import organizationService, {
  OrgProfileResponse,
  OrgAnalyticsResponse,
  OrgJournalistResponse,
  OrgPostResponse,
  OrgFollowerResponse,
  OrgWalletResponse,
  OrgWalletTransactionResponse,
} from "@/services/organizationService";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "journalists" | "posts" | "followers" | "wallet";
type PostFilter = "All" | "Pending" | "Approved" | "Rejected";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const moderationColors: Record<string, string> = {
  Approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Rejected: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  Removed: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const moderationIcons: Record<string, React.ReactNode> = {
  Approved: <Check className="h-3 w-3" />,
  Pending: <Clock className="h-3 w-3" />,
  Rejected: <X className="h-3 w-3" />,
  Removed: <X className="h-3 w-3" />,
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  delay = 0,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  delay?: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        "relative group rounded-2xl border p-5 transition-all hover:shadow-lg",
        accent
          ? "bg-accent border-accent/30 hover:shadow-accent/20"
          : "bg-card border-border hover:border-accent/40 hover:shadow-accent/5"
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 bg-accent" />
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", accent ? "bg-white/15 text-white" : "bg-accent/10 text-accent")}>
          {icon}
        </div>
        <TrendingUp className={cn("h-4 w-4 opacity-40", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <p className={cn("text-2xl font-bold tracking-tight", accent ? "text-white" : "text-foreground")}>{value}</p>
      <p className={cn("text-sm mt-0.5", accent ? "text-white/70" : "text-muted-foreground")}>{label}</p>
      {sub && (
        <p className={cn("text-xs mt-1 font-medium", accent ? "text-white/50" : "text-muted-foreground/60")}>{sub}</p>
      )}
    </motion.div>
  );
}

// ─── Add Journalist Modal ─────────────────────────────────────────────────────

function AddJournalistModal({
  orgId,
  onClose,
  onAdded,
}: {
  orgId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", licenceNumber: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.licenceNumber) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await organizationService.addJournalist(orgId, form);
      setSuccess(true);
      onAdded();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Failed to add journalist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-400/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Journalist Added!</h3>
            <p className="text-sm text-muted-foreground mb-4">They are now active in your organization.</p>
            <Button onClick={onClose} className="bg-accent hover:bg-accent/90 text-accent-foreground">Done</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                Add Journalist
              </h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {(["name", "email", "licenceNumber"] as const).map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium text-foreground mb-1.5 block capitalize">
                    {field === "licenceNumber" ? "Licence Number" : field}
                  </label>
                  <Input
                    value={form[field]}
                    onChange={update(field)}
                    placeholder={field === "licenceNumber" ? "e.g. LIC-2024-001" : `Enter ${field}`}
                    className="bg-muted border-border h-10"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Set a password"
                    className="bg-muted border-border h-10 pr-10"
                  />
                  <button
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-rose-400 text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1 h-10">Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-10 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Add Journalist"}
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Review Post Modal ────────────────────────────────────────────────────────

function ReviewPostModal({
  orgId,
  post,
  onClose,
  onReviewed,
}: {
  orgId: string;
  post: OrgPostResponse;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReview = async (approve: boolean) => {
    setLoading(true);
    setError("");
    try {
      await organizationService.reviewPost(orgId, post.id, approve, notes || undefined);
      onReviewed();
      onClose();
    } catch {
      setError("Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Review Post</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 p-4 rounded-xl bg-muted">
          <p className="font-medium text-foreground text-sm mb-1">{post.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
          <p className="text-xs text-muted-foreground mt-2">By {post.authorName} · {fmtDate(post.createdAt)}</p>
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add moderation notes..."
            rows={3}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
          />
        </div>
        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <Button
            onClick={() => handleReview(false)}
            disabled={loading}
            variant="outline"
            className="flex-1 h-10 border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
          >
            <X className="h-4 w-4 mr-1.5" /> Reject
          </Button>
          <Button
            onClick={() => handleReview(true)}
            disabled={loading}
            className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-500/90 text-white"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check className="h-4 w-4 mr-1.5" /> Approve</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Journalist Row ───────────────────────────────────────────────────────────

function JournalistRow({
  journalist,
  orgId,
  onStatusChanged,
}: {
  journalist: OrgJournalistResponse;
  orgId: string;
  onStatusChanged: (id: string, isActive: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      await organizationService.setJournalistStatus(orgId, journalist.id, !journalist.isActive);
      onStatusChanged(journalist.id, !journalist.isActive);
    } finally {
      setLoading(false);
    }
  };

  const initials = journalist.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground text-sm">{journalist.name}</p>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full border",
            journalist.isActive
              ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : "text-muted-foreground bg-muted border-border"
          )}>
            {journalist.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{journalist.email}</p>
        <p className="text-xs text-muted-foreground/60">Licence: {journalist.licenceNumber} · Joined {fmtDate(journalist.createdAt)}</p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        title={journalist.isActive ? "Deactivate" : "Activate"}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        ) : journalist.isActive ? (
          <ToggleRight className="h-6 w-6 text-emerald-400 hover:text-emerald-300 transition-colors" />
        ) : (
          <ToggleLeft className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
        )}
      </button>
    </motion.div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  orgId,
  onReview,
}: {
  post: OrgPostResponse;
  orgId: string;
  onReview: (post: OrgPostResponse) => void;
}) {
  const statusClass = moderationColors[post.moderationStatus] ?? "text-muted-foreground bg-muted border-border";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-border/80 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", statusClass)}>
              {moderationIcons[post.moderationStatus]}
              {post.moderationStatus}
            </span>
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                #{tag}
              </span>
            ))}
          </div>
          <h3 className="font-semibold text-foreground line-clamp-1">{post.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            By <span className="text-foreground/80">{post.authorName}</span> · {fmtDate(post.createdAt)}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
        </div>
      </div>

      {post.moderationNotes && (
        <div className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2 mb-3">
          Note: {post.moderationNotes}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-400" /> {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> {post.comments}
          </span>
        </div>
        {post.moderationStatus === "Pending" && (
          <Button
            size="sm"
            onClick={() => onReview(post)}
            className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Review
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: OrgWalletTransactionResponse }) {
  const isCredit = tx.amount > 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
        isCredit ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
      )}>
        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
        <p className="text-xs text-muted-foreground">
          {tx.type}{tx.donorName ? ` · ${tx.donorName}` : ""} · {fmtDate(tx.createdAt)}
        </p>
      </div>
      <span className={cn("font-semibold text-sm tabular-nums", isCredit ? "text-emerald-400" : "text-rose-400")}>
        {isCredit ? "+" : ""}{fmtCurrency(tx.amount)}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const OrganizationDashboard = () => {
  // orgId is resolved from the /me endpoint to guarantee it matches the JWT claim
  // that the backend uses in ResolveOrgUser(). Never rely on AuthContext id shape.
  const [orgId, setOrgId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<OrgProfileResponse | null>(null);
  const [analytics, setAnalytics] = useState<OrgAnalyticsResponse | null>(null);
  const [journalists, setJournalists] = useState<OrgJournalistResponse[]>([]);
  const [posts, setPosts] = useState<OrgPostResponse[]>([]);
  const [followers, setFollowers] = useState<OrgFollowerResponse[]>([]);
  const [wallet, setWallet] = useState<OrgWalletResponse | null>(null);
  const [transactions, setTransactions] = useState<OrgWalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [postFilter, setPostFilter] = useState<PostFilter>("All");
  const [journalistSearch, setJournalistSearch] = useState("");
  const [showAddJournalist, setShowAddJournalist] = useState(false);
  const [reviewPost, setReviewPost] = useState<OrgPostResponse | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      // Step 1: fetch profile first to get the canonical orgId from the server
      const prof = await organizationService.getMyOrganization();
      const resolvedId = prof.id;
      setOrgId(resolvedId);
      setProfile(prof);

      // Step 2: fetch everything else in parallel using the verified id
      const [anal, journs, ps, fols, wal, txs] = await Promise.all([
        organizationService.getAnalytics(resolvedId),
        organizationService.getJournalists(resolvedId),
        organizationService.getOrganizationPosts(resolvedId),
        organizationService.getFollowers(resolvedId),
        organizationService.getWallet(resolvedId),
        organizationService.getWalletTransactions(resolvedId),
      ]);
      setAnalytics(anal);
      setJournalists(journs);
      setPosts(ps);
      setFollowers(fols);
      setWallet(wal);
      setTransactions(txs);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status === 401) setLoadError("Session expired. Please log in again.");
      else if (status === 403) setLoadError("Access denied. Make sure you are logged in as an Organization.");
      else setLoadError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredPosts = posts.filter((p) => {
    if (postFilter === "All") return true;
    if (postFilter === "Rejected") return p.moderationStatus === "Rejected" || p.moderationStatus === "Removed";
    return p.moderationStatus === postFilter;
  });

  const filteredJournalists = journalists.filter(
    (j) =>
      j.name.toLowerCase().includes(journalistSearch.toLowerCase()) ||
      j.email.toLowerCase().includes(journalistSearch.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 className="h-4 w-4" /> },
    { id: "journalists", label: "Journalists", icon: <Users className="h-4 w-4" />, badge: journalists.length },
    {
      id: "posts", label: "Posts", icon: <FileText className="h-4 w-4" />,
      badge: posts.filter((p) => p.moderationStatus === "Pending").length || undefined,
    },
    { id: "followers", label: "Followers", icon: <Heart className="h-4 w-4" />, badge: followers.length },
    { id: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-400/10 text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="font-medium text-foreground">{loadError}</p>
          <Button onClick={loadAll} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
              Organization Dashboard
            </h1>
            <p className="text-muted-foreground">
              Managing{" "}
              <span className="text-foreground font-medium">{profile?.name ?? "..."}</span>
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:border-accent/50 hover:shadow-md transition-all text-sm font-medium text-foreground w-fit"
          >
            <RefreshCw className="h-4 w-4 text-accent" />
            Refresh
          </button>
        </div>

        {/* ── Profile Card ── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 mb-8"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent font-bold text-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-xl text-foreground">{profile.name}</h2>
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full border font-medium",
                    profile.isActive
                      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                      : "text-rose-400 bg-rose-400/10 border-rose-400/20"
                  )}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Member since {fmtDate(profile.createdAt)}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{fmt(profile.totalFollowers)}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{fmt(profile.totalPosts)}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{fmtCurrency(profile.walletBalance)}</p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-8 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-accent text-accent-foreground"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === "overview" && analytics && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<FileText className="h-5 w-5" />} label="Total Posts" value={analytics.totalPosts} delay={0} />
                <StatCard icon={<Users className="h-5 w-5" />} label="Journalists" value={analytics.journalistCount}
                  sub={`${analytics.activeJournalistCount} active`} delay={0.05} />
                <StatCard icon={<Heart className="h-5 w-5" />} label="Total Likes" value={fmt(analytics.totalLikesReceived)} delay={0.1} />
                <StatCard icon={<Wallet className="h-5 w-5" />} label="Wallet Balance" value={fmtCurrency(analytics.walletBalance)} delay={0.15} accent />
              </div>

              {/* Post breakdown */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Pending Review", val: analytics.pendingPosts, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                  { label: "Approved", val: analytics.approvedPosts, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
                  { label: "Rejected", val: analytics.rejectedPosts, color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={cn("rounded-2xl border p-4 text-center", item.bg)}
                    onClick={() => { setActiveTab("posts"); setPostFilter(item.label === "Pending Review" ? "Pending" : item.label as PostFilter); }}
                  >
                    <p className={cn("text-3xl font-bold", item.color)}>{item.val}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center justify-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Engagement */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-4">Engagement Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: <Heart className="h-4 w-4" />, label: "Likes", val: analytics.totalLikesReceived, color: "text-rose-400" },
                    { icon: <MessageSquare className="h-4 w-4" />, label: "Comments", val: analytics.totalCommentsReceived, color: "text-blue-400" },
                    { icon: <Flag className="h-4 w-4" />, label: "Reports", val: analytics.totalReportsReceived, color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className={cn("flex justify-center mb-2", s.color)}>{s.icon}</div>
                      <p className="text-2xl font-bold text-foreground">{fmt(s.val)}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* JOURNALISTS */}
          {activeTab === "journalists" && (
            <motion.div key="journalists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search journalists..."
                    value={journalistSearch}
                    onChange={(e) => setJournalistSearch(e.target.value)}
                    className="pl-11 h-11 bg-card border-border"
                  />
                </div>
                <Button
                  onClick={() => setShowAddJournalist(true)}
                  className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> Add Journalist
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-2">
                <div className="px-3 py-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredJournalists.length} journalist{filteredJournalists.length !== 1 ? "s" : ""}
                    {" · "}<span className="text-emerald-400">{journalists.filter((j) => j.isActive).length} active</span>
                  </p>
                </div>
                <AnimatePresence>
                  {filteredJournalists.map((j) => (
                    <JournalistRow
                      key={j.id}
                      journalist={j}
                      orgId={orgId}
                      onStatusChanged={(id, isActive) =>
                        setJournalists((prev) => prev.map((jj) => jj.id === id ? { ...jj, isActive } : jj))
                      }
                    />
                  ))}
                </AnimatePresence>
                {filteredJournalists.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p>{journalistSearch ? "No matching journalists." : "No journalists yet."}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* POSTS */}
          {activeTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {/* Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {(["All", "Pending", "Approved", "Rejected"] as PostFilter[]).map((f) => {
                  const count = f === "All" ? posts.length
                    : f === "Rejected" ? posts.filter((p) => p.moderationStatus === "Rejected" || p.moderationStatus === "Removed").length
                    : posts.filter((p) => p.moderationStatus === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setPostFilter(f)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                        postFilter === f
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {f}
                      <span className={cn(
                        "text-xs px-1.5 rounded-full",
                        postFilter === f ? "bg-white/20" : "bg-border text-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} orgId={orgId} onReview={setReviewPost} />
                ))}
              </AnimatePresence>
              {filteredPosts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p>No {postFilter !== "All" ? postFilter.toLowerCase() : ""} posts found.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* FOLLOWERS */}
          {activeTab === "followers" && (
            <motion.div key="followers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-semibold text-foreground mb-4 px-1">Your Followers ({followers.length})</h2>
                <div className="space-y-1">
                  {followers.map((f) => {
                    const initials = f.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <motion.div
                        key={f.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.email} · {f.role}</p>
                        </div>
                        <p className="text-xs text-muted-foreground/60 flex-shrink-0">Since {fmtDate(f.followedAt)}</p>
                      </motion.div>
                    );
                  })}
                  {followers.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground text-sm">No followers yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* WALLET */}
          {activeTab === "wallet" && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              {/* Balance Card */}
              {wallet && (
                <div className="relative overflow-hidden rounded-2xl bg-accent p-6">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                  <p className="text-white/70 text-sm mb-1">Current Balance</p>
                  <p className="text-4xl font-bold text-white tracking-tight">{fmtCurrency(wallet.balance)}</p>
                  <p className="text-white/50 text-xs mt-2">Last updated {fmtDate(wallet.updatedAt)}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/60" />
                    <span className="text-white/70 text-sm">{wallet.organizationName}</span>
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-4">Transaction History</h3>
                {transactions.length > 0 ? (
                  <div>
                    {transactions.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">No transactions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <Footer />

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddJournalist && (
          <AddJournalistModal
            orgId={orgId}
            onClose={() => setShowAddJournalist(false)}
            onAdded={() => organizationService.getJournalists(orgId).then(setJournalists)}
          />
        )}
        {reviewPost && (
          <ReviewPostModal
            orgId={orgId}
            post={reviewPost}
            onClose={() => setReviewPost(null)}
            onReviewed={() => organizationService.getOrganizationPosts(orgId).then(setPosts)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationDashboard;