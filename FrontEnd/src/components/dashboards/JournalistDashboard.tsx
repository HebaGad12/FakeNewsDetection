import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShieldCheck,
  Radio,
  Archive,
  Building2,
  Settings,
  PlusCircle,
  Eye,
  TrendingUp,
  BadgeCheck,
  Wallet,
  Filter,
  Download,
  MoreHorizontal,
  MessageCircle,
  Share2,
  Megaphone,
  FileText,
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
  Check
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

// --- Types -------------------------------------------------------------------

type Tab = "dashboard" | "fact_check" | "broadcast" | "archive" | "organizations" | "settings" | "create" | "wallet" | "community";

// --- Helpers -----------------------------------------------------------------

const statusColor: Record<string, string> = {
  Approved: "bg-secondary-container text-on-secondary-container",
  Pending: "bg-surface-container-highest text-on-surface-variant",
  Rejected: "bg-error-container text-on-error-container",
  Draft: "bg-primary-container text-on-primary-container",
};

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// --- Sub-components ----------------------------------------------------------

function CreatePostForm({ onSuccess }: { onSuccess: () => void }) {
  type SelectedMedia = {
    id: string;
    file: File;
    preview: string;
    isVideo: boolean;
    isCopyrighted: boolean;
  };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [globalCopyright, setGlobalCopyright] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ postId: string; moderationStatus: string } | null>(null);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const selectedMediaRef = useRef<SelectedMedia[]>([]);
  const [dragActive, setDragActive] = useState(false);

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

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-secondary bg-surface-container p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-4">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-headline text-xl font-bold text-on-surface mb-1">Post Created!</h3>
        <p className="text-sm text-on-surface-variant mb-2">
          Status: <span className="font-bold">{result.moderationStatus}</span>
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
    <div className="space-y-4">
      <div>
        <label className="text-sm font-label font-bold text-on-surface mb-1.5 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          className="bg-surface-container-lowest border-outline-variant/30 h-11"
        />
      </div>
      <div>
        <label className="text-sm font-label font-bold text-on-surface mb-1.5 block">Content</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your story..."
          rows={8}
          className="bg-surface-container-lowest border-outline-variant/30"
        />
      </div>
      <div>
        <label className="text-sm font-label font-bold text-on-surface mb-1.5 block">
          Tags <span className="text-on-surface-variant font-normal">(comma-separated)</span>
        </label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="politics, economy, technology..."
          className="bg-surface-container-lowest border-outline-variant/30 h-11"
        />
      </div>

      <div className="border-t border-outline-variant/20 pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-label font-bold text-on-surface block">
            Media Upload ({selectedMedia.length}/{MAX_MEDIA_ITEMS})
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={globalCopyright}
              onChange={(e) => {
                setGlobalCopyright(e.target.checked);
                setSelectedMedia(prev => prev.map(m => (!m.isVideo ? { ...m, isCopyrighted: e.target.checked } : m)));
              }}
            />
            Global Copyright (Images only)
          </label>
        </div>

        {selectedMedia.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {selectedMedia.map((item) => (
              <div key={item.id} className="relative rounded-lg border border-outline-variant/30 bg-surface-container p-2 group flex flex-col">
                <div className="relative w-full h-32 mb-2 bg-black/5 rounded-md overflow-hidden flex items-center justify-center">
                  {item.isVideo ? (
                    <video src={item.preview} className="w-full h-full object-cover" controls autoPlay muted loop />
                  ) : (
                    <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <label className="flex items-center gap-2 mt-auto text-xs text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary disabled:opacity-50"
                    checked={item.isCopyrighted}
                    disabled={item.isVideo}
                    onChange={(e) => {
                      if (item.isVideo) return;
                      setSelectedMedia(prev => prev.map(m => m.id === item.id ? { ...m, isCopyrighted: e.target.checked } : m));
                    }}
                  />
                  Copyright this media
                </label>
                <button
                  onClick={() => removeImage(item.id)}
                  className="absolute top-3 right-3 p-1 bg-error text-on-error rounded-full hover:bg-error/80 transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-md"
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
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive ? "border-primary bg-primary/5" : "border-outline hover:border-primary/50"
          }`}
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
            <ImageIcon className="h-10 w-10 mx-auto text-on-surface-variant mb-2" />
            <p className="text-xs text-on-surface-variant mb-1">Drag and drop media files, or</p>
            <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById("media-upload-form")?.click()}>
              Browse Files
            </Button>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-error text-sm font-label">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Button
        onClick={handleSubmit}
        disabled={loading || !title.trim() || !content.trim()}
        className="w-full h-11 bg-primary text-on-primary hover:bg-primary/90 font-label font-bold uppercase tracking-widest text-xs"
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

// --- Main Dashboard -----------------------------------------------------------

const JournalistDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [profile, setProfile] = useState<JournalistResponse | null>(null);
  const [posts, setPosts] = useState<JournalistPostResponse[]>([]);
  const [following, setFollowing] = useState<JournalistFollowingResponse[]>([]);
  const [followers, setFollowers] = useState<JournalistFollowerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);

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

    donationService.getMyWallet().then(setMyWallet).catch(() => {});
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

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "archive", icon: Archive, label: "Archive" },
    { id: "community", icon: Users, label: "Community" },
    { id: "wallet", icon: Wallet, label: "Finances" },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen font-body">
      {/* SideNavBar */}
      <aside className="bg-[#F9F9F9] dark:bg-stone-950 text-[#5B5E66] dark:text-stone-300 font-sans text-sm font-medium h-screen w-64 fixed left-0 top-0 flex flex-col p-4 gap-2 z-40 border-r border-[#EAEAEA] dark:border-stone-800 hidden md:flex">
        <div className="mb-8 px-2 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0">
              {profile.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-sm leading-tight truncate w-36">{profile.name}</h2>
              <p className="text-xs text-on-surface-variant font-normal truncate w-36">{profile.role || "Verified Journalist"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-transform active:scale-[0.98] w-full text-left",
                activeTab === item.id
                  ? "bg-stone-200 dark:bg-stone-800 text-[#2D3435] dark:text-white"
                  : "text-[#5B5E66] dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={() => setActiveTab("create")}
          className="mt-auto bg-primary text-on-primary py-3 px-4 rounded-sm font-label text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-opacity active:opacity-80"
        >
          <PlusCircle className="w-4 h-4" />
          New Investigation
        </button>
        
        <Link to="/" className="mt-4 text-xs font-label uppercase tracking-widest text-[#5B5E66] text-center hover:opacity-80">
          Return Home
        </Link>
      </aside>

      {/* Main Content Canvas */}
      <main className="md:ml-64 p-4 md:p-8 max-w-[1200px] mb-20 md:mb-0">
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
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
              <div className="bg-surface-container-low p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Credibility Rating</span>
                  <BadgeCheck className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-headline font-extrabold text-on-surface">98</h3>
                  <span className="text-lg text-on-surface-variant font-light">/100</span>
                </div>
                <div className="mt-4 w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full w-[98%]"></div>
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
                <div className="flex gap-2">
                  <button className="bg-surface-container-lowest text-on-surface text-xs font-label uppercase font-bold py-2 px-4 flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                    <Filter className="w-4 h-4" />Filter
                  </button>
                  <button className="bg-surface-container-lowest text-on-surface text-xs font-label uppercase font-bold py-2 px-4 flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                    <Download className="w-4 h-4" />Export
                  </button>
                </div>
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
            <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative overflow-hidden bg-on-surface text-surface p-10 min-h-[300px] flex flex-col justify-end">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Megaphone className="w-[120px] h-[120px]" strokeWidth={1} />
                </div>
                <span className="bg-tertiary text-on-tertiary px-3 py-1 text-[10px] font-label uppercase font-bold w-fit mb-4">Urgent Assignment</span>
                <h3 className="font-headline text-3xl font-bold mb-4">Lead Investigation: Market Corrections</h3>
                <p className="text-surface-variant text-sm md:text-base mb-6 max-w-sm">Sources indicate anomalous trading events globally. Provide verified brief to subscribers.</p>
                <button onClick={() => setActiveTab("create")} className="bg-surface text-on-surface px-6 py-3 font-label text-xs uppercase font-bold tracking-widest w-fit hover:bg-primary-fixed transition-colors">
                  Accept Briefing
                </button>
              </div>
              <div className="bg-surface-container-low p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-outline-variant">
                <FileText className="w-12 h-12 text-primary-dim opacity-50 mb-6" />
                <h3 className="font-headline text-2xl font-bold mb-2 text-on-surface">Create New Investigation</h3>
                <p className="text-on-surface-variant text-sm mb-8 max-w-xs">Start a fresh thread, upload raw evidence, or begin drafting your next investigative piece.</p>
                <button 
                  onClick={() => setActiveTab("create")}
                  className="bg-primary text-on-primary px-8 py-4 font-label text-xs uppercase font-bold tracking-[0.2em] shadow-lg active:scale-95 transition-transform"
                >
                  Initialize Draft
                </button>
              </div>
            </section>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-container-low p-8">
             <CreatePostForm onSuccess={() => journalistService.getMyPosts().then(setPosts)} />
          </motion.div>
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
        <button onClick={() => setActiveTab("create")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "create" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <PlusCircle className="w-5 h-5" /> New
        </button>
        <button onClick={() => setActiveTab("wallet")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "wallet" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <Wallet className="w-5 h-5" /> Funds
        </button>
      </nav>
    </div>
  );
};

export default JournalistDashboard;