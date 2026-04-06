import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Sparkles,
  ChevronDown,
  AlertCircle,
  Loader,
  Eye
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
    .map((post) => {
      const props = postsService.postToNewsCardProps(post);
      return {
        ...props,
        image: Array.isArray(props.image) ? props.image : [props.image],
        _createdAt: post.createdAt,
      };
    })
    .filter((article) => {
      const matchesCategory = 
        activeCategory === "All" || 
        (article.category && article.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesCredibility = activeCredibility === "all" || article.credibility === activeCredibility;
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesCredibility && matchesSearch;
    })
    .sort((a, b) => {
      if (activeSort === "recent") {
        // Sort by most recent (newer first) using original ISO date
        return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime();
      } else if (activeSort === "trending") {
        // Sort by engagement (comments + views)
        return (b.views + b.comments) - (a.views + a.comments);
      } else {
        // relevance: prioritize exact title matches
        const queryLower = searchQuery.toLowerCase();
        const aMatch = a.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        const bMatch = b.title.toLowerCase().startsWith(queryLower) ? 1 : 0;
        return bMatch - aMatch || (b.views + b.comments) - (a.views + a.comments);
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Main Feed Column */}
        <div className="flex-1 max-w-2xl w-full mx-auto lg:mx-0">
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
              News Feed
            </h1>
            <p className="text-muted-foreground">
              Stay informed with AI-verified news from trusted sources
            </p>
          </div>

          {/* Search Bar - Mobile Only (Desktop moved to sidebar) */}
          <div className="lg:hidden relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border rounded-xl shadow-sm"
            />
          </div>

          {/* Category Pills - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border border-border shadow-sm",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground hover:bg-muted"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort and Filter Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm mb-8">
            <div className="flex gap-2">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={activeSort === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSort(option.value)}
                  className={cn(
                    "gap-2 rounded-lg",
                    activeSort === option.value && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={activeCredibility}
                onChange={(e) => setActiveCredibility(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                {credibilityFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Loading posts...
              </h3>
            </motion.div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-8"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Error loading feed</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button onClick={() => window.location.reload()} size="sm" className="mt-4">
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* News Feed Stacked Timeline */}
          {!isLoading && !error && filteredAndSortedNews.length > 0 && (
            <div className="flex flex-col gap-6">
              {filteredAndSortedNews.map((article) => (
                <NewsCard 
                  key={article.id} 
                  {...article} 
                  className="w-full"
                  featured={false} 
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredAndSortedNews.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No stories found
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                We couldn't find any news matching your criteria. Try adjusting your filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                  setActiveCredibility("all");
                }}
              >
                Clear Filters
              </Button>
            </motion.div>
          )}

        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            
            {/* Search Box */}
            <div className="relative bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" /> Search
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 w-full bg-background border-border text-sm"
                />
              </div>
            </div>

            {/* Trending Sidebar Box */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Now
              </h3>
              
              <div className="space-y-4">
                {/* Take the top 4 posts globally (unfiltered) for the trending box */}
                {allPosts
                  .sort((a, b) => (b.likesCount || 0) + (b.comments?.length || 0) - ((a.likesCount || 0) + (a.comments?.length || 0)))
                  .slice(0, 4)
                  .map((post, i) => (
                  <div key={post.id} className="group cursor-pointer">
                    <div className="flex items-baseline gap-3">
                      <span className="text-muted-foreground font-display font-bold text-sm">0{i + 1}</span>
                      <div className="flex-1">
                        <Link to={`/article/${post.id}`} className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1">
                          {post.title}
                        </Link>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                           <span className="truncate">{post.authorName}</span> • <Eye className="h-3 w-3 inline" /> {post.likesCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Stats / Info Box */}
            <div className="bg-muted/50 rounded-xl border border-border/50 p-5 text-sm text-muted-foreground">
              <p className="mb-3">
                <strong className="text-foreground">TruthTrack</strong> algorithms process thousands of articles daily to filter out misinformation and protect your timeline.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link to="/about" className="hover:underline">About</Link>
                <Link to="/terms" className="hover:underline">Terms</Link>
                <Link to="/privacy" className="hover:underline">Privacy</Link>
                <span>© 2026 TruthTrack</span>
              </div>
            </div>

          </div>
        </div>

        {/* Load More */}
        {!isLoading && !error && filteredAndSortedNews.length > 0 && (
          <div className="col-span-full mt-12 text-center lg:hidden">
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
