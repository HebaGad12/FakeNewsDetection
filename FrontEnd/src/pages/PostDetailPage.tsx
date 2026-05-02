import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CredibilityBadge } from "@/components/CredibilityBadge";
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
import { userService } from "@/services/userService";
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
          setComments(fetchedPost.comments || []);
          setLikesCount(fetchedPost.likesCount);
          try {
            const userHasLiked = await postsService.hasUserLikedPost(id);
            setIsLiked(userHasLiked);
          } catch { setIsLiked(false); }
        }
      } catch { setError("Failed to load post. Please try again later."); setPost(null); }
      finally { setIsLoading(false); }
    };
    if (id) loadPost();
  }, [id, setLikesCount, setIsLiked]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    try {
      setCommentError(null);
      await addComment(commentInput);
      setCommentInput("");
      if (post) {
        const updatedPost = await postsService.getPostById(post.id);
        if (updatedPost) setComments(updatedPost.comments || []);
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

  const isReader = user?.role?.toLowerCase() === "reader" || user?.role?.toLowerCase() === "regularuser";

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
      <Header />

      {/* Article breadcrumb */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-3">
          <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          {/* Category tag */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <div className="h-3 w-0.5 bg-red-600" />
              <span className="text-xs font-bold tracking-widest uppercase text-red-600">{post.tags[0]}</span>
            </div>
          )}

          {/* Headline */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white leading-tight mb-5">
            {post.title}
          </h1>

          {/* Meta bar — author, date, credibility */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b border-zinc-200 dark:border-zinc-800 py-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white dark:text-zinc-900" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white text-sm">{post.authorName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{post.organizationName || "Independent Journalist"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{formattedDate}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="h-3 w-3" /> {readTime} min read
                </p>
              </div>
              {/* Delete / Report */}
              {user && post.authorId === user.id && (
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  title="Delete post"
                >
                  {isDeleting ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              {isReader && user && post.authorId !== user.id && (
                <button
                  onClick={handleOpenReport}
                  className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                  title="Report post"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Credibility badge */}
          {post.verificationStatus && (
            <div className="mb-8">
              <CredibilityBadge
                level={
                  post.verificationStatus.toLowerCase() === "fake" ? "fake" :
                  post.verificationStatus.toLowerCase() === "questionable" ? "questionable" : "verified"
                }
              />
            </div>
          )}

          {/* Media Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="mb-8 -mx-4 sm:mx-0">
              {post.media.length === 1 ? (
                <div className="cursor-zoom-in overflow-hidden" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
                  <img
                    src={postsService.getImageUrl(post.media[0].path)}
                    alt={post.title}
                    className="w-full h-80 object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                  <p className="text-xs text-zinc-400 mt-2 px-4 sm:px-0">Click to expand</p>
                </div>
              ) : post.media.length === 2 ? (
                <div className="grid grid-cols-2 gap-1">
                  {post.media.map((m, i) => (
                    <div key={m.mediaId} className="relative overflow-hidden cursor-zoom-in group" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                      <img src={postsService.getImageUrl(m.path)} alt={`${post.title} ${i + 1}`} className="h-64 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : post.media.length === 3 ? (
                <div className="grid grid-cols-2 gap-1">
                  <div className="relative overflow-hidden cursor-zoom-in group row-span-2" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
                    <img src={postsService.getImageUrl(post.media[0].path)} alt={`${post.title} 1`} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 min-h-[320px]" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {post.media.slice(1).map((m, i) => (
                    <div key={m.mediaId} className="relative overflow-hidden cursor-zoom-in group" onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}>
                      <img src={postsService.getImageUrl(m.path)} alt={`${post.title} ${i + 2}`} className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative overflow-hidden cursor-zoom-in group" onClick={() => { setLightboxIndex(activeImageIndex); setLightboxOpen(true); }}>
                    <motion.img
                      key={activeImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={postsService.getImageUrl(post.media[activeImageIndex].path)}
                      alt={`${post.title} ${activeImageIndex + 1}`}
                      className="h-80 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + post.media.length) % post.media.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % post.media.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 font-mono">
                      {activeImageIndex + 1}/{post.media.length}
                    </span>
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {post.media.map((m, i) => (
                      <button key={m.mediaId} onClick={() => setActiveImageIndex(i)} className={cn("flex-shrink-0 w-16 h-12 overflow-hidden border-2 transition-all", i === activeImageIndex ? "border-red-600" : "border-transparent opacity-50 hover:opacity-80")}>
                        <img src={postsService.getImageUrl(m.path)} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lightbox */}
          {lightboxOpen && post.media && post.media.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
              {post.media.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + post.media.length) % post.media.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % post.media.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <motion.img
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                src={postsService.getImageUrl(post.media[lightboxIndex].path)}
                alt={`${post.title} ${lightboxIndex + 1}`}
                className="max-h-[88vh] max-w-full object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {post.media.length > 1 && (
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-xs px-3 py-1 font-mono">
                  {lightboxIndex + 1} / {post.media.length}
                </span>
              )}
            </motion.div>
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
              <button
                onClick={toggleLike}
                disabled={isLiking || isLoading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border text-sm font-semibold transition-all",
                  isLiked
                    ? "border-red-600 bg-red-50 dark:bg-red-950/20 text-red-600"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-white"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                {likesCount} Likes
              </button>

              <div className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                <MessageCircle className="h-4 w-4" />
                {comments.length} Comments
              </div>

              {user && (
                <button
                  onClick={handleOpenReport}
                  className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-500 transition-all font-medium"
                >
                  <Flag className="h-4 w-4" />
                  Report
                </button>
              )}
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
              <div className="border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
                {commentError && (
                  <div className="border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 p-3 mb-3 text-sm text-red-700 dark:text-red-400">
                    {commentError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Share your thoughts on this article..."
                    value={commentInput}
                    onChange={(e) => { setCommentInput(e.target.value); setCommentError(null); }}
                    onKeyPress={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    disabled={isCommenting}
                    className="flex-1 rounded-none border-zinc-300 dark:border-zinc-700 focus:border-red-600 focus:ring-0"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentInput.trim() || isCommenting}
                    className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 rounded-none"
                  >
                    {isCommenting ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Comments list */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800">
              {comments.length === 0 ? (
                <div className="p-10 text-center">
                  <MessageCircle className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet. Be the first to share your perspective.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white text-sm">{comment.authorName}</span>
                            <span className="text-zinc-400 text-xs ml-2">{comment.authorRole}</span>
                          </div>
                          <span className="text-xs text-zinc-400 ml-auto">
                            {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pl-9">{comment.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1.5 text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-500 transition-colors flex-shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{comment.authorName}</span>
                          {comment.authorRole === "Journalist" && (
                            <span className="bg-primary/10 text-primary text-[8px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-widest flex items-center gap-0.5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(comment.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-base text-foreground/80 leading-relaxed font-serif">
                        {comment.content}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>
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