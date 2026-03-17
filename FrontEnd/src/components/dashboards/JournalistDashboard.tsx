import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FileText,
  Users,
  UserCheck,
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  Heart,
  MessageSquare,
  Flag,
  Edit3,
  X,
  Check,
  AlertCircle,
  Clock,
  ChevronRight,
  BarChart2,
  LogOut,
  Bell,
  Settings,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import journalistService, {
  JournalistResponse,
  JournalistPostResponse,
  JournalistFollowingResponse,
  JournalistFollowerResponse,
} from "@/services/journalistService";
import donationService, {
  WalletResponse,
  WalletTransactionResponse,
  DonationRecord,
} from "@/services/donationService";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "posts" | "following" | "followers" | "create" | "wallet";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  Approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Rejected: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const statusIcon: Record<string, React.ReactNode> = {
  Approved: <Check className="h-3 w-3" />,
  Pending: <Clock className="h-3 w-3" />,
  Rejected: <X className="h-3 w-3" />,
};

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative group rounded-2xl border border-border bg-card p-5 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-accent/10 text-accent">{icon}</div>
        <TrendingUp className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent/60 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}

function PostCard({
  post,
  onDelete,
  onViewReport,
}: {
  post: JournalistPostResponse;
  onDelete: (id: string) => void;
  onViewReport: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      await journalistService.deletePost(post.id);
      onDelete(post.id);
    } catch {
      setDeleting(false);
    }
  };

  const statusClass = statusColor[post.moderationStatus] ?? "text-muted-foreground bg-muted border-border";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-border/80 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium",
                statusClass
              )}
            >
              {statusIcon[post.moderationStatus]}
              {post.moderationStatus}
            </span>
            {post.organizationName !== "Independent" && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {post.organizationName}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground line-clamp-1">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            {post.comments}
          </span>
          <span className="flex items-center gap-1">
            <Flag className="h-3.5 w-3.5 text-amber-400" />
            {post.reports}
          </span>
          <span className="text-xs opacity-60">
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onViewReport(post.id)}
            className="p-1.5 rounded-lg hover:bg-accent/10 hover:text-accent text-muted-foreground transition-colors"
            title="View analytics"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-colors"
            title="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function UserRow({
  name,
  role,
  followers,
  onUnfollow,
  id,
}: {
  name: string;
  role: string;
  followers: number;
  onUnfollow?: (id: string) => void;
  id: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">
          {role} · {formatNum(followers)} followers
        </p>
      </div>
      {onUnfollow && (
        <button
          onClick={() => onUnfollow(id)}
          className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-rose-400/50 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
        >
          Unfollow
        </button>
      )}
    </motion.div>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof journalistService.getPostReport>
  > | null>(null);

  useEffect(() => {
    journalistService
      .getPostReport(postId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" />
            Post Analytics
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="font-medium text-foreground">{data.title}</p>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium",
                statusColor[data.moderationStatus] ?? "text-muted-foreground bg-muted border-border"
              )}
            >
              {statusIcon[data.moderationStatus]}
              {data.moderationStatus}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Heart className="h-4 w-4" />, label: "Likes", val: data.likes, color: "text-rose-400" },
                { icon: <MessageSquare className="h-4 w-4" />, label: "Comments", val: data.comments, color: "text-blue-400" },
                { icon: <Flag className="h-4 w-4" />, label: "Reports", val: data.reports, color: "text-amber-400" },
              ].map((s) => (
                <div key={s.label} className="bg-muted rounded-xl p-3 text-center">
                  <div className={cn("flex justify-center mb-1", s.color)}>{s.icon}</div>
                  <p className="font-bold text-foreground">{s.val}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {data.reportReasons.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Report Reasons</p>
                <ul className="space-y-1">
                  {data.reportReasons.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {r || "No reason provided"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Failed to load report</p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Create Post Form ─────────────────────────────────────────────────────────

function CreatePostForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ postId: string; moderationStatus: string } | null>(null);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleImageSelect = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG, WebP, or GIF)");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError("");
    try {
      // Step 1: Upload image if one was selected
      let media = undefined;
      if (imageFile) {
        try {
          const uploadResponse = await journalistService.uploadFile(imageFile);
          media = [
            {
              path: uploadResponse.path,
              mediaType: "image",
              isCopyrighted: false,
            },
          ];
        } catch (uploadErr: any) {
          console.error("Failed to upload image:", uploadErr);
          const uploadErrorMessage =
            uploadErr.response?.data?.message ||
            uploadErr.response?.data?.error ||
            uploadErr.message ||
            "Failed to upload image";
          setError(`Image upload failed: ${uploadErrorMessage}`);
          setLoading(false);
          return;
        }
      }

      // Step 2: Create post with media
      const res = await journalistService.createPost({
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        media,
      });
      setResult(res);
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create post:", err);
      // Extract specific error message from backend response
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error ||
                          err?.message || 
                          "Failed to create post. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-400/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Post Created!</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Status:{" "}
          <span className={cn("font-medium", statusColor[result.moderationStatus]?.split(" ")[0])}>
            {result.moderationStatus}
          </span>
        </p>
        <button
          onClick={() => {
            setTitle("");
            setContent("");
            setTags("");
            setImageFile(null);
            setImagePreview(null);
            setResult(null);
          }}
          className="mt-4 text-sm text-accent hover:underline"
        >
          Write another post
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          className="bg-muted border-border h-11"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your story..."
          rows={8}
          className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="politics, economy, technology..."
          className="bg-muted border-border h-11"
        />
      </div>

      {/* Image Upload Section */}
      <div className="border-t border-border pt-4">
        <label className="text-sm font-medium text-foreground mb-2 block">Featured Image</label>
        {imagePreview ? (
          <div className="relative rounded-lg overflow-hidden mb-3">
            <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            }`}
          >
            <input
              type="file"
              id="image-upload-form"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <label htmlFor="image-upload-form" className="cursor-pointer block">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-1">
                Drag and drop an image or
              </p>
              <Button variant="outline" size="sm" type="button">
                Browse Files
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Supported: JPEG, PNG, WebP, GIF (Max 5MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Button
        onClick={handleSubmit}
        disabled={loading || !title.trim() || !content.trim()}
        className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Publish Post
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const JournalistDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<JournalistResponse | null>(null);
  const [posts, setPosts] = useState<JournalistPostResponse[]>([]);
  const [following, setFollowing] = useState<JournalistFollowingResponse[]>([]);
  const [followers, setFollowers] = useState<JournalistFollowerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);
  const [walletTxns, setWalletTxns] = useState<WalletTransactionResponse[]>([]);
  const [sentDonations, setSentDonations] = useState<DonationRecord[]>([]);
  const [receivedDonations, setReceivedDonations] = useState<DonationRecord[]>([]);

  // Send donation dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendRecipientId, setSendRecipientId] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Map following names to IDs for the send dialog
  const recipientName = following.find((f) => f.id === sendRecipientId)?.name ?? "";

  useEffect(() => {
    Promise.all([
      journalistService.getMe(),
      journalistService.getMyPosts(),
      journalistService.getFollowing(),
      journalistService.getFollowers(),
    ])
      .then(([p, po, fo, fl]) => {
        setProfile(p);
        setPosts(po);
        setFollowing(fo);
        setFollowers(fl);
      })
      .finally(() => setLoading(false));

    // Load wallet + donations (non-blocking)
    Promise.all([
      donationService.getMyWallet(),
      donationService.getMyTransactions(),
      donationService.getSentDonations(),
      donationService.getReceivedDonations(),
    ])
      .then(([w, txns, sent, received]) => {
        setMyWallet(w);
        setWalletTxns(txns);
        setSentDonations(sent);
        setReceivedDonations(received);
      })
      .catch(() => { /* wallet may not exist yet */ });
  }, []);

  const handleUnfollow = async (id: string) => {
    await journalistService.unfollowUser(id);
    setFollowing((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSendDonation = async () => {
    const amount = parseFloat(sendAmount);
    if (!sendRecipientId) {
      toast.error("Please select a recipient");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    setSending(true);
    try {
      await donationService.sendDonation({
        recipientId: sendRecipientId,
        amount,
        message: sendMessage.trim() || undefined,
      });
      toast.success("Donation sent successfully!");
      setShowSendDialog(false);
      setSendRecipientId("");
      setSendAmount("");
      setSendMessage("");
      // Refresh wallet data
      try {
        const [w, txns, sent] = await Promise.all([
          donationService.getMyWallet(),
          donationService.getMyTransactions(),
          donationService.getSentDonations(),
        ]);
        setMyWallet(w);
        setWalletTxns(txns);
        setSentDonations(sent);
      } catch { /* ignore */ }
    } catch {
      toast.error("Failed to send donation");
    } finally {
      setSending(false);
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQ.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 className="h-4 w-4" /> },
    { id: "posts", label: "My Posts", icon: <FileText className="h-4 w-4" />, count: posts.length },
    { id: "following", label: "Following", icon: <UserCheck className="h-4 w-4" />, count: following.length },
    { id: "followers", label: "Followers", icon: <Users className="h-4 w-4" />, count: followers.length },
    { id: "create", label: "New Post", icon: <Plus className="h-4 w-4" /> },
    { id: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
              Journalist Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back,{" "}
              <span className="text-foreground font-medium">{profile?.name ?? "..."}</span>
            </p>
          </div>
        </div>

        {/* Profile Card */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 mb-8"
          >
            {/* subtle bg accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent font-bold text-xl flex items-center justify-center flex-shrink-0">
                {profile.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-xl text-foreground">{profile.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                    {profile.role}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground">
                  Organization:{" "}
                  <span className="text-foreground font-medium">{profile.organization ?? "Independent"}</span>
                </p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatNum(profile.followers || 0)}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatNum(profile.posts || 0)}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-8 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-border text-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<FileText className="h-5 w-5" />} label="Total Posts" value={posts.length} delay={0} />
                <StatCard
                  icon={<Heart className="h-5 w-5" />}
                  label="Total Likes"
                  value={formatNum(posts.reduce((s, p) => s + p.likes, 0))}
                  delay={0.05}
                />
                <StatCard
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Total Comments"
                  value={formatNum(posts.reduce((s, p) => s + p.comments, 0))}
                  delay={0.1}
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="Following"
                  value={following.length}
                  delay={0.15}
                />
              </div>

              {/* Recent Posts Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Recent Posts</h2>
                  <button
                    onClick={() => setActiveTab("posts")}
                    className="text-sm text-accent hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {posts.slice(0, 3).map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                        onViewReport={setReportPostId}
                      />
                    ))}
                  </AnimatePresence>
                  {posts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No posts yet.</p>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="mt-2 text-accent hover:underline text-sm"
                      >
                        Create your first post →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* POSTS */}
          {activeTab === "posts" && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="pl-11 h-11 bg-card border-border"
                />
              </div>
              <AnimatePresence>
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                    onViewReport={setReportPostId}
                  />
                ))}
              </AnimatePresence>
              {filteredPosts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p>{searchQ ? "No matching posts found." : "No posts yet."}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* FOLLOWING */}
          {activeTab === "following" && (
            <motion.div
              key="following"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="font-semibold text-foreground mb-4 px-1">
                People You Follow ({following.length})
              </h2>
              <div className="space-y-1">
                <AnimatePresence>
                  {following.map((f) => (
                    <UserRow
                      key={f.id}
                      id={f.id}
                      name={f.name}
                      role={f.role}
                      followers={f.followers}
                      onUnfollow={handleUnfollow}
                    />
                  ))}
                </AnimatePresence>
                {following.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground text-sm">
                    You're not following anyone yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* FOLLOWERS */}
          {activeTab === "followers" && (
            <motion.div
              key="followers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="font-semibold text-foreground mb-4 px-1">
                Your Followers ({followers.length})
              </h2>
              <div className="space-y-1">
                <AnimatePresence>
                  {followers.map((f) => (
                    <UserRow
                      key={f.id}
                      id={f.id}
                      name={f.name}
                      role={f.role}
                      followers={f.followers}
                    />
                  ))}
                </AnimatePresence>
                {followers.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground text-sm">
                    No followers yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* CREATE POST */}
          {activeTab === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-border bg-card p-6 max-w-2xl"
            >
              <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" />
                Create New Post
              </h2>
              <CreatePostForm
                onSuccess={() => {
                  journalistService.getMyPosts().then(setPosts);
                }}
              />
            </motion.div>
          )}

          {/* WALLET */}
          {activeTab === "wallet" && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-2xl bg-accent p-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-white/70" />
                    <p className="text-white/70 text-sm">Current Balance</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="relative z-10"
                    onClick={() => setShowSendDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Donation
                  </Button>
                </div>
                <p className="text-4xl font-bold text-white tracking-tight">
                  ${(myWallet?.balance ?? 0).toFixed(2)}
                </p>
                {myWallet && (
                  <p className="text-white/50 text-xs mt-2">
                    Last updated {new Date(myWallet.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>

              {/* Transactions */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-4">Transaction History</h3>
                {walletTxns.length > 0 ? (
                  <div>
                    {walletTxns.map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                            isCredit ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                          )}>
                            {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.type}{tx.actorName ? ` \u00b7 ${tx.actorName}` : ""} \u00b7 {new Date(tx.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className={cn("font-semibold text-sm tabular-nums", isCredit ? "text-emerald-400" : "text-rose-400")}>
                            {isCredit ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">No transactions yet.</p>
                  </div>
                )}
              </div>

              {/* Sent & Received Donations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sent Donations */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                    Sent Donations ({sentDonations.length})
                  </h3>
                  {sentDonations.length > 0 ? (
                    <div className="space-y-0">
                      {sentDonations.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">To {d.recipientName}</p>
                            {d.message && <p className="text-xs text-muted-foreground truncate">{d.message}</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className="font-semibold text-sm text-rose-400 tabular-nums">-${d.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-muted-foreground">No donations sent yet.</p>
                  )}
                </div>

                {/* Received Donations */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                    Received Donations ({receivedDonations.length})
                  </h3>
                  {receivedDonations.length > 0 ? (
                    <div className="space-y-0">
                      {receivedDonations.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">From {d.senderName}</p>
                            {d.message && <p className="text-xs text-muted-foreground truncate">{d.message}</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className="font-semibold text-sm text-emerald-400 tabular-nums">+${d.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-muted-foreground">No donations received yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Send Donation Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-accent" />
              Send Donation
            </DialogTitle>
            <DialogDescription>
              Send a donation to a user or journalist. Your current balance: ${(myWallet?.balance ?? 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient</Label>
              <Select value={sendRecipientId} onValueChange={setSendRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a person you follow" />
                </SelectTrigger>
                <SelectContent>
                  {following.length > 0 ? (
                    following.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} <span className="text-muted-foreground">({person.role})</span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      You're not following anyone yet
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a message..."
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button onClick={handleSendDonation} disabled={sending}>
              {sending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AnimatePresence>
        {reportPostId && (
          <ReportModal postId={reportPostId} onClose={() => setReportPostId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JournalistDashboard;