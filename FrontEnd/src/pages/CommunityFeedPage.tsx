import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Shield,
  ShieldBan,
  Trash2,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { communityService } from "@/services";
import { postsService } from "@/services/postsService";
import type {
  CommunityDto,
  CommunityPostDto,
  MemberDto,
  MemberStatusDto,
} from "@/services/commnityServices";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CommunityFeedPage = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [community, setCommunity] = useState<CommunityDto | null>(null);
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [memberStatus, setMemberStatus] = useState<MemberStatusDto | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [postForm, setPostForm] = useState({ content: "", mediaFiles: [] as File[] });
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");

  const [membershipAction, setMembershipAction] = useState<"join" | "leave" | null>(null);
  const [postActionId, setPostActionId] = useState<string | null>(null);
  const [likeActionId, setLikeActionId] = useState<string | null>(null);
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [banActionId, setBanActionId] = useState<string | null>(null);

  const ownerName = community?.creatorName || "Unknown";
  const ownerRole = community?.creatorRole || "Owner";
  const membershipLabel = memberStatus?.status ?? "NotMember";
  const isOwner = !!community && community.createdBy === user?.id;
  const isMember = membershipLabel === "Member";
  const isBanned = membershipLabel === "Banned";
  const canInteractWithPosts = isAuthenticated && isMember && !isBanned;

  const resolveLikeStatuses = useCallback(
    async (communityPosts: CommunityPostDto[]) => {
      if (!user?.id || communityPosts.length === 0) {
        setLikedPosts({});
        return;
      }

      const checks = await Promise.all(
        communityPosts.map(async (post) => {
          const liked = await postsService.hasUserLikedPost(post.id);
          return [post.id, liked] as const;
        })
      );

      setLikedPosts(Object.fromEntries(checks));
    },
    [user?.id]
  );

  const refreshPosts = useCallback(async () => {
    if (!communityId) return;
    setIsRefreshingPosts(true);
    try {
      const updatedPosts = await communityService.getCommunityPosts(communityId);
      setPosts(updatedPosts);
      await resolveLikeStatuses(updatedPosts);
    } catch {
      toast.error("Failed to refresh community posts.");
    } finally {
      setIsRefreshingPosts(false);
    }
  }, [communityId, resolveLikeStatuses]);

  // Load community data (public — does NOT require auth)
  useEffect(() => {
    if (!communityId) {
      setLoadError("Community not found.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadCommunityData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [communityData, membersData, postsData] = await Promise.all([
          communityService.getCommunity(communityId),
          communityService.getMembers(communityId),
          communityService.getCommunityPosts(communityId),
        ]);

        if (cancelled) return;

        setCommunity(communityData);
        setMembers(membersData);
        setPosts(postsData);
      } catch {
        if (!cancelled) setLoadError("Failed to load this community feed.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCommunityData();
    return () => { cancelled = true; };
  }, [communityId]);

  // Load user-specific data (membership status + like statuses)
  // Runs AFTER auth finishes loading and whenever user changes
  useEffect(() => {
    if (authLoading || !communityId) return;

    let cancelled = false;

    const loadUserData = async () => {
      if (!user?.id) {
        setMemberStatus(null);
        setLikedPosts({});
        return;
      }

      try {
        const statusResponse = await communityService.getMemberStatus(communityId, user.id);
        if (cancelled) return;
        if (statusResponse.success && statusResponse.data) {
          setMemberStatus(statusResponse.data);
        } else {
          setMemberStatus({ status: "NotMember" });
        }
      } catch {
        if (!cancelled) setMemberStatus({ status: "NotMember" });
      }

      // Resolve like statuses for current posts
      if (posts.length > 0 && !cancelled) {
        try {
          const checks = await Promise.all(
            posts.map(async (post) => {
              const liked = await postsService.hasUserLikedPost(post.id);
              return [post.id, liked] as const;
            })
          );
          if (!cancelled) setLikedPosts(Object.fromEntries(checks));
        } catch {
          // silently ignore like-check errors
        }
      }
    };

    loadUserData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, user?.id, authLoading]);

  const handleJoin = async () => {
    if (!communityId) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to join this community.");
      navigate("/login");
      return;
    }

    setMembershipAction("join");
    try {
      const response = await communityService.joinCommunity(communityId);
      if (!response.success) {
        toast.error(response.message || "Failed to join the community.");
        return;
      }

      // Reload membership status
      if (user?.id) {
        try {
          const statusRes = await communityService.getMemberStatus(communityId, user.id);
          if (statusRes.success && statusRes.data) setMemberStatus(statusRes.data);
        } catch { /* ignore */ }
      }
      await refreshPosts();
      const updatedMembers = await communityService.getMembers(communityId);
      setMembers(updatedMembers);
      toast.success(response.message || "Joined successfully.");
    } catch {
      toast.error("Failed to join the community.");
    } finally {
      setMembershipAction(null);
    }
  };

  const handleLeave = async () => {
    if (!communityId) return;
    setMembershipAction("leave");
    try {
      const response = await communityService.leaveCommunity(communityId);
      if (!response.success) {
        toast.error(response.message || "Failed to leave the community.");
        return;
      }

      // Reload membership status
      if (user?.id) {
        try {
          const statusRes = await communityService.getMemberStatus(communityId, user.id);
          if (statusRes.success && statusRes.data) setMemberStatus(statusRes.data);
        } catch { /* ignore */ }
      }
      await refreshPosts();
      const updatedMembers = await communityService.getMembers(communityId);
      setMembers(updatedMembers);
      toast.success(response.message || "Left the community.");
    } catch {
      toast.error("Failed to leave the community.");
    } finally {
      setMembershipAction(null);
    }
  };

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!communityId) return;

    if (!postForm.content.trim()) {
      setPostError("Post content is required.");
      return;
    }

    setPostLoading(true);
    setPostError("");
    try {
      const response = await communityService.createPost(communityId, {
        content: postForm.content.trim(),
        mediaFiles: postForm.mediaFiles,
      });

      if (!response.success || !response.data) {
        setPostError(response.message || "Failed to create post.");
        return;
      }

      setPosts((prev) => [response.data as CommunityPostDto, ...prev]);
      setPostForm({ content: "", mediaFiles: [] });
      toast.success(response.message || "Post created successfully.");
      await resolveLikeStatuses([response.data as CommunityPostDto, ...posts]);
    } catch {
      setPostError("Failed to create post.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!communityId) return;
    setPostActionId(postId);
    try {
      const response = await communityService.deletePost(communityId, postId);
      if (!response.success) {
        toast.error(response.message || "Failed to delete post.");
        return;
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      toast.success(response.message || "Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setPostActionId(null);
    }
  };

  const handleToggleLike = async (post: CommunityPostDto) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to like posts.");
      navigate("/login");
      return;
    }

    if (!isMember) {
      toast.error("Join this community to interact with posts.");
      return;
    }

    if (isBanned) {
      toast.error("You are banned from this community.");
      return;
    }

    const alreadyLiked = likedPosts[post.id] ?? false;
    setLikeActionId(post.id);
    try {
      const result = alreadyLiked
        ? await postsService.unlikePost(post.id)
        : await postsService.likePost(post.id);

      setLikedPosts((prev) => ({ ...prev, [post.id]: !alreadyLiked }));
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, totalLikes: result.likes }
            : item
        )
      );
    } catch {
      toast.error("Failed to update like.");
    } finally {
      setLikeActionId(null);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to comment.");
      navigate("/login");
      return;
    }

    if (!isMember) {
      toast.error("Join this community to comment.");
      return;
    }

    if (isBanned) {
      toast.error("You are banned from this community.");
      return;
    }

    const content = (commentInputs[postId] || "").trim();
    if (!content) return;

    setCommentActionId(postId);
    try {
      await postsService.addComment(postId, content);
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      await refreshPosts();
    } catch {
      toast.error("Failed to add comment.");
    } finally {
      setCommentActionId(null);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    setCommentActionId(commentId);
    try {
      await postsService.deleteComment(postId, commentId);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                comments: item.comments.filter((comment) => comment.id !== commentId),
              }
            : item
        )
      );
      toast.success("Comment deleted.");
    } catch {
      toast.error("Failed to delete comment.");
    } finally {
      setCommentActionId(null);
    }
  };

  const handleBanToggle = async (member: MemberDto) => {
    if (!communityId) return;
    setBanActionId(member.id);
    try {
      const response = member.isBanned
        ? await communityService.unbanUser(communityId, member.id)
        : await communityService.banUser(communityId, member.id);

      if (!response.success) {
        toast.error(response.message || "Failed to update member status.");
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, isBanned: !member.isBanned } : m
        )
      );
      toast.success(response.message || (member.isBanned ? "Member unbanned." : "Member banned."));
    } catch {
      toast.error("Failed to update member status.");
    } finally {
      setBanActionId(null);
    }
  };

  const renderPostMedia = (mediaPath: string, index: number) => {
    const fullPath = communityService.getImageUrl(mediaPath);
    const isVideo = /(\.mp4|\.mov|\.avi|\.mkv|\.webm)$/i.test(mediaPath);

    if (isVideo) {
      return (
        <video
          key={`${mediaPath}-${index}`}
          src={fullPath}
          controls
          className="w-full max-h-96 rounded-md border border-border bg-black/80"
        />
      );
    }

    return (
      <img
        key={`${mediaPath}-${index}`}
        src={fullPath}
        alt="Community post media"
        className="w-full rounded-md border border-border object-cover"
      />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading community feed...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError || !community) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-20">
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center space-y-4">
            <p className="text-foreground font-semibold">{loadError || "Community not found."}</p>
            <Button onClick={() => navigate("/communities")}>Back to communities</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const communityImageUrl = community.imageUrl
    ? communityService.getImageUrl(community.imageUrl)
    : null;

  return (
    <div className="editorial-shell">
      <Header />

      {/* ── Hero Banner ── */}
      <div className="relative flex min-h-[360px] w-full flex-col justify-end overflow-hidden border-b border-slate-200 bg-white">
        {/* Background image — clearly visible */}
        {communityImageUrl ? (
          <>
            <img
              src={communityImageUrl}
              alt={community.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            {/* light dark gradient only at bottom so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-slate-50 news-grid-lines" />
        )}

        {/* Content */}
        <div className="news-container relative pt-8 pb-10 w-full">
          {/* Back button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/communities")}
            className="gap-2 mb-6 bg-background/70 backdrop-blur-sm border-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to communities
          </Button>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Community avatar / thumbnail */}
            {communityImageUrl ? (
              <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg ring-2 ring-black/20">
                <img
                  src={communityImageUrl}
                  alt={community.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-primary/10 border-2 border-border shadow-lg flex items-center justify-center">
                <Users className="w-10 h-10 text-primary/60" />
              </div>
            )}

            {/* Name + meta */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className={`font-sans text-[10px] font-semibold tracking-widest uppercase mb-1 ${communityImageUrl ? "text-white/70" : "text-accent"}`}>
                  {ownerRole} Network
                </p>
                <h1 className={`text-3xl md:text-5xl font-display font-bold flex items-center gap-3 leading-tight ${communityImageUrl ? "text-white drop-shadow-md" : "text-slate-950"}`}>
                  {community.name}
                  {!community.isOpen && <Lock className="h-5 w-5 opacity-70" />}
                </h1>
              </div>

              {community.description && (
                <p className={`text-sm sm:text-base max-w-2xl leading-relaxed ${communityImageUrl ? "text-white/80" : "text-muted-foreground"}`}>
                  {community.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider">
                <span className="rounded-sm border border-white/20 bg-black/30 backdrop-blur-sm text-white/80 px-2 py-1">
                  Owner: {ownerName}
                </span>
                <span className="rounded-sm border border-white/20 bg-black/30 backdrop-blur-sm text-white/80 px-2 py-1">
                  {community.isOpen ? "Open community" : "Closed community"}
                </span>
                <span className="rounded-sm border border-white/20 bg-black/30 backdrop-blur-sm text-white/80 px-2 py-1">
                  Status: {membershipLabel}
                </span>
              </div>
            </div>

            {/* Join / Leave button */}
            <div className="flex-shrink-0">
              {isMember ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLeave}
                  disabled={membershipAction === "leave" || isOwner}
                  className="bg-background/70 backdrop-blur-sm border-white/20"
                >
                  {membershipAction === "leave" ? "Leaving..." : isOwner ? "Owner" : "Leave"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleJoin}
                  disabled={!community.isOpen || membershipAction === "join" || isBanned}
                >
                  {membershipAction === "join"
                    ? "Joining..."
                    : community.isOpen
                    ? "Join community"
                    : "Closed"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="news-container py-10 space-y-8">

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_340px] gap-8">
          <section className="space-y-6">
            <div className="editorial-card p-4 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {members.length.toLocaleString()} members
              </span>
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {posts.length.toLocaleString()} posts
              </span>
              {isRefreshingPosts && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing feed...
                </span>
              )}
            </div>

            <form onSubmit={handleCreatePost} className="editorial-card p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-950">Create post</h2>
              <Textarea
                value={postForm.content}
                onChange={(event) =>
                  setPostForm((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder={canInteractWithPosts ? "Share an update with your community..." : "Join this community to post updates."}
                rows={4}
                disabled={postLoading || !canInteractWithPosts}
              />
              <Input
                type="file"
                multiple
                disabled={postLoading || !canInteractWithPosts}
                onChange={(event) =>
                  setPostForm((prev) => ({
                    ...prev,
                    mediaFiles: Array.from(event.target.files || []),
                  }))
                }
              />
              {postError && <p className="text-sm text-destructive">{postError}</p>}
              <Button
                type="submit"
                disabled={postLoading || !canInteractWithPosts || !postForm.content.trim()}
              >
                {postLoading ? "Posting..." : "Publish post"}
              </Button>
            </form>

            {posts.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
                No posts yet. Start the first discussion.
              </div>
            )}

            {posts.map((post) => {
              const userLiked = likedPosts[post.id] ?? false;
              const canDeletePost = isOwner || post.authorId === user?.id;

              return (
                <article key={post.id} className="editorial-card editorial-card-hover p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{post.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.authorRole} • {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {canDeletePost && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={postActionId === post.id}
                      >
                        {postActionId === post.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap font-serif text-lg leading-8 text-slate-800">{post.content}</p>

                  {post.mediaPaths && post.mediaPaths.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {post.mediaPaths.map((mediaPath, index) => renderPostMedia(mediaPath, index))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleLike(post)}
                      disabled={likeActionId === post.id || !isAuthenticated || !isMember || isBanned}
                      className={cn(userLiked && "border-primary text-primary")}
                    >
                      {likeActionId === post.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Heart className={cn("h-4 w-4 mr-1", userLiked && "fill-current")} />
                      )}
                      {post.totalLikes} likes
                    </Button>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments.length} comments
                    </span>
                  </div>

                  <div className="space-y-3 border-t border-border pt-3">
                    {post.comments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    )}
                    {post.comments.map((comment) => {
                      const canDeleteComment = comment.authorId === user?.id;
                      return (
                        <div
                          key={comment.id}
                          className="rounded-md border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-foreground">
                              {comment.authorName}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {comment.authorRole}
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                              {canDeleteComment && (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  disabled={commentActionId === comment.id}
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={commentInputs[post.id] || ""}
                      onChange={(event) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder={
                        canInteractWithPosts
                          ? "Write a comment..."
                          : "Join this community to comment."
                      }
                      disabled={!canInteractWithPosts || commentActionId === post.id}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleAddComment(post.id)}
                      disabled={
                        !canInteractWithPosts ||
                        commentActionId === post.id ||
                        !(commentInputs[post.id] || "").trim()
                      }
                    >
                      {commentActionId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Community owner
              </h2>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{ownerName}</p>
                  <p className="text-xs text-muted-foreground">{ownerRole}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Members ({members.length})
              </h2>
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">No members available.</p>
              )}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "rounded-md border px-3 py-2 flex items-center justify-between gap-2",
                      member.isBanned
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                        {member.isBanned && (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase text-destructive">Banned</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                      {isOwner && member.id !== user?.id && (
                        <Button
                          type="button"
                          variant={member.isBanned ? "outline" : "destructive"}
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleBanToggle(member)}
                          disabled={banActionId === member.id}
                        >
                          {banActionId === member.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : member.isBanned ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Unban
                            </>
                          ) : (
                            <>
                              <ShieldBan className="h-3 w-3 mr-1" />
                              Ban
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CommunityFeedPage;
