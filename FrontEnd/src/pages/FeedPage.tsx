import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Sparkles,
  ChevronDown,
  AlertCircle,
  Loader
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CredibilityLevel } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";
import { postsService, Post, POST_DELETED_EVENT } from "@/services/postsService";

const categories = [
  "All",
  "Politics",
  "Technology",
  "Science",
  "Health",
  "Environment",
  "Economy",
  "Sports",
  "Entertainment",
];

const sortOptions = [
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "recent", label: "Most Recent", icon: Clock },
  { value: "relevance", label: "Relevance", icon: Sparkles },
];

const credibilityFilters = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified Only" },
  { value: "questionable", label: "Questionable" },
];

const FeedPage = () => {
  // Posts data
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort state
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("recent");
  const [activeCredibility, setActiveCredibility] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load posts on mount
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

    window.addEventListener(
      POST_DELETED_EVENT,
      handlePostDeleted as EventListener
    );

    return () => {
      window.removeEventListener(
        POST_DELETED_EVENT,
        handlePostDeleted as EventListener
      );
    };
  }, []);

  // Transform posts to NewsCard props and apply filters/sorting
  const filteredAndSortedNews = allPosts
    .map((post) => ({
      ...postsService.postToNewsCardProps(post),
    }))
    .filter((article) => {
      const matchesCategory = activeCategory === "All" || article.category === activeCategory;
      const matchesCredibility = activeCredibility === "all" || article.credibility === activeCredibility;
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCredibility && matchesSearch;
    })
    .sort((a, b) => {
      if (activeSort === "recent") {
        // Sort by most recent (newer first)
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      } else if (activeSort === "trending") {
        // Sort by engagement (comments + views)
        return (b.views + b.comments) - (a.views + a.comments);
      } else {
        // relevance: prioritize exact title matches
        const queryLower = searchQuery.toLowerCase();
        const aMatch = a.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        const bMatch = b.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        return bMatch - aMatch || b.views - a.views;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
            News Feed
          </h1>
          <p className="text-muted-foreground">
            Stay informed with AI-verified news from trusted sources
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeCategory === category
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort and Filter Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Sort Options */}
            <div className="flex gap-2">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={activeSort === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSort(option.value)}
                  className={cn(
                    "gap-2",
                    activeSort === option.value && "bg-accent text-accent-foreground"
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Credibility Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={activeCredibility}
                onChange={(e) => setActiveCredibility(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {credibilityFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Loader className="h-8 w-8 text-accent animate-spin" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              Loading posts...
            </h3>
            <p className="text-muted-foreground">
              Please wait while we fetch the latest articles
            </p>
          </motion.div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Error loading posts</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm" 
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Count */}
        {!isLoading && !error && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredAndSortedNews.length}</span> articles
            </p>
          </div>
        )}

        {/* News Grid */}
        {!isLoading && !error && filteredAndSortedNews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedNews.map((article, index) => (
              <NewsCard 
                key={article.id} 
                {...article} 
                featured={index === 0}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedNews.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              No articles found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search terms
            </p>
          </motion.div>
        )}

        {/* Load More */}
        {!isLoading && !error && filteredAndSortedNews.length > 0 && (
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" className="gap-2">
              Load More Articles
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FeedPage;
