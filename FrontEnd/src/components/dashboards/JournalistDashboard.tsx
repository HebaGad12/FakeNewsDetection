import { JournalistTasksPage } from "./journalist-tasks-page";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, 
  LayoutDashboard,
  ShieldCheck,
  Radio,
  Archive,
  Building2,
  Settings,
  Eye,
  TrendingUp,
  Wallet,
  Filter,
  Download,
  MoreHorizontal,
  MessageCircle,
  Share2,
  Megaphone,
  Clock,
  X,
  Plus,
  Send,
  Trash2,
  ImageIcon,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Users,
  UserCheck,
  Heart,
  MessageSquare,
  Flag,
  BarChart2,
  Check,
  Home,
  LogOut,
  Shield,
  ChevronRight,
  Zap,
  RefreshCw,
  CheckCircle,
  Sparkles,
  Mic,
  Globe,
  Flame,
  Video,
  ClipboardList,
  Calendar,
  AlertTriangle,
  Bold,
  Italic,
  Heading2,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
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
import { postsService } from "@/services/postsService";
import { communityService } from "@/services";
import type { CommunityDto } from "@/services/commnityServices";
import { useAuth } from "@/contexts/AuthContext";
import journalistTaskService, { JournalistTaskResponse } from "@/services/journalistTask";

// --- Types -------------------------------------------------------------------

type Tab = "dashboard" | "fact_check" | "broadcast" | "archive" | "organizations" | "settings" | "create" | "wallet" | "community" | "tasks";

// --- Helpers -----------------------------------------------------------------

const statusColor: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Pending:  "bg-surface-container-highest text-on-surface-variant",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  Draft:    "bg-primary-container text-on-primary-container",
};

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// --- Sub-components ----------------------------------------------------------

function CreatePostForm({ onSuccess, submitRef }: { onSuccess: () => void; submitRef: React.MutableRefObject<(() => void) | null> }) {
  type SelectedMedia = {
    id: string;
    file: File;
    preview: string;
    isVideo: boolean;
    isCopyrighted: boolean;
  };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [globalCopyright, setGlobalCopyright] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ postId: string; moderationStatus: string } | null>(null);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const selectedMediaRef = useRef<SelectedMedia[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  // AI Assistant states
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMode, setAiMode] = useState<"grammar" | "factcheck">("grammar");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiText, setAiText] = useState("");

  const categories = [
    { name: "Politics", icon: TrendingUp },
    { name: "Technology", icon: Sparkles },
    { name: "Science", icon: Mic },
    { name: "Health", icon: Heart },
    { name: "Environment", icon: Globe },
    { name: "Economy", icon: TrendingUp },
    { name: "Sports", icon: Flame },
    { name: "Entertainment", icon: Video }
  ];

  const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
  const ALLOWED_VIDEO_EXTS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_MEDIA_ITEMS = 10;

  const getFileExtension = (filename: string) => {
    return filename.slice((Math.max(0, filename.lastIndexOf(".")) || Infinity)).toLowerCase();
  };

  const handleImageSelect = (incomingFiles: FileList | File[]) => {
    const files = Array.from(incomingFiles);
    if (files.length === 0) return;

    const additions: SelectedMedia[] = [];

    for (const file of files) {
      const ext = getFileExtension(file.name);
      const isImage = ALLOWED_IMAGE_EXTS.includes(ext);
      const isVideo = ALLOWED_VIDEO_EXTS.includes(ext);

      if (!isImage && !isVideo) {
        toast.error(`Unsupported file type: ${file.name}. Allowed extensions are images (${ALLOWED_IMAGE_EXTS.join(", ")}) and videos (${ALLOWED_VIDEO_EXTS.join(", ")}).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 50MB`);
        continue;
      }

      const duplicateExists = [...selectedMedia, ...additions].some(
        (m) =>
          m.file.name === file.name &&
          m.file.size === file.size &&
          m.file.lastModified === file.lastModified
      );

      if (duplicateExists) continue;

      additions.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isVideo,
        isCopyrighted: isVideo ? false : globalCopyright,
      });
    }

    if (additions.length === 0) return;

    setSelectedMedia((prev) => {
      const remainingSlots = Math.max(0, MAX_MEDIA_ITEMS - prev.length);
      if (remainingSlots === 0) {
        additions.forEach((item) => URL.revokeObjectURL(item.preview));
        toast.error(`You can upload up to ${MAX_MEDIA_ITEMS} media items per post`);
        return prev;
      }

      if (additions.length > remainingSlots) {
        additions.slice(remainingSlots).forEach((item) => URL.revokeObjectURL(item.preview));
        toast.warning(`Only ${remainingSlots} more media item(s) can be added`);
      }

      return [...prev, ...additions.slice(0, remainingSlots)];
    });
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelect(e.target.files);
    }
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setSelectedMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  };

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await journalistService.createPost({
        title: title.trim(),
        content: content.trim(),
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        images: selectedMedia.map((item) => item.file),
        isCopyrightedFlags: selectedMedia.map((item) => item.isCopyrighted),
      });
      setResult(res);
      onSuccess();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to create post:", err);
      const responseData = err?.response?.data;
      const validationErrors = responseData?.errors
        ? Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
            .join(" | ")
        : "";
      const analysis = responseData?.analysis ? ` ${responseData.analysis}` : "";
      const baseMessage =
        validationErrors ||
        responseData?.message ||
        responseData?.detail ||
        responseData?.error ||
        responseData?.title ||
        err?.message ||
        "Failed to create post. Please try again.";
      setError(`${baseMessage}${analysis}`.trim());
    } finally {
      setLoading(false);
    }
  };

  // Expose handleSubmit to parent via ref
  submitRef.current = handleSubmit;

  if (result) {
    const isApproved = result.moderationStatus?.toLowerCase() === "approved";
    const isRejected = result.moderationStatus?.toLowerCase() === "rejected";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-secondary bg-surface-container p-8 text-center"
      >
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
          isApproved
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : isRejected
            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            : "bg-secondary-container text-on-secondary-container"
        )}>
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-headline text-xl font-bold text-on-surface mb-1">Post Created!</h3>
        <p className="text-sm text-on-surface-variant mb-2">
          Status:{" "}
          <span className={cn(
            "font-bold px-2 py-0.5 rounded-full text-xs uppercase tracking-wide",
            isApproved
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : isRejected
              ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              : "bg-surface-container-highest text-on-surface-variant"
          )}>
            {result.moderationStatus}
          </span>
        </p>
        <button
          onClick={() => {
            setTitle("");
            setContent("");
            setTags("");
            setGlobalCopyright(false);
            selectedMedia.forEach((item) => URL.revokeObjectURL(item.preview));
            setSelectedMedia([]);
            setResult(null);
          }}
          className="mt-4 text-sm font-label font-bold text-primary hover:underline"
        >
          Write another post
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── Left Column ── */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <Label htmlFor="inv-title" className="text-slate-700">Article Title *</Label>
          <Input
            id="inv-title"
            placeholder="Enter a compelling headline..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 text-lg font-semibold h-14 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0"
          />
        </div>

        <div>
          <Label htmlFor="inv-excerpt" className="text-slate-700">Excerpt / Summary</Label>
          <Textarea
            id="inv-excerpt"
            placeholder="Write a brief summary..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="mt-1 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0"
            rows={3}
          />
        </div>

        {/* Toolbar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-1 flex-wrap">
          {[Bold, Italic, Heading2, LinkIcon, List, ListOrdered, Quote, ImageIcon].map((Icon, i) => (
            <Button key={i} variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => {
                setShowAiAssistant(!showAiAssistant);
                if (!showAiAssistant && content && !aiText) setAiText(content);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded hover:bg-slate-200"
            >
              <Zap className="w-3 h-3" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {showAiAssistant && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Shield className="w-4 h-4 text-slate-700" />
                TruthTrack AI
              </h4>
              <button onClick={() => setShowAiAssistant(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAiMode("grammar")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${aiMode === "grammar" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
              >
                Grammar Check
              </button>
              <button
                onClick={() => setAiMode("factcheck")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${aiMode === "factcheck" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
              >
                Fact Check
              </button>
            </div>
            <Textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste text to analyze..."
              rows={3}
              className="rounded-lg border-slate-200 focus:border-red-600 focus:ring-0"
            />
            <Button
              onClick={async () => {
                if (!aiText.trim()) return;
                setAiLoading(true);
                setAiResult("");
                try {
                  const res = await journalistService.analyzeText(aiText, aiMode);
                  setAiResult(res.analysis);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (err: any) {
                  setAiResult("Analysis failed. Please try again.");
                } finally {
                  setAiLoading(false);
                }
              }}
              disabled={aiLoading || !aiText.trim()}
              size="sm"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full"
            >
              {aiLoading ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Analyze Text</>
              )}
            </Button>
            {aiResult && (
              <div className="mt-2 p-3 bg-white rounded-md border border-slate-200 max-h-60 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed text-slate-700">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 font-bold text-slate-900">
                  <CheckCircle className="w-4 h-4" />
                  Analysis Result
                </div>
                {aiResult}
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="inv-content" className="text-slate-700">Article Content *</Label>
          <Textarea
            id="inv-content"
            placeholder="Write your article content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 min-h-[400px] font-mono rounded-lg border-slate-200 focus:border-red-600 focus:ring-0"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Right Column: Sidebar ── */}
      <div className="space-y-6">
        {/* Category */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <Label className="text-slate-700 mb-3 block">Category *</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.name}
                variant={tags === cat.name ? "default" : "outline"}
                size="sm"
                onClick={() => setTags(cat.name)}
                className={cn(
                  "text-sm rounded-full gap-1.5 transition-all",
                  tags === cat.name
                    ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Media Upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-slate-700">Media ({selectedMedia.length}/{MAX_MEDIA_ITEMS})</Label>
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                className="accent-slate-700"
                checked={globalCopyright}
                onChange={(e) => {
                  setGlobalCopyright(e.target.checked);
                  setSelectedMedia((prev) => prev.map((m) => (!m.isVideo ? { ...m, isCopyrighted: e.target.checked } : m)));
                }}
              />
              Global © (Images)
            </label>
          </div>

          {selectedMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedMedia.map((item) => (
                <div key={item.id} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 group flex flex-col">
                  <div className="relative w-full h-28 mb-2 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {item.isVideo ? (
                      <video src={item.preview} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 mt-auto text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-slate-700 disabled:opacity-40"
                      checked={item.isCopyrighted}
                      disabled={item.isVideo}
                      onChange={(e) => {
                        if (item.isVideo) return;
                        setSelectedMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, isCopyrighted: e.target.checked } : m)));
                      }}
                    />
                    Copyright this media
                  </label>
                  <button
                    onClick={() => removeImage(item.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              dragActive ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-400"
            )}
          >
            <input
              type="file"
              id="media-upload-form"
              accept={[...ALLOWED_IMAGE_EXTS, ...ALLOWED_VIDEO_EXTS].join(",")}
              onChange={handleFileInputChange}
              className="hidden"
              multiple
            />
            <label htmlFor="media-upload-form" className="cursor-pointer block">
              <ImageIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 mb-2">Drag and drop media files, or</p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => document.getElementById("media-upload-form")?.click()}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 rounded-full"
              >
                Browse Files
              </Button>
            </label>
          </div>
        </div>

        {/* AI Credibility Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-2">AI Credibility Check</h3>
          <p className="text-sm text-slate-500">Your article will be analyzed by our AI system for credibility scoring after submission.</p>
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard -----------------------------------------------------------

const JournalistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<JournalistResponse | null>(null);
  const [posts, setPosts] = useState<JournalistPostResponse[]>([]);
  const [following, setFollowing] = useState<JournalistFollowingResponse[]>([]);
  const [followers, setFollowers] = useState<JournalistFollowerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);
  const [myCommunities, setMyCommunities] = useState<CommunityDto[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [tasks, setTasks] = useState<JournalistTaskResponse[]>([]);
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
  const createSubmitRef = useRef<(() => void) | null>(null);

  const loadDashboardData = () => {
    setLoading(true);
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

        if (p?.id) {
          communityService.getByJournalist(p.id).then(setMyCommunities).catch(() => {});
        }
      })
      .finally(() => setLoading(false));

    donationService.getMyWallet().then(setMyWallet).catch(() => {});
    journalistTaskService.getTasks().then(setTasks).catch(() => {});
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5B5E66] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#5B5E66] text-sm font-label font-bold uppercase tracking-widest">Initializing Archive...</p>
        </div>
      </div>
    );
  }

  const hasOrganization = !!profile.organization && profile.organization.trim().toLowerCase() !== "independent";

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "archive", icon: Archive, label: "Archive" },
    { id: "community", icon: Users, label: "Community" },
    ...(hasOrganization ? [{ id: "tasks", icon: ClipboardList, label: "Tasks" }] : []),
    { id: "wallet", icon: Wallet, label: "Finances" },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen font-body">
      {/* SideNavBar */}
      <aside className={cn("h-screen w-64 fixed left-0 top-0 flex flex-col z-40 bg-[#0f172a] border-r border-white/5 shadow-2xl hidden md:flex transition-transform duration-300", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>

        {/* ── Brand ── */}
        <div className="px-5 pt-7 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight tracking-wide">Journalist Portal</h1>
              <p className="text-blue-400/60 text-[10px] font-mono uppercase tracking-widest mt-0.5">The Veritas Archive</p>
            </div>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[11px] font-bold uppercase">
                  {profile.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.name}</p>
              <p className="text-white/35 text-[10px] font-mono truncate">{profile.role || "Verified Journalist"}</p>
            </div>
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
          <p className="text-white/20 text-[9px] font-mono uppercase tracking-[0.18em] px-2 mb-2">Navigation</p>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
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
                <item.icon className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-white/35 group-hover:text-white/70"
                )} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
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
            <Home className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-y-0.5 duration-150" />
            <span className="flex-1 text-left">Go to Home</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Logout */}
          <button
            onClick={() => navigate("/login")}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-white/4 text-white/40 hover:bg-red-600/80 hover:text-white border border-white/5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-900/20"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className={cn("transition-all duration-300 p-4 md:p-8 max-w-[1200px] mb-20 md:mb-0", isSidebarOpen ? "md:ml-64" : "ml-0")}>
        <header className={cn("mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6", activeTab === "create" && "hidden")}>
          <div className="flex items-start gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 flex-shrink-0 -ml-2 mt-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors hidden md:inline-flex">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-2 block">
                Archive System v4.2
              </span>
              <h1 className="font-headline text-4xl text-on-surface font-bold">
                {activeTab === "dashboard" && "The Veritas Archive"}
                {activeTab === "archive" && "Your Published Intel"}
                {activeTab === "community" && "Intelligence Network"}
                {activeTab === "wallet" && "Financial Operations"}
                {activeTab === "create" && "Draft Operation"}
              </h1>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="font-label text-[10px] uppercase text-outline">System Status</p>
              <p className="text-secondary font-bold flex items-center gap-1 justify-end">
                <span className="w-2 h-2 bg-secondary rounded-full"></span>
                ENCRYPTED
              </p>
            </div>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* At a Glance: Analytics */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-surface-container-lowest p-6 flex flex-col justify-between group transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Followers</span>
                  <Eye className="w-5 h-5 text-primary-dim opacity-40" />
                </div>
                <div>
                  <h3 className="text-4xl font-headline font-extrabold text-on-surface">{formatNum(profile.followers)}</h3>
                  <p className="text-xs text-secondary font-medium mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Building trust
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 flex flex-col justify-between border-l-4 border-primary">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Revenue Earned</span>
                  <Wallet className="w-5 h-5 text-primary-dim opacity-40" />
                </div>
                <div>
                  <h3 className="text-4xl font-headline font-extrabold text-on-surface">
                    ${myWallet?.balance.toFixed(2) || "0.00"}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-2 font-medium">Available Funds</p>
                </div>
              </div>
            </section>

            {/* Content Pipeline Table */}
            <section className="bg-surface-container-low p-8 text-on-surface">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
                <h2 className="font-headline text-2xl font-bold">Content Pipeline</h2>
                
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/20">
                      <th className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pb-4 px-4">Article Title</th>
                      <th className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pb-4 px-4">Category</th>
                      <th className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pb-4 px-4 text-center">Engagement</th>
                      <th className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pb-4 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {posts.slice(0, 5).map(post => (
                      <tr key={post.id} className="group hover:bg-surface-container-lowest transition-colors">
                        <td className="py-5 px-4 cursor-pointer" onClick={() => navigate(`/article/${post.id}`)}>
                          <p className="font-bold text-on-surface leading-tight mb-1 max-w-[300px] truncate">{post.title}</p>
                          <p className="text-[11px] text-on-surface-variant italic">{new Date(post.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="py-5 px-4">
                          <span className="bg-surface-container-highest px-2 py-1 text-[10px] font-label uppercase font-bold tracking-tighter">
                            Intel
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center">
                          <div className="flex justify-center gap-3 text-on-surface-variant">
                            <span className="text-xs flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {formatNum(post.comments)}</span>
                            <span className="text-xs flex items-center gap-1"><Heart className="w-4 h-4" /> {formatNum(post.likes)}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase", statusColor[post.moderationStatus] || "bg-outline text-surface")}>
                            <span className="w-1.5 h-1.5 bg-current rounded-full opacity-50"></span>
                            {post.moderationStatus}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {posts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-on-surface-variant text-sm">
                          No communications on network.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Quick Action Area */}
          </motion.div>
        )}

        {activeTab === "archive" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <div key={post.id} className="bg-surface-container-low p-6 flex flex-col justify-between text-on-surface">
                 <h3 className="font-headline text-xl font-bold mb-3 max-w-full truncate">{post.title}</h3>
                 <p className="text-sm text-on-surface-variant mb-6 line-clamp-3">{post.content}</p>
                 <div className="flex justify-between items-center text-xs font-label uppercase font-bold tracking-widest text-outline">
                    <span className="flex gap-3">
                      <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                    </span>
                    <button onClick={() => navigate(`/article/${post.id}`)} className="text-primary hover:underline">Read Intel</button>
                 </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="col-span-full py-20 text-center text-on-surface-variant">Data vault is empty.</div>
            )}
          </motion.div>
        )}

        {activeTab === "community" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* My Communities Section */}
            <div className="bg-surface-container-low p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline text-2xl font-bold flex items-center gap-2 text-on-surface">
                  <MessageSquare className="w-6 h-6" /> My Communities ({myCommunities.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/communities")}
                  className="text-xs font-label uppercase tracking-widest font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Create New
                </Button>
              </div>
              {myCommunities.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                  <Input
                    placeholder="Search your communities..."
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    className="pl-10 h-10 bg-surface-container-lowest border-outline-variant/30 text-sm"
                  />
                </div>
              )}
              {(() => {
                const filtered = myCommunities.filter((c) =>
                  c.name.toLowerCase().includes(communitySearch.toLowerCase())
                );
                if (myCommunities.length === 0) {
                  return (
                    <div className="text-center py-10 border-2 border-dashed border-outline-variant/30 rounded-lg">
                      <Users className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
                      <p className="text-sm text-on-surface-variant mb-3">You haven't created any communities yet.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/communities")}
                      >
                        Go to Communities
                      </Button>
                    </div>
                  );
                }
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-sm text-on-surface-variant">
                      No communities match "{communitySearch}"
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((community) => (
                    <div
                      key={community.id}
                      className="bg-surface-container-lowest border border-outline-variant/20 p-5 rounded-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow group cursor-pointer"
                      onClick={() => navigate(`/communities/${community.id}`)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                            {community.name}
                          </h4>
                          <span className={cn(
                            "text-[10px] font-label uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex-shrink-0",
                            community.isOpen
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-surface-container-highest text-on-surface-variant"
                          )}>
                            {community.isOpen ? "Open" : "Closed"}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant line-clamp-2">{community.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs font-label uppercase tracking-widest text-outline font-semibold pt-3 border-t border-outline-variant/10">
                        <span className="text-primary font-bold group-hover:underline">View Community →</span>
                      </div>
                    </div>
                  ))}
                  </div>
                );
              })()}
            </div>

            {/* Following / Followers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-low p-6">
                <h3 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2 text-on-surface"><UserCheck className="w-6 h-6"/> Observing Network ({following.length})</h3>
                <div className="space-y-4">
                  {following.map(f => (
                    <div key={f.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-on-surface">{f.name}</p>
                        <p className="text-xs text-on-surface-variant">{f.role}</p>
                      </div>
                    </div>
                  ))}
                  {following.length === 0 && (
                    <p className="text-sm text-on-surface-variant">Not observing anyone yet.</p>
                  )}
                </div>
              </div>
              <div className="bg-surface-container-low p-6">
                <h3 className="font-headline text-2xl font-bold mb-6 flex items-center gap-2 text-on-surface"><Users className="w-6 h-6"/> Broadcast Receivers ({followers.length})</h3>
                <div className="space-y-4">
                  {followers.map(f => (
                    <div key={f.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-on-surface">{f.name}</p>
                        <p className="text-xs text-on-surface-variant">{f.role}</p>
                      </div>
                    </div>
                  ))}
                  {followers.length === 0 && (
                    <p className="text-sm text-on-surface-variant">No broadcast receivers yet.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "wallet" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-container-low p-8">
            <div className="mb-10 text-center py-10 bg-surface-container-highest border border-outline-variant/20">
               <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Secure Vault Balance</p>
               <h2 className="font-headline text-6xl font-black text-on-surface">${myWallet?.balance.toFixed(2) || "0.00"}</h2>
            </div>
            <p className="text-center text-sm font-label uppercase tracking-widest text-on-surface-variant">For granular financial operations, please access the terminal.</p>
          </motion.div>
        )}

        {activeTab === "create" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ArrowDownLeft className="h-5 w-5 text-slate-500" />
                </button>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">Create New Article</h1>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => createSubmitRef.current?.()}
                  className="bg-slate-900 hover:bg-slate-800 rounded-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {user?.organization ? "Submit for Review" : "Publish"}
                </Button>
              </div>
            </div>
            <CreatePostForm
              onSuccess={() => {
                loadDashboardData();
                setActiveTab("archive");
              }}
              submitRef={createSubmitRef}
            />
          </motion.div>
        )}

        {activeTab === "tasks" && (
          <JournalistTasksPage user={user} refreshKey={tasksRefreshKey} />
        )}

      </main>

      {/* BottomNavBar - Hidden on Desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-2 pb-5 px-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl z-50 border-t border-stone-200/20">
        <button onClick={() => navigate("/feed")} className="flex flex-col items-center text-[#5B5E66]/60 dark:text-stone-500 font-sans text-[10px] uppercase tracking-widest gap-1">
          <Archive className="w-5 h-5" /> Feed
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={cn("flex flex-col items-center font-bold font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "dashboard" ? "text-[#2D3435] dark:text-white" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <LayoutDashboard className="w-5 h-5" /> Dash
        </button>
        <button onClick={() => setActiveTab("wallet")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "wallet" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <Wallet className="w-5 h-5" /> Funds
        </button>
      </nav>
    </div>
  );
};

export default JournalistDashboard;