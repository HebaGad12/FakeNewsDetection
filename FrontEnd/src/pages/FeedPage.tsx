import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Sparkles,
  AlertCircle,
  Loader,
  Eye,
  Verified,
  AlertTriangle,
  MoreHorizontal
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postsService, Post, POST_DELETED_EVENT } from "@/services/postsService";

const categories = [
  "All Stories",
  "Politics",
  "Tech",
  "Science",
  "Health",
  "Economics",
  "Deep Dives",
];

const FeedPage = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState("All Stories");
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

  const filteredNews = allPosts
    .map((post) => {
      const props = postsService.postToNewsCardProps(post);
      return {
        ...props,
        image: Array.isArray(props.image) ? props.image[0] : props.image,
        _createdAt: post.createdAt,
      };
    })
    .filter((article) => {
      const matchesCategory = 
        activeCategory === "All Stories" || 
        (article.category && article.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime());

  const heroArticle = filteredNews.length > 0 ? filteredNews[0] : null;
  const gridArticles = filteredNews.length > 1 ? filteredNews.slice(1) : [];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <Header />

      <main className="max-w-screen-2xl mx-auto px-8 py-8">
        
        {/* Category Horizontal Scroll */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-8 mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                activeCategory === category 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Loading posts...</h3>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Error loading feed</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()} size="sm" className="mt-4">Retry</Button>
            </div>
          </div>
        )}

        {/* Feed Content */}
        {!isLoading && !error && filteredNews.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-semibold text-xl mb-2">No stories found</h3>
            <Button variant="outline" onClick={() => { setActiveCategory("All Stories"); setSearchQuery(""); }}>Clear Filters</Button>
          </div>
        ) : !isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-16">
              
              {/* Hero Featured Article */}
              {heroArticle && (
                <section className="relative group">
                  <Link to={`/article/${heroArticle.id}`}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 items-center">
                      <div className="md:col-span-7 overflow-hidden rounded-md">
                        <img 
                          className="w-full aspect-[4/3] object-cover filter grayscale hover:grayscale-0 transition-all duration-700" 
                          alt={heroArticle.title} 
                          src={heroArticle.image || "https://placehold.co/600x400"} 
                        />
                      </div>
                      <div className="md:col-span-5 py-6 md:py-0">
                        <div className="flex items-center gap-2 mb-4">
                          {heroArticle.credibility === "verified" ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Verified className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Questionable
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Story • {new Date(heroArticle._createdAt).toLocaleDateString()}</span>
                        </div>
                        <h1 className="font-serif text-4xl lg:text-5xl font-bold leading-tight mb-4 tracking-tight group-hover:text-primary transition-colors">
                          {heroArticle.title}
                        </h1>
                        <p className="text-muted-foreground leading-relaxed mb-6">
                          {heroArticle.excerpt}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center overflow-hidden">
                            <span className="font-bold text-muted-foreground">{heroArticle.author?.charAt(0) || "U"}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold">{heroArticle.author || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">Contributor</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* Article Grid */}
              {gridArticles.length > 0 && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                  {gridArticles.map(article => (
                    <article key={article.id} className="flex flex-col group">
                      <Link to={`/article/${article.id}`} className="flex flex-col h-full">
                        <div className="relative overflow-hidden mb-4 aspect-[16/9] rounded-md">
                          <img 
                            className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500" 
                            alt={article.title} 
                            src={article.image || "https://placehold.co/600x400"} 
                          />
                          <div className="absolute top-4 left-4">
                            {article.credibility === "verified" ? (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                <Verified className="w-3 h-3" /> Verified
                              </span>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Questionable
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="font-serif text-xl font-bold mb-2 group-hover:underline">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {article.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-[10px] font-bold">By {article.author || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(article._createdAt).toLocaleDateString()}</span>
                        </div>
                      </Link>
                    </article>
                  ))}
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-12">
              
              {/* Custom Search (Sidebar) */}
              <div className="relative">
                <Input
                  placeholder="Search archive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 border-b border-border rounded-none focus:border-primary focus:ring-0 text-sm py-1 pr-8 transition-all w-full"
                />
                <Search className="absolute right-0 top-1 text-muted-foreground h-4 w-4" />
              </div>

              {/* Live Feed Ticker */}
              <div className="bg-muted/30 p-6 rounded-sm border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live Verification Feed
                  </h4>
                  <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                </div>
                <ul className="space-y-4">
                  <li className="border-b border-border/50 pb-4">
                    <p className="text-xs text-muted-foreground mb-1">Live Updates</p>
                    <p className="text-sm font-medium leading-snug">Fact-checks are continually processed by truth-tracking algorithms.</p>
                  </li>
                </ul>
              </div>

              {/* Trending Verifications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-6">Trending Verifications</h4>
                <div className="space-y-6">
                  {allPosts
                    .sort((a, b) => (b.likesCount || 0) + (b.comments?.length || 0) - ((a.likesCount || 0) + (a.comments?.length || 0)))
                    .slice(0, 3)
                    .map((post, i) => (
                    <Link to={`/article/${post.id}`} key={post.id} className="flex gap-4 group cursor-pointer block">
                      <span className="font-serif text-2xl font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        0{i + 1}
                      </span>
                      <div>
                        <h5 className="font-medium text-sm mb-1 group-hover:underline">{post.title}</h5>
                        {post.predictedClass === "Real News" ? (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold inline-block">Verified</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[9px] font-bold inline-block">Questionable</span>
                        )}
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
                    <Verified className="ml-auto text-green-600 w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary">E</div>
                    <div>
                      <p className="text-xs font-bold">Dr. Elena Rossi</p>
                      <p className="text-[10px] text-muted-foreground">Political Unit</p>
                    </div>
                    <Verified className="ml-auto text-green-600 w-4 h-4" />
                  </div>
                </div>
              </div>

            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FeedPage;
