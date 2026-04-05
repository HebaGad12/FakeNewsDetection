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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { postsService, Post, PostComment } from "@/services/postsService";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/feed")}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feed
        </motion.button>

        {/* Post Container */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          {/* Media Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="mb-8">
              {post.media.length === 1 ? (
                /* Single image */
                <div
                  className="overflow-hidden rounded-xl cursor-zoom-in"
                  onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                >
                  <motion.img
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={postsService.getImageUrl(post.media[0].path)}
                    alt={post.title}
                    className="h-96 w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : post.media.length === 2 ? (
                /* Two images side by side */
                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                  {post.media.map((m, i) => (
                    <div
                      key={m.mediaId}
                      className="relative overflow-hidden cursor-zoom-in group"
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                    >
                      <img
                        src={postsService.getImageUrl(m.path)}
                        alt={`${post.title} ${i + 1}`}
                        className="h-64 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : post.media.length === 3 ? (
                /* Three images: 1 large + 2 small */
                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                  <div
                    className="relative overflow-hidden cursor-zoom-in group row-span-2"
                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                  >
                    <img
                      src={postsService.getImageUrl(post.media[0].path)}
                      alt={`${post.title} 1`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 min-h-[320px]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {post.media.slice(1).map((m, i) => (
                    <div
                      key={m.mediaId}
                      className="relative overflow-hidden cursor-zoom-in group"
                      onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}
                    >
                      <img
                        src={postsService.getImageUrl(m.path)}
                        alt={`${post.title} ${i + 2}`}
                        className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 4+ images: main preview + thumbnails strip */
                <div className="space-y-2">
                  {/* Main image */}
                  <div
                    className="relative overflow-hidden rounded-xl cursor-zoom-in group"
                    onClick={() => { setLightboxIndex(activeImageIndex); setLightboxOpen(true); }}
                  >
                    <motion.img
                      key={activeImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      src={postsService.getImageUrl(post.media[activeImageIndex].path)}
                      alt={`${post.title} ${activeImageIndex + 1}`}
                      className="h-96 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    {/* Prev / Next arrows */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + post.media.length) % post.media.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % post.media.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {/* Counter */}
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {activeImageIndex + 1} / {post.media.length}
                    </span>
                  </div>
                  {/* Thumbnails */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {post.media.map((m, i) => (
                      <button
                        key={m.mediaId}
                        onClick={() => setActiveImageIndex(i)}
                        className={cn(
                          "flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                          i === activeImageIndex ? "border-accent scale-105" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img
                          src={postsService.getImageUrl(m.path)}
                          alt={`thumb ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              {post.media.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + post.media.length) % post.media.length); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % post.media.length); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <motion.img
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                src={postsService.getImageUrl(post.media[lightboxIndex].path)}
                alt={`${post.title} ${lightboxIndex + 1}`}
                className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              {post.media.length > 1 && (
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm px-3 py-1 rounded-full">
                  {lightboxIndex + 1} / {post.media.length}
                </span>
              )}
            </motion.div>
          )}

          {/* Post Header */}
          <div className="mb-8 space-y-4">
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-display text-4xl font-bold text-foreground">
              {post.title}
            </h1>

            {/* Post Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b border-border py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent/60" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{post.authorName}</p>
                  <p className="text-sm text-muted-foreground">{post.organizationName || "Independent"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <p>{formattedDate}</p>
                  <p className="text-xs">
                    {Math.ceil(post.content.split(/\s+/).length / 200)} min read
                  </p>
                </div>
                
                
                {/* Delete button - only show for post author */}
                {user && post.authorId === user.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="prose prose-invert max-w-none space-y-6 text-foreground"
          >
            {post.content.split("\n\n").map((paragraph, idx) => (
              <p key={idx} className="text-base leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </motion.div>

          {/* Interaction Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 space-y-6 border-t border-border pt-8"
          >
            {/* Like and Comment Buttons - Hidden for admins */}
            {user?.role !== "admin" && (
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleLike}
                  disabled={isLiking || isLoading}
                  className={cn(
                    "gap-2",
                    isLiked && "bg-accent/20 text-accent border-accent"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      isLiked && "fill-current"
                    )}
                  />
                  {likesCount} Likes
                </Button>

                <Button variant="outline" size="lg" className="gap-2" disabled>
                  <MessageCircle className="h-5 w-5" />
                  {comments.length} Comments
                </Button>
              </div>
            )}
            
            {/* View only message for admins */}
            {user?.role === "admin" && (
              <div className="rounded-lg p-4 text-center">
                
              </div>
            )}
          </motion.div>

          {/* Comments Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 space-y-6 border-t border-border pt-8"
          >
            <h2 className="text-2xl font-bold text-foreground">Comments</h2>

            {/* Add Comment Form - Not visible for admins */}
            {user?.role !== "admin" && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <label className="text-sm font-medium text-foreground">
                  Add a comment
                </label>
                {commentError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-semibold">Unable to post comment:</p>
                    <p>{commentError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Input
                    placeholder="Share your thoughts..."
                    value={commentInput}
                    onChange={(e) => {
                      setCommentInput(e.target.value);
                      setCommentError(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    disabled={isCommenting}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentInput.trim() || isCommenting}
                    className="gap-2"
                  >
                    {isCommenting ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent/60" />
                            <div className="flex flex-col">
                              <p className="font-semibold text-foreground">
                                {comment.authorName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {comment.authorRole}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <p className="text-base text-foreground">
                          {comment.content}
                        </p>
                      </div>

                      {/* Delete button - visible on hover */}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="rounded-lg p-2 hover:bg-destructive/10 transition-colors group"
                        title="Delete comment"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>
        </motion.article>
      </main>

      <Footer />
    </div>
  );
}