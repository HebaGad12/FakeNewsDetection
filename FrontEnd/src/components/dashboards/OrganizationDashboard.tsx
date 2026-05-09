import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FileText,
  Wallet,
  UserPlus,
  Check,
  X,
  Clock,
  Heart,
  MessageSquare,
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
  LogOut,
  Home,
  Shield,
  ChevronRight,
  LayoutDashboard,
  Newspaper,
  Users as UsersIcon,
  Heart as HeartIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
// FIX #3: استبدال "Rejected" بـ "Removed" ليتطابق مع الـ backend
type PostFilter = "All" | "Pending" | "Approved" | "Removed";

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

// FIX #3: إزالة "Rejected" والاعتماد على "Removed" فقط كما يرسله الـ backend
const moderationColors: Record<string, string> = {
  Approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Removed: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const moderationIcons: Record<string, React.ReactNode> = {
  Approved: <Check className="h-3 w-3" />,
  Pending: <Clock className="h-3 w-3" />,
  Removed: <X className="h-3 w-3" />,
};

// ─── SideNavBar Component ──────────────────────────────────────────────────────

interface SideNavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  profile?: OrgProfileResponse | null;
  onLogout?: () => void;
}

const SideNavBar = ({ activeTab, onTabChange, profile, onLogout }: SideNavBarProps) => {
  const navigate = useNavigate();

  const navItems = [
    { id: "overview"   as Tab, icon: LayoutDashboard, label: "Dashboard"   },
    { id: "journalists" as Tab, icon: UsersIcon,       label: "Journalists" },
    { id: "posts"      as Tab, icon: Newspaper,        label: "Posts"       },
    { id: "followers"  as Tab, icon: HeartIcon,        label: "Followers"   },
    { id: "wallet"     as Tab, icon: Wallet,           label: "Wallet"      },
  ];

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "ORG";

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col z-40 bg-[#0f172a] border-r border-white/5 shadow-2xl">

      {/* ── Brand ── */}
      <div className="px-5 pt-7 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
            <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">Organization</h1>
            <p className="text-blue-400/60 text-[10px] font-mono uppercase tracking-widest mt-0.5">Management Portal</p>
          </div>
        </div>

        {/* User badge */}
        {profile && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.name}</p>
              <p className="text-white/35 text-[10px] font-mono truncate">{profile.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        <p className="text-white/20 text-[9px] font-mono uppercase tracking-[0.18em] px-2 mb-2">Navigation</p>
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left",
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
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-200/50 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* ── Footer Buttons ── */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5 flex flex-col gap-2">
        {/* Go to Home */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/30"
        >
          <Home className="h-4 w-4 flex-shrink-0 transition-transform group-hover:-translate-y-0.5 duration-150" />
          <span className="flex-1 text-left">Go to Home</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-white/4 text-white/40 hover:bg-red-600/80 hover:text-white border border-white/5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-900/20"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>
    </aside>
  );
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
        "relative rounded-xl border p-6 flex flex-col justify-between transition-all min-h-[180px]",
        accent
          ? "bg-primary text-white border-primary/50"
          : "bg-surface-container-lowest dark:bg-stone-900 border-outline-variant/20 dark:border-stone-800"
      )}
    >
      <div>
        <p className={cn("font-label text-xs uppercase tracking-widest mb-4", accent ? "text-white/70" : "text-outline dark:text-stone-500")}>
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className={cn("font-headline text-4xl font-bold tracking-tighter", accent ? "text-white" : "text-on-surface dark:text-white")}>
            {value}
          </span>
        </div>
      </div>
      {sub && (
        <p className={cn("text-xs mt-auto pt-3 border-t", accent ? "text-white/60 border-white/10" : "text-muted-foreground dark:text-stone-500 border-outline-variant/10 dark:border-stone-800")}>
          {sub}
        </p>
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
        className="bg-surface-container-lowest dark:bg-stone-900 border border-outline-variant/20 dark:border-stone-800 rounded-xl p-6 w-full max-w-md shadow-2xl"
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-on-surface dark:text-white mb-1">Journalist Added!</h3>
            <p className="text-sm text-outline dark:text-stone-400 mb-4">They are now active in your organization.</p>
            <Button onClick={onClose} className="bg-primary hover:bg-primary-dim text-white">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-on-surface dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Add Journalist
              </h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container dark:hover:bg-stone-800 text-outline dark:text-stone-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {(["name", "email", "licenceNumber"] as const).map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium text-on-surface dark:text-stone-200 mb-1.5 block capitalize">
                    {field === "licenceNumber" ? "Licence Number" : field}
                  </label>
                  <Input
                    value={form[field]}
                    onChange={update(field)}
                    placeholder={field === "licenceNumber" ? "e.g. LIC-2024-001" : `Enter ${field}`}
                    className="bg-surface-container dark:bg-stone-800 border-outline-variant/20 dark:border-stone-700 h-10 text-on-surface dark:text-stone-50"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-on-surface dark:text-stone-200 mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Set a password"
                    className="bg-surface-container dark:bg-stone-800 border-outline-variant/20 dark:border-stone-700 h-10 pr-10 text-on-surface dark:text-stone-50"
                  />
                  <button
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline dark:text-stone-500 hover:text-on-surface dark:hover:text-stone-200"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-tertiary-fixed text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1 h-10">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-10 bg-primary hover:bg-primary-dim text-white"
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
        className="bg-surface-container-lowest dark:bg-stone-900 border border-outline-variant/20 dark:border-stone-800 rounded-xl p-6 w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface dark:text-white">Review Post</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container dark:hover:bg-stone-800 text-outline dark:text-stone-500">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 p-4 rounded-xl bg-surface-container dark:bg-stone-800">
          <p className="font-medium text-on-surface dark:text-white text-sm mb-1">{post.title}</p>
          <p className="text-xs text-outline dark:text-stone-400 line-clamp-3">{post.content}</p>
          <p className="text-xs text-outline dark:text-stone-500 mt-2">
            By {post.authorName} · {fmtDate(post.createdAt)}
          </p>
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-on-surface dark:text-stone-200 mb-1.5 block">
            Notes <span className="text-outline dark:text-stone-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add moderation notes..."
            rows={3}
            className="w-full rounded-xl border border-outline-variant/20 dark:border-stone-700 bg-surface-container dark:bg-stone-800 px-4 py-3 text-sm text-on-surface dark:text-stone-50 placeholder:text-outline dark:placeholder:text-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
        {error && <p className="text-tertiary-fixed text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <Button
            onClick={() => handleReview(false)}
            disabled={loading}
            variant="outline"
            className="flex-1 h-10 border-tertiary-fixed/30 text-tertiary-fixed hover:bg-tertiary-fixed/10"
          >
            <X className="h-4 w-4 mr-1.5" /> Reject
          </Button>
          <Button
            onClick={() => handleReview(true)}
            disabled={loading}
            className="flex-1 h-10 bg-secondary hover:bg-secondary-dim text-white"
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
      className="group flex items-center gap-4 p-6 hover:bg-surface-container dark:hover:bg-stone-800/50 border-b border-outline-variant/10 dark:border-stone-800 last:border-0 transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-on-surface dark:text-white text-sm">{journalist.name}</p>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border font-bold tracking-widest uppercase",
              journalist.isActive
                ? "text-secondary-container bg-secondary-fixed/10 border-secondary/20"
                : "text-outline dark:text-stone-500 bg-surface-container dark:bg-stone-800 border-outline-variant/20 dark:border-stone-700"
            )}
          >
            {journalist.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-xs text-outline dark:text-stone-500">{journalist.email}</p>
        <p className="text-xs text-outline/70 dark:text-stone-600">
          Licence: {journalist.licenceNumber} · Joined {fmtDate(journalist.createdAt)}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        title={journalist.isActive ? "Deactivate" : "Activate"}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : journalist.isActive ? (
          <ToggleRight className="h-6 w-6 text-secondary-fixed hover:text-secondary-dim transition-colors" />
        ) : (
          <ToggleLeft className="h-6 w-6 text-outline dark:text-stone-500 hover:text-on-surface dark:hover:text-stone-200 transition-colors" />
        )}
      </button>
    </motion.div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  orgId,
  onStatusChanged,
  onReview,
}: {
  post: OrgPostResponse;
  orgId: string;
  onStatusChanged: (postId: string, isActive: boolean) => void;
  onReview: (post: OrgPostResponse) => void;
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const statusClass = moderationColors[post.moderationStatus] ?? "text-muted-foreground bg-muted border-border";

  const isActivePost = post.moderationStatus !== "Removed";

  const togglePostStatus = async () => {
    setStatusLoading(true);
    try {
      await organizationService.setPostStatus(orgId, post.id, !isActivePost);
      onStatusChanged(post.id, !isActivePost);
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group rounded-lg border border-outline-variant/20 dark:border-stone-800 bg-surface-container-low dark:bg-stone-900/50 p-6 hover:bg-surface-container dark:hover:bg-stone-800/50 hover:border-outline-variant/40 dark:hover:border-stone-700 transition-all"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 flex-shrink-0 bg-stone-300 dark:bg-stone-700 overflow-hidden rounded-sm flex-1 max-w-[60px]" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-bold tracking-widest uppercase", statusClass)}>
              {moderationIcons[post.moderationStatus]}
              {post.moderationStatus}
            </span>
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed border border-primary/20 font-bold tracking-widest uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="font-headline font-bold text-lg leading-snug text-on-surface dark:text-white group-hover:text-primary transition-colors line-clamp-1">
            {post.title}
          </h3>
          <p className="text-xs text-outline dark:text-stone-500 mt-1">
            {post.authorName} · {fmtDate(post.createdAt)}
          </p>
        </div>
      </div>

      {post.moderationNotes && (
        <div className="text-xs text-tertiary-dim dark:text-tertiary-fixed bg-tertiary-fixed/5 dark:bg-tertiary-fixed/10 border border-tertiary-fixed/15 dark:border-tertiary-fixed/20 rounded-lg px-3 py-2 mb-3">
          Note: {post.moderationNotes}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 dark:border-stone-800">
        <div className="flex items-center gap-4 text-sm text-outline dark:text-stone-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-tertiary-fixed" /> {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> {post.comments}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {post.moderationStatus === "Pending" && (
            <Button
              size="sm"
              onClick={() => onReview(post)}
              className="h-8 bg-primary hover:bg-primary-dim text-white text-xs gap-1.5"
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Review
            </Button>
          )}
          <button
            onClick={togglePostStatus}
            disabled={statusLoading}
            title={isActivePost ? "Deactivate post" : "Activate post"}
          >
            {statusLoading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : isActivePost ? (
              <ToggleRight className="h-6 w-6 text-secondary-fixed hover:text-secondary-dim transition-colors" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-outline dark:text-stone-500 hover:text-on-surface dark:hover:text-stone-200 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: OrgWalletTransactionResponse }) {
  const isCredit = tx.amount > 0;
  return (
    <div className="flex items-center gap-3 py-4 border-b border-outline-variant/10 dark:border-stone-800 last:border-0">
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
          isCredit ? "bg-secondary-fixed/15 text-secondary-fixed" : "bg-tertiary-fixed/15 text-tertiary-fixed"
        )}
      >
        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface dark:text-white truncate">{tx.description}</p>
        <p className="text-xs text-outline dark:text-stone-500">
          {tx.type}{tx.donorName ? ` · ${tx.donorName}` : ""} · {fmtDate(tx.createdAt)}
        </p>
      </div>
      <span className={cn("font-headline font-bold text-sm tabular-nums", isCredit ? "text-secondary-fixed" : "text-tertiary-fixed")}>
        {isCredit ? "+" : ""}{fmtCurrency(tx.amount)}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const OrganizationDashboard = () => {
  // FIX #4: حذف useNavigate لأنه غير مستخدم
  const { logout } = useAuth();
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

  // FIX #3: استخدام "Removed" بدل "Rejected" كقيمة افتراضية في الفلتر
  const [postFilter, setPostFilter] = useState<PostFilter>("All");
  const [journalistSearch, setJournalistSearch] = useState("");
  const [showAddJournalist, setShowAddJournalist] = useState(false);
  const [reviewPost, setReviewPost] = useState<OrgPostResponse | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const prof = await organizationService.getMyOrganization();
      const resolvedId = prof.id;
      setOrgId(resolvedId);
      setProfile(prof);

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

  useEffect(() => {
    loadAll();
  }, []);

  // FIX #3: الفلترة تعتمد على "Removed" مباشرة بدل الـ workaround
  const filteredPosts = posts.filter((p) => {
    if (postFilter === "All") return true;
    return p.moderationStatus === postFilter;
  });

  const filteredJournalists = journalists.filter(
    (j) =>
      j.name.toLowerCase().includes(journalistSearch.toLowerCase()) ||
      j.email.toLowerCase().includes(journalistSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-outline dark:text-stone-500 text-sm">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-tertiary-fixed/15 text-tertiary-fixed flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="font-medium text-on-surface dark:text-white">{loadError}</p>
          <Button onClick={loadAll} className="bg-primary hover:bg-primary-dim text-white gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-stone-950">
      <SideNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="ml-64 p-8 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <span className="font-label text-xs uppercase tracking-[0.2em] text-outline dark:text-stone-500 mb-2 block">
              Institutional Intelligence
            </span>
            <h1 className="font-headline text-5xl font-bold text-on-surface dark:text-white tracking-tight">
              {profile?.name ?? "Organization Dashboard"}
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            {analytics && (
              <>
                <div className="text-right">
                  <p className="font-label text-xs text-outline dark:text-stone-500">Active Posts</p>
                  <p className="font-sans text-sm font-bold text-on-surface dark:text-white">
                    {posts.filter((p) => p.moderationStatus === "Approved").length}
                  </p>
                </div>
                <div className="w-1 h-12 bg-outline-variant/20 dark:bg-stone-800" />
                <div className="text-right">
                  <p className="font-label text-xs text-outline dark:text-stone-500">Pending Review</p>
                  <p className="font-sans text-sm font-bold text-on-surface dark:text-white">
                    {posts.filter((p) => p.moderationStatus === "Pending").length}
                  </p>
                </div>
              </>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && analytics && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Bento Grid */}
              <section className="grid grid-cols-12 gap-6 mb-12">
                {/* Organization Status Card - full width now */}
                <div className="col-span-12 bg-primary dark:bg-primary-dim p-8 text-white flex flex-col justify-between rounded-lg border border-primary/50">
                  <div>
                    <h3 className="font-headline text-2xl font-bold mb-2">Organization Status</h3>
                    <p className="font-body text-white/80 text-sm">
                      {profile?.isActive ? "Your organization is active and verified." : "Your organization is currently inactive."}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/10 rounded-sm">
                      <div className="flex items-center gap-3">
                        <span>✓</span>
                        <span className="text-xs font-label">Total Followers</span>
                      </div>
                      <span className="text-sm uppercase tracking-wider font-bold">{fmt(profile?.totalFollowers ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/10 rounded-sm">
                      <div className="flex items-center gap-3">
                        <span>◆</span>
                        <span className="text-xs font-label">Wallet Balance</span>
                      </div>
                      <span className="text-sm uppercase tracking-wider font-bold">{fmtCurrency(profile?.walletBalance ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Content Grid */}
              <div className="grid grid-cols-12 gap-8">
                {/* Journalists Roster */}
                <section className="col-span-12 lg:col-span-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Recent Journalists</h2>
                    <Button
                      onClick={() => setShowAddJournalist(true)}
                      className="bg-primary hover:bg-primary-dim text-white text-xs gap-1.5 h-10"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Journalist
                    </Button>
                  </div>
                  <div className="space-y-px rounded-lg border border-outline-variant/20 dark:border-stone-800 overflow-hidden bg-surface-container-lowest dark:bg-stone-900">
                    {journalists.slice(0, 3).map((j) => (
                      <div
                        key={j.id}
                        className="group bg-surface-container-low dark:bg-stone-900/50 hover:bg-surface-container dark:hover:bg-stone-800 p-6 transition-colors flex items-center gap-6 border-b border-outline-variant/10 dark:border-stone-800 last:border-0"
                      >
                        <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-sm flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {j.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="bg-secondary-fixed/10 text-on-secondary-fixed text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase border border-secondary/20">
                              {j.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="font-label text-[10px] text-outline dark:text-stone-500">{j.email}</span>
                          </div>
                          <h4 className="font-headline text-lg font-bold leading-snug text-on-surface dark:text-white group-hover:text-primary transition-colors">
                            {j.name}
                          </h4>
                        </div>
                        {/* FIX #1 + #2: زر Eye ينقل للـ journalists tab، وزر Toggle يحدّث الـ state */}
                        <div className="flex gap-4">
                          <button
                            onClick={() => setActiveTab("journalists")}
                            title="View all journalists"
                            className="w-10 h-10 border border-outline-variant/20 dark:border-stone-700 flex items-center justify-center hover:bg-white dark:hover:bg-stone-800 transition-colors rounded-sm"
                          >
                            <Eye className="h-4 w-4 text-on-surface dark:text-stone-300" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await organizationService.setJournalistStatus(orgId, j.id, !j.isActive);
                                // FIX #2: تحديث الـ state بعد نجاح الـ API call
                                setJournalists((prev) =>
                                  prev.map((jj) => (jj.id === j.id ? { ...jj, isActive: !jj.isActive } : jj))
                                );
                              } catch {
                                // يمكن إضافة error handling هنا
                              }
                            }}
                            title={j.isActive ? "Deactivate journalist" : "Activate journalist"}
                            className="w-10 h-10 bg-primary text-white flex items-center justify-center hover:bg-primary-dim transition-colors rounded-sm"
                          >
                            {j.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    {journalists.length === 0 && (
                      <p className="text-center py-8 text-outline dark:text-stone-500 text-sm">No journalists yet.</p>
                    )}
                    {/* FIX #5: إضافة "View All" إذا كان عدد الصحفيين أكثر من 3 */}
                    {journalists.length > 3 && (
                      <button
                        onClick={() => setActiveTab("journalists")}
                        className="w-full py-3 text-xs text-primary hover:bg-surface-container dark:hover:bg-stone-800 transition-colors font-medium flex items-center justify-center gap-1"
                      >
                        View all {journalists.length} journalists →
                      </button>
                    )}
                  </div>
                </section>

                {/* Summary Stats */}
                <section className="col-span-12 lg:col-span-4">
                  <div className="bg-surface-container-lowest dark:bg-stone-900 p-6 rounded-lg border border-outline-variant/20 dark:border-stone-800 space-y-6">
                    <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Quick Stats</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container dark:bg-stone-800">
                        <div>
                          <p className="font-label text-xs text-outline dark:text-stone-500">Total Posts</p>
                          <p className="font-headline text-2xl font-bold text-on-surface dark:text-white mt-1">
                            {analytics.totalPosts}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-primary opacity-40" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container dark:bg-stone-800">
                        <div>
                          <p className="font-label text-xs text-outline dark:text-stone-500">Total Likes</p>
                          <p className="font-headline text-2xl font-bold text-on-surface dark:text-white mt-1">
                            {fmt(analytics.totalLikesReceived)}
                          </p>
                        </div>
                        <Heart className="h-8 w-8 text-secondary-fixed opacity-40" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container dark:bg-stone-800">
                        <div>
                          <p className="font-label text-xs text-outline dark:text-stone-500">Pending Posts</p>
                          <p className="font-headline text-2xl font-bold text-tertiary-fixed mt-1">
                            {analytics.pendingPosts}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-tertiary-fixed opacity-40" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {/* JOURNALISTS TAB */}
          {activeTab === "journalists" && (
            <motion.div key="journalists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-outline dark:text-stone-500" />
                  <Input
                    placeholder="Search journalists..."
                    value={journalistSearch}
                    onChange={(e) => setJournalistSearch(e.target.value)}
                    className="pl-11 h-11 bg-surface-container dark:bg-stone-800 border-outline-variant/20 dark:border-stone-700 text-on-surface dark:text-stone-50"
                  />
                </div>
                <Button
                  onClick={() => setShowAddJournalist(true)}
                  className="h-11 bg-primary hover:bg-primary-dim text-white gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> Add Journalist
                </Button>
              </div>

              <div className="rounded-lg border border-outline-variant/20 dark:border-stone-800 bg-surface-container-lowest dark:bg-stone-900">
                <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/10 dark:border-stone-800">
                  <p className="text-sm text-outline dark:text-stone-500">
                    {filteredJournalists.length} journalist{filteredJournalists.length !== 1 ? "s" : ""}
                    {" · "}
                    <span className="text-secondary-fixed">{journalists.filter((j) => j.isActive).length} active</span>
                  </p>
                </div>
                <div>
                  {filteredJournalists.length > 0 ? (
                    filteredJournalists.map((j) => (
                      <JournalistRow
                        key={j.id}
                        journalist={j}
                        orgId={orgId}
                        onStatusChanged={(id, isActive) =>
                          setJournalists((prev) => prev.map((jj) => (jj.id === id ? { ...jj, isActive } : jj)))
                        }
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-outline dark:text-stone-500">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-25" />
                      <p>{journalistSearch ? "No matching journalists." : "No journalists yet."}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* POSTS TAB */}
          {activeTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {/* FIX #3: الفلاتر تستخدم "Removed" بدل "Rejected" */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["All", "Pending", "Approved", "Removed"] as PostFilter[]).map((f) => {
                  const count =
                    f === "All"
                      ? posts.length
                      : posts.filter((p) => p.moderationStatus === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setPostFilter(f)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                        postFilter === f
                          ? "bg-primary text-white"
                          : "bg-surface-container dark:bg-stone-800 text-outline dark:text-stone-400 hover:bg-surface-container-high dark:hover:bg-stone-700"
                      )}
                    >
                      {f}
                      <span
                        className={cn(
                          "text-xs px-1.5 rounded-full",
                          postFilter === f ? "bg-white/20 text-white" : "bg-outline-variant/20 dark:bg-stone-700 text-on-surface dark:text-stone-300"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredPosts.length > 0 ? (
                <div className="space-y-px">
                  {filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      orgId={orgId}
                      onReview={setReviewPost}
                      onStatusChanged={(postId, isActive) =>
                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === postId
                              ? { ...p, moderationStatus: isActive ? "Approved" : "Removed" }
                              : p
                          )
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-outline dark:text-stone-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p>No {postFilter !== "All" ? postFilter.toLowerCase() : ""} posts found.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* FOLLOWERS TAB */}
          {activeTab === "followers" && (
            <motion.div key="followers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="rounded-lg border border-outline-variant/20 dark:border-stone-800 bg-surface-container-lowest dark:bg-stone-900 p-6">
                <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white mb-6">
                  Your Followers ({followers.length})
                </h2>
                <div className="space-y-1">
                  {followers.length > 0 ? (
                    followers.map((f) => {
                      const initials = f.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <motion.div
                          key={f.userId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-container dark:hover:bg-stone-800 transition-colors border-b border-outline-variant/10 dark:border-stone-800 last:border-0"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-on-surface dark:text-white text-sm truncate">{f.name}</p>
                            <p className="text-xs text-outline dark:text-stone-500">{f.email}</p>
                          </div>
                          <p className="text-xs text-outline/60 dark:text-stone-600 flex-shrink-0">Since {fmtDate(f.followedAt)}</p>
                        </motion.div>
                      );
                    })
                  ) : (
                    <p className="text-center py-12 text-outline dark:text-stone-500 text-sm">No followers yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* WALLET TAB */}
          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Balance Card */}
              {wallet && (
                <div className="relative overflow-hidden rounded-lg bg-primary dark:bg-primary-dim p-8 text-white border border-primary/50">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                  <p className="text-white/70 text-sm mb-2">Current Balance</p>
                  <p className="text-5xl font-bold text-white tracking-tight">{fmtCurrency(wallet.balance)}</p>
                  <p className="text-white/50 text-xs mt-3">Last updated {fmtDate(wallet.updatedAt)}</p>
                  <div className="mt-6 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/60" />
                    <span className="text-white/70 text-sm">{wallet.organizationName}</span>
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div className="rounded-lg border border-outline-variant/20 dark:border-stone-800 bg-surface-container-lowest dark:bg-stone-900 p-6">
                <h3 className="font-headline text-2xl font-bold text-on-surface dark:text-white mb-6">
                  Transaction History
                </h3>
                {transactions.length > 0 ? (
                  <div>
                    {transactions.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-outline dark:text-stone-500">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">No transactions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
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