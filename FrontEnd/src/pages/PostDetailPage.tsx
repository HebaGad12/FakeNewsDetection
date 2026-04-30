import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import { AnimatePresence } from "framer-motion";

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

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Use the post interactions hook for like/comment management
  const {
    isLiked,
    likesCount,
    toggleLike,
    addComment,
    deleteComment,
    isLiking,
    isCommenting,
    error: interactionError,
    setIsLiked,
    setLikesCount,
  } = usePostInteractions({
    postId: id || "",
    initialLiked: false,
    initialLikesCount: 0,
  });

  // Load post on mount
  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setError("Post ID not provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const fetchedPost = await postsService.getPostById(id);

        if (!fetchedPost) {
          setError("Post not found");
          setPost(null);
        } else {
          setPost(fetchedPost);
          setComments(fetchedPost.comments || []);
          // Update the hook's like count
          setLikesCount(fetchedPost.likesCount);
          
          // Check if current user has already liked this post
          try {
            const userHasLiked = await postsService.hasUserLikedPost(id);
            setIsLiked(userHasLiked);
          } catch (err) {
            console.error("Failed to check user's like status:", err);
            // Default to false if we can't determine
            setIsLiked(false);
          }
        }
      } catch (err) {
        console.error("Failed to load post:", err);
        setError("Failed to load post. Please try again later.");
        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadPost();
    }
  }, [id, setLikesCount, setIsLiked]);

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!commentInput.trim()) return;

    try {
      setCommentError(null);
      await addComment(commentInput);
      setCommentInput("");
      // Refresh comments by refetching the post
      if (post) {
        const updatedPost = await postsService.getPostById(post.id);
        if (updatedPost) {
          setComments(updatedPost.comments || []);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to post comment. Please try again.";
      setCommentError(errorMessage);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;

    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Handle deleting the post (only author can delete)
  const handleDeletePost = async () => {
    if (!post || !user || post.authorId !== user.id) return;

    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      setIsDeleting(true);
      await postsService.deletePost(post.id);
      navigate("/feed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to delete post. Please try again.";
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  // Report handlers
  const handleOpenReport = () => {
    setReportReason("");
    setReportDescription("");
    setReportSuccess(false);
    setShowReportDialog(true);
  };

  const handleCloseReport = () => {
    setShowReportDialog(false);
    setReportReason("");
    setReportDescription("");
    setReportSuccess(false);
  };

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
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const isReader = user?.role?.toLowerCase() === "reader" || user?.role?.toLowerCase() === "regularuser";

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSpinner fullScreen message="Loading post..." />
      </div>
    );
  }

  // Error state - Post not found
  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/feed")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center"
          >
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              {error || "Post not found"}
            </h2>
            <p className="mb-6 text-muted-foreground">
              The post you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate("/feed")}>Return to Feed</Button>
          </motion.div>
        </main>
      </div>
    );
  }

  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="mx-auto max-w-3xl px-6 lg:pt-16 pb-24">
        {/* Article Canvas */}
        <article className="relative">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/feed")}
            className="mb-8 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </motion.button>

          {/* Headline & Byline */}
          <header className="mb-12">
            <h1 className="text-5xl lg:text-7xl font-serif font-medium tracking-tight text-foreground mb-8 leading-[1.1]">
              {post.title}
            </h1>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 border-none pb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  <div className="h-full w-full bg-gradient-to-br from-primary to-primary/60" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{post.authorName}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans">{post.organizationName || "Independent Contributor"}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans">
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{Math.ceil(post.content.split(/\s+/).length / 200)} Min Read</span>
                {user && post.authorId === user.id && (
                  <>
                    <span>•</span>
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="flex items-center gap-1 text-destructive hover:underline underline-offset-4"
                    >
                      {isDeleting ? (
                        <Loader className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-3 w-3" />
                      )}
                      Delete Post
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Hero Image / Visual Hook */}
          {post.media && post.media.length > 0 && (
            <div className="relative mb-12 aspect-video bg-muted overflow-hidden rounded-sm group cursor-zoom-in" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
              <img
                src={postsService.getImageUrl(post.media[0].path)}
                alt={post.title}
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                 <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* Verified Credibility Indicator */}
          {post.credibilityScore !== undefined && (
            <div className="bg-accent/10 rounded-sm p-6 mb-12 flex gap-6 items-start">
              <div className="bg-accent text-accent-foreground p-3 rounded-sm flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-accent-foreground uppercase tracking-widest text-xs font-sans mb-1">
                  Credibility Score: {post.credibilityScore}%
                </h3>
                <p className="text-foreground/80 font-medium text-sm leading-relaxed font-serif">
                  This content has been analyzed by our automated fact-checking systems. A higher score indicates a closer alignment with verified intelligence and trusted sources across our network.
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="font-serif text-xl leading-[1.8] text-muted-foreground max-w-3xl space-y-8">
            {post.content.split("\n\n").map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-wrap text-foreground/90">
                {paragraph}
              </p>
            ))}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm bg-muted px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interaction Action Bar */}
          <div className="flex flex-row items-center justify-between border-t border-b border-border py-4 mt-8 mb-12">
            <button 
              onClick={toggleLike}
              disabled={isLiking || isLoading || user?.role === "admin"}
              className={cn(
                "flex items-center gap-2 group transition-all",
                user?.role === "admin" && "opacity-50 cursor-not-allowed"
              )}
              title={isLiked ? "Unlike" : "Like"}
            >
              <div className={cn(
                "p-2 rounded-full transition-colors flex items-center justify-center",
                isLiked ? "bg-red-500/10 text-red-500" : "bg-muted group-hover:bg-red-500/10 group-hover:text-red-500 text-muted-foreground"
              )}>
                <Heart className={cn("h-5 w-5 transition-transform group-hover:scale-110", isLiked && "fill-current text-red-500")} />
              </div>
              <span className="font-semibold text-foreground">{likesCount} <span className="text-muted-foreground font-normal sm:inline hidden">{likesCount === 1 ? 'Like' : 'Likes'}</span></span>
            </button>

            {isReader && user && post.authorId !== user.id && (
              <button 
                onClick={handleOpenReport}
                className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors group"
                title="Report Misinformation"
              >
                <div className="p-2 rounded-full bg-muted group-hover:bg-destructive/10 transition-colors flex items-center justify-center text-muted-foreground group-hover:text-destructive">
                  <Flag className="h-5 w-5" />
                </div>
                <span className="font-semibold text-foreground group-hover:text-destructive">Report <span className="hidden sm:inline font-normal text-muted-foreground group-hover:text-destructive/80">Issue</span></span>
              </button>
            )}
          </div>

          {/* Comments Section */}
          <section className="mt-12">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-serif font-medium text-foreground">Comments</h3>
              <span className="font-sans text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{comments.length} Comments</span>
            </div>

            {/* Add Comment Form */}
            {user?.role !== "admin" && (
              <div className="mb-10 space-y-3 bg-muted/30 p-6 rounded-sm border border-border">
                <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                  Add a Comment
                </label>
                {commentError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-sm">
                    {commentError}
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Share your perspective or additional context..."
                    value={commentInput}
                    onChange={(e) => {
                      setCommentInput(e.target.value);
                      setCommentError(null);
                    }}
                    disabled={isCommenting}
                    className="min-h-[100px] resize-none bg-background text-base rounded-sm p-4"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentInput.trim() || isCommenting}
                      className="gap-2 rounded-sm text-xs uppercase tracking-widest font-bold px-8 py-6"
                    >
                      {isCommenting ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Comment
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-10">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm italic font-serif">No comments yet. Be the first to share your thoughts.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground text-xs uppercase overflow-hidden">
                      {comment.authorName.substring(0, 2)}
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
                  </div>
                ))
              )}
            </div>
          </section>
        </article>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              Report Post
            </DialogTitle>
            <DialogDescription>
              Reports are reviewed by our moderation team to keep the platform accurate and safe.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {reportSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Report submitted</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thank you for helping keep the platform safe. Our moderation team will review this post.
                  </p>
                </div>
                <Button variant="outline" onClick={handleCloseReport}>Close</Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Post preview */}
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Reporting</p>
                  <p className="text-sm font-medium text-foreground line-clamp-2">{post.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">by {post.authorName}</p>
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <Label htmlFor="report-reason">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
                    <SelectTrigger id="report-reason">
                      <SelectValue placeholder="Select a reason…" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="report-desc">
                    Additional details <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="report-desc"
                    placeholder="Provide any additional context…"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{reportDescription.length}/500</p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={handleCloseReport} disabled={isSubmittingReport}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || isSubmittingReport}
                    className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isSubmittingReport ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Flag className="h-4 w-4" />
                    )}
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