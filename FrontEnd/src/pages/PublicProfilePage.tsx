import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  FileText,
  Heart,
  Eye,
  Clock,
  UserMinus,
  UserPlus,
  ExternalLink,
  Loader,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Newspaper,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { postsService, Post } from "@/services/postsService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PublicProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const profileAvatarUrlRef = useRef<string | null>(null);

  // Derive journalist info from posts (authorName, authorId come from post data)
  const journalistName = posts[0]?.authorName ?? "Journalist";
  const journalistId = posts[0]?.authorId ?? id;

  useEffect(() => {
    return () => {
      if (profileAvatarUrlRef.current) {
        URL.revokeObjectURL(profileAvatarUrlRef.current);
        profileAvatarUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoadingPosts(true);
        setError(null);

        // Load all posts and filter by this author
        const allPosts = await postsService.getAllPosts();
        const authorPosts = allPosts.filter((p) => p.authorId === id);
        setPosts(authorPosts);

        // Check if current user follows this journalist
        if (user) {
          const following = await userService.getFollowing();
          setIsFollowing(following.some((f: { id: string }) => f.id === id));
        }
      } catch {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoadingPosts(false);
      }
    };

    void load();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;

    let isActive = true;

    const loadAvatar = async () => {
      try {
        const blobUrl = await userService.fetchPictureBlobUrl(id);
        if (!isActive) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }

        if (profileAvatarUrlRef.current) {
          URL.revokeObjectURL(profileAvatarUrlRef.current);
        }

        profileAvatarUrlRef.current = blobUrl;
        setProfileAvatarUrl(blobUrl);
      } catch (e) {
        console.error("Failed to load avatar", e);
      }
    };

    void loadAvatar();

    return () => {
      isActive = false;
    };
  }, [id]);

  const handleToggleFollow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!id) return;
    try {
      setLoadingFollow(true);
      if (isFollowing) {
        await userService.unfollow(id);
        setIsFollowing(false);
        toast.success("Unfollowed successfully");
      } else {
        await userService.follow(id);
        setIsFollowing(true);
        toast.success(`Now following ${journalistName}!`);
      }
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setLoadingFollow(false);
    }
  };

  // Stats derived from posts
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount ?? 0), 0);
  const totalViews = posts.reduce((sum, p) => sum + (p.views ?? 0), 0);
  const approvedPosts = posts.filter(
    (p) => p.moderationStatus?.toLowerCase() === "approved"
  ).length;

  const isOwnProfile = user?.id === id;

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#FCF8F8]">
      <Header />

      <main className="container max-w-7xl mx-auto px-6 py-10">
        {/* ── Back button ── */}
        <button
          onClick={() => {
            const from = (location.state as { from?: string })?.from;
            if (from === "dashboard") {
              navigate("/dashboard", { state: { refreshFollowing: true } });
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-base text-[#430909]/50 hover:text-[#430909] mb-10 font-medium transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>

        {/* ── Loading ── */}
        {loadingPosts && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader className="h-8 w-8 animate-spin text-[#430909]/40 mb-4" />
            <p className="text-[#430909]/50 text-base">Loading profile…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loadingPosts && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium text-base">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-sm text-[#430909]/50 hover:text-[#430909] underline"
            >
              Go back
            </button>
          </div>
        )}

        {!loadingPosts && !error && (
          <>
            {/* ── Profile Hero ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#430909]/10 rounded-lg overflow-hidden mb-10 shadow-sm"
            >
              <div className="relative">
                {/* Top banner */}
                <div className="h-44 bg-[#430909] relative overflow-hidden">
                  <div className="absolute inset-0"
                    style={{ backgroundImage: "radial-gradient(circle at 25% 60%, rgba(252,248,248,0.12) 0%, transparent 55%), radial-gradient(circle at 80% 30%, rgba(0,0,0,0.3) 0%, transparent 50%)" }}
                  />
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: "repeating-linear-gradient(45deg, #FCF8F8 0px, #FCF8F8 1px, transparent 1px, transparent 14px)" }}
                  />
                </div>

                <div className="absolute -bottom-14 left-10">
                  <div className="w-28 h-28 rounded-[1.5rem] bg-white border-4 border-white shadow-xl overflow-hidden">
                    <div className="w-full h-full rounded-[1rem] bg-[#430909]/10 flex items-center justify-center overflow-hidden">
                      {profileAvatarUrl ? (
                        <img src={profileAvatarUrl} alt={journalistName} className="w-full h-full object-contain bg-white" />
                      ) : (
                        <span className="text-[#430909] text-3xl font-bold uppercase">
                          {journalistName.substring(0, 2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-10 pb-10 pt-20">
                <div className="mb-6 flex items-start justify-end">
                  {user && !isOwnProfile && (
                    <button
                      onClick={handleToggleFollow}
                      disabled={loadingFollow}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold transition-all border",
                        isFollowing
                          ? "bg-[#430909]/8 text-[#430909] border-[#430909]/20 hover:bg-red-600 hover:text-white hover:border-red-600"
                          : "bg-[#430909] text-[#FCF8F8] border-[#430909] hover:bg-[#430909]/85",
                        loadingFollow && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {loadingFollow ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : isFollowing ? (
                        <UserMinus className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {isFollowing ? "Unfollow" : "Follow"}
                    </button>
                  )}
                </div>

                {/* Name & role */}
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-[#430909] tracking-tight">{journalistName}</h1>
                  <p className="text-[#430909]/50 text-base mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#430909]/40" />
                    Verified Journalist
                  </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {[
                    { icon: FileText,     label: "Posts",       value: posts.length,  color: "" },
                    { icon: CheckCircle2, label: "Approved",    value: approvedPosts, color: "text-emerald-600" },
                    { icon: Heart,        label: "Total Likes", value: totalLikes,    color: "" },
                    { icon: Eye,          label: "Total Views", value: totalViews,    color: "" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-[#FCF8F8] rounded-lg p-5 border border-[#430909]/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-5 w-5", color || "text-[#430909]/40")} />
                        <span className="text-xs font-mono text-[#430909]/40 uppercase tracking-wider">{label}</span>
                      </div>
                      <p className="text-3xl font-bold text-[#430909]">{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Posts section ── */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#430909] flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-[#430909]/50" />
                Published Articles
              </h2>
              <span className="text-sm text-[#430909]/40 font-mono">{posts.length} articles</span>
            </div>

            {posts.length === 0 ? (
              <div className="bg-white border border-[#430909]/10 rounded-lg p-20 text-center">
                <FileText className="h-14 w-14 text-[#430909]/15 mx-auto mb-4" />
                <p className="text-[#430909]/40 font-medium text-base">No published articles yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/article/${post.id}`}
                      className="group flex items-start gap-6 bg-white border border-[#430909]/10 rounded-lg p-6 hover:border-[#430909]/30 hover:shadow-md transition-all"
                    >
                      {/* Number */}
                      <span className="text-4xl font-bold text-[#430909]/15 group-hover:text-[#430909]/25 transition-colors flex-shrink-0 w-12 text-center leading-tight mt-1">
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {post.moderationStatus?.toLowerCase() === "approved" && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                              Verified
                            </span>
                          )}
                          {post.tags?.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#430909]/8 text-[#430909]/60 border border-[#430909]/10 uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-lg font-bold text-[#430909] group-hover:text-[#430909]/70 transition-colors line-clamp-2 leading-snug mb-2">
                          {post.title}
                        </h3>
                        {post.content && (
                          <p className="text-base text-[#430909]/50 line-clamp-2 mb-3">
                            {post.content.substring(0, 160)}…
                          </p>
                        )}
                        <div className="flex items-center gap-5 text-sm text-[#430909]/35 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {formatDate(post.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" /> {post.likesCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" /> {post.views ?? 0}
                          </span>
                          <span className="flex items-center gap-1 text-[#430909]/50 group-hover:text-[#430909]">
                            <ExternalLink className="h-3.5 w-3.5" /> Read
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {post.media?.[0] && (
                        <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#430909]/5 border border-[#430909]/10">
                          <img
                            src={postsService.getImageUrl(post.media[0].path)}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfilePage;