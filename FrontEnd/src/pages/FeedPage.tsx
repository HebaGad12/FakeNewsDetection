

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  Loader,
  Eye,
  Flame,
  Newspaper,
  Video,
  Mic,
  Heart,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postsService, Post, POST_DELETED_EVENT } from "@/services/postsService";

// الفئات بتصميم عالمي جديد
const categories = [
  { id: "all", name: "All", icon: Newspaper },
  { id: "Politics", name: "Politics", icon: TrendingUp },
  { id: "Technology", name: "Technology", icon: Sparkles },
  { id: "Science", name: "Science", icon: Mic },
  { id: "Health", name: "Health", icon: Heart },
  { id: "Environment", name: "Environment", icon: Globe },
  { id: "Economy", name: "Economy", icon: TrendingUp },
  { id: "Sports", name: "Sports", icon: Flame },
  { id: "Entertainment", name: "Entertainment", icon: Video },
];

// خيارات الترتيب
const sortOptions = [
  { value: "trending", label: "Trending", icon: Flame },
  { value: "recent", label: "Latest", icon: Clock },
  { value: "relevance", label: "Relevance", icon: Sparkles },
];

// استيراد أيقونة Globe
import { Globe } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";

const FeedPage = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort state
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const posts = await postsService.getAllPosts();
        setAllPosts(posts);
      } catch (err) {
        console.error("Failed to load posts:", err);
        setError("Failed to load posts. Please try again later.");
        setAllPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();

    const handlePostDeleted = (event: CustomEvent<{ postId: string }>) => {
      const deletedPostId = event.detail?.postId;
      if (!deletedPostId) return;
      setAllPosts((prev) => prev.filter((post) => post.id !== deletedPostId));
    };

    window.addEventListener(POST_DELETED_EVENT, handlePostDeleted as EventListener);
    return () => {
      window.removeEventListener(POST_DELETED_EVENT, handlePostDeleted as EventListener);
    };
  }, []);

  // Transform posts and apply filters/sorting
  const filteredAndSortedNews = allPosts
    .map((post) => {
      const props = postsService.postToNewsCardProps(post);
      return {
        ...props,
        image: Array.isArray(props.image) ? props.image : [props.image],
        _createdAt: post.createdAt,
        _likesCount: post.likesCount,
      };
    })
    .filter((article) => {
      const matchesCategory =
        activeCategory === "all" ||
        (article.category &&
          article.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (activeSort === "recent") {
        return (
          new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime()
        );
      } else if (activeSort === "trending") {
        return b._likesCount - a._likesCount;
      } else {
        const queryLower = searchQuery.toLowerCase();
        const aMatch = a.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        const bMatch = b.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        return bMatch - aMatch || b._likesCount - a._likesCount;
      }
    });

  // Featured post (أول بوست مميز في الصفحة)
  const featuredPost = filteredAndSortedNews[0];
  const remainingPosts = filteredAndSortedNews.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* ========== PAGE HEADER ========== */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-2">
            Latest News
          </h1>
          <p className="text-slate-500 text-lg">
            Stay informed with AI-verified news from trusted sources
          </p>
        </div>

        {/* ========== TOP SECTION: Featured Post + Sidebar ========== تصميم شبيه بـ BBC */}
        {!isLoading && !error && featuredPost && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Featured Article - Large */}
            <Link
              to={`/article/${featuredPost.id}`}
              className="lg:col-span-2 group block"
            >
              <div className="relative overflow-hidden rounded-xl bg-slate-900">
                {featuredPost.image && featuredPost.image[0] && (
                  <img
                    src={featuredPost.image[0]}
                    alt={featuredPost.title}
                    className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5">
                    {featuredPost.category}
                    </span>
                    <span className="text-white/60 text-sm">
                      {featuredPost.publishedAt}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                    {featuredPost.title}
                  </h2>
                  <p className="text-white/70 text-sm line-clamp-2">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 mt-4 text-white/50 text-sm">
                    <span>{featuredPost.author}</span>
                    <span>{featuredPost.readTime}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {featuredPost.views}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Top Stories Sidebar */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-slate-900">Top Stories</h3>
              </div>
              <div className="space-y-4">
                {remainingPosts.slice(0, 4).map((post, idx) => (
                  <Link
                    key={post.id}
                    to={`/article/${post.id}`}
                    className="block group"
                  >
                    <div className="flex gap-3">
                      <span className="text-2xl font-bold text-slate-300 group-hover:text-red-600 transition-colors">
                        0{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-medium text-slate-900 group-hover:text-red-600 transition-colors text-sm line-clamp-2">
                          {post.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {post.author}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Top Contributors */}
            <div className="bg-muted p-6 rounded-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Top Contributors</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">A</div>
                  <div>
                    <p className="text-xs font-bold">Arjun Mehta</p>
                    <p className="text-[10px] text-muted-foreground">Environmental Intelligence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SEARCH & FILTERS BAR ========== */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 pb-4 border-b border-slate-200">
          {/* Search - هيدا اللي كان في السايد بار */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search articles, topics, or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 w-full border-slate-200 rounded-full bg-slate-50 focus:bg-white focus:border-red-600 focus:ring-0"
            />
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={activeSort === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveSort(option.value)}
                className={cn(
                  "gap-2 rounded-full",
                  activeSort === option.value &&
                    "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                <option.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* ========== CATEGORY PILLS - تصميم متداول في المواقع الإخبارية ========== */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                activeCategory === cat.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.name}
            </button>
          ))}
        </div>

        {/* ========== LOADING STATE ========== */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Loader className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading latest news...</p>
          </motion.div>
        )}

        {/* ========== ERROR STATE ========== */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center"
          >
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4 rounded-full"
            >
              Try Again
            </Button>
          </motion.div>
        )}

        {/* ========== NEWS GRID - تصميم شبكة الأخبار ========== */}
        {!isLoading && !error && (
          <>
            {remainingPosts.length === 0 && featuredPost ? (
              // إذا كان هناك بوست واحد فقط
              <div className="grid grid-cols-1">
                <NewsCard
                  {...featuredPost}
                  className="w-full"
                  featured={false}
                />
              </div>
            ) : remainingPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingPosts.map((article) => (
                  <NewsCard
                    key={article.id}
                    {...article}
                    className="w-full"
                    featured={false}
                  />
                ))}
              </div>
            ) : null}

            {/* Empty State */}
            {filteredAndSortedNews.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 rounded-xl"
              >
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2">
                  No stories found
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  We couldn't find any news matching your criteria. Try
                  adjusting your filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                  className="rounded-full"
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FeedPage;