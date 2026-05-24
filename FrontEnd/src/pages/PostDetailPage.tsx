import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Loader,
  AlertCircle,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Flag,
  CheckCircle2,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ActionBar } from "@/components/ActionBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { postsService, Post, PostComment } from "@/services/postsService";
import { publicProfileService, PublicProfile } from "@/services/publicProfileService";
import { userService } from "@/services/userService";
import { adminService } from "@/services/adminService";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REPORT_REASONS = [
  { value: "misinformation", label: "Misinformation / False Information" },
  { value: "misleading",     label: "Misleading Content" },
  { value: "hate_speech",    label: "Hate Speech or Harassment" },
  { value: "spam",           label: "Spam or Irrelevant Content" },
  { value: "copyright",      label: "Copyright Violation" },
  { value: "other",          label: "Other" },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [authorProfile, setAuthorProfile] = useState<PublicProfile | null>(null);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [showAdminDeleteDialog, setShowAdminDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const {
    isLiked, likesCount, toggleLike, addComment, deleteComment,
    isLiking, isCommenting, setIsLiked, setLikesCount,
  } = usePostInteractions({ postId: id || "", initialLiked: false, initialLikesCount: 0 });

  useEffect(() => {
    const loadPost = async () => {
      if (!id) { setError("Post ID not provided"); setIsLoading(false); return; }
      try {
        setIsLoading(true); setError(null);
        const fetchedPost = await postsService.getPostById(id);
        if (!fetchedPost) {
          setError("Post not found"); setPost(null);
        } else {
          setPost(fetchedPost);
          setComments(Array.isArray(fetchedPost.comments) ? fetchedPost.comments : []);
          setLikesCount(fetchedPost.likesCount);
          try {
            const userHasLiked = await postsService.hasUserLikedPost(id);
            setIsLiked(userHasLiked);
          } catch { setIsLiked(false); }

          try {
            const [profile, avatar, following] = await Promise.all([
              publicProfileService.getProfile(fetchedPost.authorId).catch(() => null),
              userService.fetchPictureBlobUrl(fetchedPost.authorId).catch(() => null),
              user ? userService.getFollowing().catch(() => []) : Promise.resolve([])
            ]);
            setAuthorProfile(profile);
            setAuthorAvatar(avatar);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setIsFollowing(following.some((f: any) => f.id === fetchedPost.authorId));
          } catch (e) { console.error(e); }
        }
      } catch { setError("Failed to load post. Please try again later."); setPost(null); }
      finally { setIsLoading(false); }
    };
    if (id) loadPost();
  }, [id, setLikesCount, setIsLiked, user]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    try {
      setCommentError(null);
      await addComment(commentInput);
      setCommentInput("");
      if (post) {
        const updatedPost = await postsService.getPostById(post.id);
        if (updatedPost) setComments(Array.isArray(updatedPost.comments) ? updatedPost.comments : []);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setCommentError(err?.response?.data?.message || err?.message || "Failed to post comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch { console.error("Failed to delete comment"); }
  };

  const handleDeletePost = async () => {
    if (!post || !user || post.authorId !== user.id) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      setIsDeleting(true);
      await postsService.deletePost(post.id);
      navigate("/feed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete post.");
      setIsDeleting(false);
    }
  };

  const handleOpenReport = () => { setReportReason(""); setReportDescription(""); setReportSuccess(false); setShowReportDialog(true); };
  const handleCloseReport = () => { setShowReportDialog(false); setReportReason(""); setReportDescription(""); setReportSuccess(false); };

  const handleSubmitReport = async () => {
    if (!post || !reportReason) return;
    const label = REPORT_REASONS.find((r) => r.value === reportReason)?.label ?? reportReason;
    const fullReason = reportDescription.trim() ? `${label}: ${reportDescription.trim()}` : label;
    try {
      setIsSubmittingReport(true);
      await userService.reportPost(post.id, { reason: fullReason });
      setReportSuccess(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to submit report.");
    } finally { setIsSubmittingReport(false); }
  };

  const handleFollowToggle = async () => {
    if (!post || !user) {
      toast.error("Please sign in to follow authors.");
      navigate("/login");
      return;
    }
    if (post.authorId === user.id) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await userService.unfollow(post.authorId);
        setIsFollowing(false);
        setAuthorProfile(prev => prev ? { ...prev, followers: Math.max(0, prev.followers - 1) } : prev);
        toast.success(`Unfollowed ${post.authorName.split(" ")[0]}`);
      } else {
        await userService.follow(post.authorId);
        setIsFollowing(true);
        setAuthorProfile(prev => prev ? { ...prev, followers: prev.followers + 1 } : prev);
        toast.success(`Now following ${post.authorName.split(" ")[0]}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update follow status.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const isReader = user?.role?.toLowerCase() === "reader" || user?.role?.toLowerCase() === "regularuser";
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const handleAdminDeletePost = async () => {
    if (!post) return;
    try {
      setIsDeleting(true);
      await adminService.deletePost(post.id);
      toast.success("Post deleted successfully.");
      navigate(-1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete post.");
      setIsDeleting(false);
    } finally {
      setShowAdminDeleteDialog(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-white dark:bg-zinc-950"><Header /><LoadingSpinner fullScreen message="Loading article..." /></div>;

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </button>
          <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold text-lg text-zinc-900 dark:text-white mb-2">{error || "Post not found"}</p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">The article you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => navigate("/feed")} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-none">Return to Feed</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const readTime = Math.ceil(post.content.split(/\s+/).length / 200);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <ReadingProgress />
      <Header />

      {/* Article breadcrumb */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-3">
          <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </button>
        </div>
      </div>

      <main className="w-full pb-8">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex-1"
        >
          {/* HERO */}
          <section className="relative w-full overflow-hidden mb-0 bg-black">
            {post.media && post.media.length > 0 ? (
              <>
                {/* blurred bg fill for letterbox areas */}
                <div
                  className="absolute inset-0 scale-110"
                  style={{
                    backgroundImage: `url(${postsService.getImageUrl(post.media[0].path)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(24px) brightness(0.35)",
                  }}
                />
                {/* main image — fully visible, no cropping */}
                <img
                  src={postsService.getImageUrl(post.media[0].path)}
                  alt={post.title}
                  className="relative mx-auto block max-h-[75vh] w-auto max-w-full object-contain animate-in fade-in duration-700"
                  style={{ minHeight: "340px" }}
                />
              </>
            ) : (
              <div className="h-[60vh] min-h-[460px] w-full bg-zinc-900 dark:bg-black" />
            )}
            {/* gradient at bottom for text readability */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 mx-auto flex max-w-5xl flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-12">
              {post.tags && post.tags.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-400/50 bg-red-600/20 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {post.tags[0]}
                  </span>
                </div>
              )}
              <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both sm:text-5xl md:text-6xl">
                {post.title}
              </h1>
            </div>
          </section>

          {/* Publisher strip */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 animate-in fade-in duration-700 delay-300 fill-mode-both mb-8">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                  <Link to={`/profiles/${post.authorId}`} className="flex h-11 w-11 items-center justify-center rounded-full overflow-hidden ring-2 ring-red-600/30 bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-600/20 transition-colors">
                    {authorAvatar ? (
                      <img src={authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-serif text-base font-semibold">
                        {post.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profiles/${post.authorId}`} className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {post.authorName}
                      </Link>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{post.organizationName || "Independent Journalist"}</span>
                  </div>
                </div>
                <div className="hidden h-8 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formattedDate}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{readTime} min read</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete — post owner */}
                {user && post.authorId === user.id && (
                  <button
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors"
                    title="Delete post"
                  >
                    {isDeleting ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
                {/* Delete — admin */}
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminDeleteDialog(true)}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded-full text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                    title="Admin: Delete post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Post
                  </button>
                )}
                {user && post.authorId !== user.id && (
                  <button
                    onClick={handleOpenReport}
                    className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-full transition-colors"
                    title="Report post"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col lg:flex-row gap-10">
            {/* Main Content Area */}
            <div className="flex-1 max-w-3xl lg:max-w-none mx-auto lg:mx-0 w-full">

              {/* Credibility badge */}
              {post.verificationStatus && (
                <div className="mb-8">
                  <CredibilityBadge
                    level={
                      (String(post.verificationStatus).toLowerCase() === "fake" || post.verificationStatus === 3) ? "fake" :
                      (String(post.verificationStatus).toLowerCase() === "questionable" || String(post.verificationStatus).toLowerCase() === "suspicious" || post.verificationStatus === 2) ? "questionable" : "verified"
                    }
                  />
                </div>
              )}

              {/* Media Gallery */}
              {post.media && post.media.length > 0 && (
                <div className="mb-10 select-none">
                  {/* Single image */}
                  {post.media.length === 1 && (
                    <div
                      className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-zoom-in group"
                      onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                    >
                      <img
                        src={postsService.getImageUrl(post.media[0].path)}
                        alt={post.title}
                        className="w-full max-h-[520px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-80 h-8 w-8 drop-shadow transition-opacity" />
                      </div>
                    </div>
                  )}

                  {/* Multiple images — slider */}
                  {post.media.length > 1 && (
                    <div className="space-y-3">
                      {/* Main viewer */}
                      <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group">
                        <div
                          className="cursor-zoom-in"
                          onClick={() => { setLightboxIndex(activeImageIndex); setLightboxOpen(true); }}
                        >
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={activeImageIndex}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.2 }}
                              src={postsService.getImageUrl(post.media[activeImageIndex].path)}
                              alt={`${post.title} — image ${activeImageIndex + 1}`}
                              className="w-full max-h-[520px] object-cover"
                            />
                          </AnimatePresence>
                          {/* zoom hint */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-70 h-8 w-8 drop-shadow transition-opacity" />
                          </div>
                        </div>

                        {/* Prev arrow */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + post.media.length) % post.media.length); }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>

                        {/* Next arrow */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % post.media.length); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>

                        {/* Counter badge */}
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                          {activeImageIndex + 1} / {post.media.length}
                        </div>
                      </div>

                      {/* Thumbnails strip */}
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {post.media.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImageIndex(i)}
                            className={cn(
                              "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                              i === activeImageIndex
                                ? "border-red-600 scale-105 shadow-md"
                                : "border-transparent opacity-60 hover:opacity-100 hover:border-zinc-400"
                            )}
                          >
                            <img
                              src={postsService.getImageUrl(m.path)}
                              alt={`Thumbnail ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Article body — newspaper typography */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="prose prose-zinc dark:prose-invert max-w-none"
              >
                {post.content.split("\n\n").map((paragraph, idx) => (
                  <p key={idx} className="text-base md:text-lg leading-[1.85] text-zinc-800 dark:text-zinc-200 mb-5 font-serif">
                    {paragraph}
                  </p>
                ))}
              </motion.div>

              {/* Interaction bar */}
              {user?.role !== "admin" && (
                <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-3">
                  <ActionBar
                    likesCount={likesCount}
                    isLiked={isLiked}
                    onToggleLike={toggleLike}
                    commentsCount={comments.length}
                    isLiking={isLiking || isLoading}
                    canReport={!!user && post.authorId !== user.id}
                    onReport={handleOpenReport}
                  />
                </div>
              )}

              {/* Comments section */}
              <motion.section
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-4 w-0.5 bg-red-600" />
                  <h2 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white">
                    Comments ({comments.length})
                  </h2>
                </div>

                {/* Comment form */}
                {user?.role !== "admin" && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5 shadow-sm mb-10">
                    {commentError && (
                      <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 p-3 mb-4 text-sm text-red-700 dark:text-red-400">
                        {commentError}
                      </div>
                    )}
                    <div className="flex gap-3 sm:gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-red-600/10 text-red-600 font-semibold ring-1 ring-zinc-200 dark:ring-zinc-800">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{user?.name?.charAt(0).toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <textarea
                          placeholder="Add to the conversation. Be respectful and stay on topic."
                          value={commentInput}
                          onChange={(e) => { setCommentInput(e.target.value); setCommentError(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                          disabled={isCommenting}
                          className="w-full min-h-[88px] resize-none bg-transparent p-0 text-[15px] focus:outline-none focus:ring-0 placeholder:text-zinc-500 border-0"
                        />
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                          <span className="text-xs text-zinc-500">Markdown supported</span>
                          <Button
                            onClick={handleAddComment}
                            disabled={!commentInput.trim() || isCommenting}
                            size="sm"
                            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 rounded-full font-semibold"
                          >
                            {isCommenting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                            Post comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments list */}
                <div className="mt-10 space-y-8">
                  {comments.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                      <MessageCircle className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet. Be the first to share your perspective.</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        className="group"
                      >
                        <div className="flex gap-3 sm:gap-4">
                          <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold ring-1 ring-zinc-200 dark:ring-zinc-700">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 justify-between">
                              <div className="flex items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{comment.authorName}</span>
                                {comment.authorRole === "Journalist" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-600/10 text-red-600 font-bold uppercase tracking-wider">
                                    Verified
                                  </span>
                                )}
                                <span className="text-xs text-zinc-500">
                                  {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                              {(user?.role === "admin" || user?.name === comment.authorName) && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-all focus:opacity-100"
                                  title="Delete comment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                              {comment.content}
                            </p>
                            <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
                              <button className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 -ml-2">
                                <Heart className="h-3.5 w-3.5" />
                                <span className="tabular-nums">0</span>
                              </button>
                              <button className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100">
                                <MessageCircle className="h-3.5 w-3.5" />
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.section>
            </div>

            {/* Right Sidebar - About the Author */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6">
                <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-white mb-4">About the Author</h3>
                <div className="flex items-center gap-4 mb-4">
                  <Link to={`/profiles/${post.authorId}`} className="flex h-16 w-16 overflow-hidden items-center justify-center rounded-full ring-2 ring-red-600/30 bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-600/20 transition-colors">
                    {authorAvatar ? (
                      <img src={authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-serif text-2xl font-semibold">
                        {post.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <div>
                    <Link to={`/profiles/${post.authorId}`} className="font-semibold text-zinc-900 dark:text-white text-lg hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      {post.authorName}
                    </Link>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{post.organizationName || "Independent Journalist"}</p>
                  </div>
                </div>

                {authorProfile?.bio && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                    {authorProfile.bio}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-3">
                    <p className="tabular-nums font-bold text-xl text-zinc-900 dark:text-white">{authorProfile?.followers ?? "-"}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">Followers</p>
                  </div>
                  <div className="text-center rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-3">
                    <p className="tabular-nums font-bold text-xl text-zinc-900 dark:text-white">{authorProfile?.totalPosts ?? "-"}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">Posts</p>
                  </div>
                </div>

                {user && post.authorId !== user.id && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={cn(
                      "w-full rounded-full font-semibold transition-all",
                      isFollowing
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700"
                        : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800"
                    )}
                  >
                    {isFollowLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : null}
                    {isFollowing ? `Unfollow ${post.authorName.split(' ')[0]}` : `Follow ${post.authorName.split(' ')[0]}`}
                  </Button>
                )}

                {/* Report button — for all logged-in users who are not the author */}
                {user && post.authorId !== user.id && (
                  <button
                    onClick={handleOpenReport}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report Article
                  </button>
                )}
              </div>
            </aside>
          </div>
        </motion.article>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxOpen && post.media && post.media.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <motion.img
            key={lightboxIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={postsService.getImageUrl(post.media[lightboxIndex].path)}
            alt={`${post.title} ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-screen-xl object-contain shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />

          {post.media.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + post.media.length) % post.media.length); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % post.media.length); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {post.media.map((_, i) => (
                  <div key={i} className={cn("h-1.5 rounded-full transition-all", i === lightboxIndex ? "w-6 bg-white" : "w-1.5 bg-white/30")} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Admin Delete Confirmation Dialog */}
      <Dialog open={showAdminDeleteDialog} onOpenChange={setShowAdminDeleteDialog}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Post
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post will be permanently removed from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 pl-3 py-2">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-wide mb-0.5">Post</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">{post.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5">by {post.authorName}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdminDeleteDialog(false)}
              disabled={isDeleting}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminDeletePost}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none"
            >
              {isDeleting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                : <Trash2 className="h-4 w-4 mr-1" />
              }
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={handleCloseReport}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              Report Article
            </DialogTitle>
            <DialogDescription>
              Reports are reviewed by our moderation team.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {reportSuccess ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">Report submitted</p>
                  <p className="text-sm text-zinc-500 mt-1">Thank you for helping maintain accuracy. Our team will review this.</p>
                </div>
                <Button variant="outline" onClick={handleCloseReport} className="rounded-none">Close</Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-3 py-1">
                  <p className="text-xs text-zinc-400 uppercase font-bold tracking-wide mb-0.5">Article</p>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">{post.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">by {post.authorName}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold tracking-wide uppercase text-zinc-500">Reason *</Label>
                  <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                    <SelectTrigger className="rounded-none border-zinc-300 dark:border-zinc-700 mt-1">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold tracking-wide uppercase text-zinc-500">Additional Details <span className="font-normal text-zinc-400">(optional)</span></Label>
                  <Textarea
                    placeholder="Provide any additional context..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3} maxLength={500}
                    className="rounded-none border-zinc-300 dark:border-zinc-700 resize-none mt-1 focus:border-red-600 focus:ring-0"
                  />
                  <p className="text-xs text-zinc-400 text-right mt-1">{reportDescription.length}/500</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseReport} disabled={isSubmittingReport} className="rounded-none">Cancel</Button>
                  <Button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || isSubmittingReport}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-none"
                  >
                    {isSubmittingReport ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-1" />}
                    Submit Report
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}