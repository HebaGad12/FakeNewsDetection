import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Flame,
  Globe,
  Heart,
  Mic,
  Newspaper,
  Search,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postsService, Post, POST_DELETED_EVENT } from "@/services/postsService";
import { NewsCard } from "@/components/NewsCard";
import {
  ArticleSkeletonGrid,
  BreakingTicker,
  CategoryPill,
  DiscoveryEmptyState,
  LiveUpdateBadge,
  SectionHeader,
  StoryPreview,
  StoryRail,
  TrendingTags,
} from "@/components/news/NewsPrimitives";

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


const toPreview = (article: ReturnType<typeof postsService.postToNewsCardProps> & { _createdAt: string; _likesCount: number }): StoryPreview => ({
  id: article.id,
  title: article.title,
  category: article.category,
  author: article.author,
  excerpt: article.excerpt,
  image: Array.isArray(article.image) ? article.image[0] : article.image,
  publishedAt: article.publishedAt,
  readTime: article.readTime,
  views: article.views,
});

const FeedPage = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const newsItems = useMemo(
    () =>
      allPosts.map((post) => {
        const props = postsService.postToNewsCardProps(post);
        return {
          ...props,
          image: Array.isArray(props.image) ? props.image : [props.image],
          _createdAt: post.createdAt,
          _likesCount: post.likesCount,
        };
      }),
    [allPosts]
  );

  const tags = useMemo(
    () => Array.from(new Set(allPosts.flatMap((post) => post.tags || []))).filter(Boolean),
    [allPosts]
  );

  const filteredAndSortedNews = useMemo(
    () =>
      newsItems
        .filter((article) => {
          const matchesCategory =
            activeCategory === "all" ||
            article.category?.toLowerCase() === activeCategory.toLowerCase();
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            article.title.toLowerCase().includes(query) ||
            article.excerpt.toLowerCase().includes(query) ||
            article.author?.toLowerCase().includes(query) ||
            article.category?.toLowerCase().includes(query);
          return matchesCategory && matchesSearch;
        })
        .sort((a, b) => {
          if (activeSort === "recent") {
            return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime();
          }
          if (activeSort === "trending") {
            return b._likesCount - a._likesCount;
          }
          const queryLower = searchQuery.toLowerCase();
          const aMatch = a.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
          const bMatch = b.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
          return bMatch - aMatch || b._likesCount - a._likesCount;
        }),
    [activeCategory, activeSort, newsItems, searchQuery]
  );

  const featuredPost = filteredAndSortedNews[0];
  const remainingPosts = filteredAndSortedNews.slice(1);
  const mostRead = [...newsItems].sort((a, b) => b._likesCount - a._likesCount).slice(0, 5).map(toPreview);
  const latest = [...newsItems].sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime()).slice(0, 5).map(toPreview);
  const hasActiveFilters = activeCategory !== "all" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setActiveCategory("all");
    setSearchQuery("");
  };

  return (
    <div className="editorial-shell">
      <Header />

      <main id="main-content">
        <BreakingTicker items={latest.slice(0, 2).map(toPreview)} />

        <section className="editorial-band news-grid-lines">
          <div className="news-container py-8 md:py-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <h1 className="font-display text-5xl font-bold leading-[1.02] text-slate-950 md:text-7xl">
                  Latest News, Curated for Context
                </h1>

              </div>

              {/* Stats cards removed */}
            </div>
          </div>
        </section>

        <section className="news-container py-6 md:py-8">
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="editorial-card editorial-card-hover p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    aria-label="Search articles, topics, or authors"
                    placeholder="Search articles, topics, or authors..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="editorial-input h-11 pl-10"
                  />
                </div>

              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2",
                      activeCategory === cat.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    )}
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* TrendingTags component removed */}
          </div>

          {isLoading && <ArticleSkeletonGrid count={9} />}

          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center"
            >
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
              <p className="text-red-600">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 rounded-md">
                Try Again
              </Button>
            </motion.div>
          )}

          {!isLoading && !error && (
            <>
              {featuredPost && (
                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
                  <Link
                    to={`/article/${featuredPost.id}`}
                    className="group block overflow-hidden rounded-lg bg-slate-950 outline-none ring-red-600 transition-shadow duration-200 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                  >
                    <div className="relative min-h-[440px] h-full">
                      {featuredPost.image?.[0] && (
                        <img
                          src={featuredPost.image[0]}
                          alt={featuredPost.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/10" />
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <CategoryPill category={featuredPost.category} className="bg-white/95" />
                          <LiveUpdateBadge label="Featured" />
                        </div>
                        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl">
                          {featuredPost.title}
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                          {featuredPost.excerpt}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                          <span>{featuredPost.author}</span>
                          <span>{featuredPost.readTime}</span>
                          <span className="flex items-center gap-1.5">
                            <Flame className="h-4 w-4" /> {featuredPost.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-6">
                    <StoryRail title="Most Read" items={mostRead} />
                  </div>
                </div>
              )}

              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <SectionHeader
                    kicker="News Stream"
                    title={hasActiveFilters ? "Filtered stories" : "All stories"}
                    description="Browse the newsroom archive with category filters, search, and relevance sorting."
                  />
                  {remainingPosts.length === 0 && featuredPost ? (
                    <div className="grid grid-cols-1">
                      <NewsCard {...featuredPost} className="w-full" featured={false} />
                    </div>
                  ) : remainingPosts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {remainingPosts.map((article) => (
                        <NewsCard key={article.id} {...article} className="w-full" featured={false} />
                      ))}
                    </div>
                  ) : null}

                  {filteredAndSortedNews.length === 0 && (
                    <DiscoveryEmptyState
                      title={hasActiveFilters ? "No stories found" : "No stories yet"}
                      description={
                        hasActiveFilters
                          ? "We couldn't find any news matching your criteria. Try adjusting your filters."
                          : "New verified stories will appear here as soon as they are published."
                      }
                      onReset={hasActiveFilters ? clearFilters : undefined}
                    />
                  )}
                </div>

                <aside className="space-y-6">
                  <div className="editorial-card editorial-card-hover p-5">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                      Popular Topics
                    </div>
                    <div className="space-y-3">
                      {categories.slice(1, 7).map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setActiveCategory(category.id)}
                          className="flex w-full cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-bold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <span className="flex items-center gap-2">
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {allPosts.filter((post) => post.tags?.some((tag) => tag.toLowerCase() === category.id.toLowerCase())).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default FeedPage;