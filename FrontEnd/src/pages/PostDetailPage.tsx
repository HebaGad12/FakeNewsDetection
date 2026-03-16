import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Loader,
  AlertCircle,
  Trash2,
  Send,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { postsService, Post, PostComment } from "@/services/postsService";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { cn } from "@/lib/utils";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<PostComment[]>([]);

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
          // Update the hook's like count and initial state
          setLikesCount(fetchedPost.likesCount);
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
  }, [id, setLikesCount]);

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!commentInput.trim()) return;

    try {
      await addComment(commentInput);
      setCommentInput("");
      // Refresh comments by refetching the post
      if (post) {
        const updatedPost = await postsService.getPostById(post.id);
        if (updatedPost) {
          setComments(updatedPost.comments || []);
        }
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
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
          {/* Featured Image */}
          {post.media && post.media.length > 0 && (
            <div className="mb-8 overflow-hidden rounded-lg">
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                src={post.media[0].path}
                alt={post.title}
                className="h-96 w-full object-cover"
              />
            </div>
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
            <div className="flex flex-wrap items-center gap-4 border-t border-b border-border py-4">
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
                <CredibilityBadge level="verified" score={85} size="sm" />
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
            {/* Like and Comment Buttons */}
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

              <Button variant="outline" size="lg" className="gap-2">
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>

            {/* Error message for interactions */}
            {interactionError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {interactionError}
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

            {/* Add Comment Form */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <label className="text-sm font-medium text-foreground">
                Add a comment
              </label>
              <div className="flex gap-3">
                <Input
                  placeholder="Share your thoughts..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
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
