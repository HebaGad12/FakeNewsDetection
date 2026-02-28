import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  Sparkles,
  ChevronDown
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CredibilityLevel } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";

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

const newsArticles = [
  {
    id: "1",
    title: "Global Climate Summit Reaches Historic Agreement on Emissions",
    excerpt: "World leaders have agreed on unprecedented measures to reduce carbon emissions by 60% before 2040, marking a pivotal moment in the fight against climate change.",
    author: "Sarah Mitchell",
    organization: "Climate Watch Network",
    image: "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800",
    category: "Environment",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 98,
    readTime: "8 min read",
    views: 45200,
    comments: 342,
    publishedAt: "2 hours ago",
    featured: true,
  },
  {
    id: "2",
    title: "Tech Giants Face New Regulations Over Data Privacy",
    excerpt: "Major technology companies will be required to implement stricter data protection measures under new legislation.",
    author: "James Chen",
    organization: "Tech Insider",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
    category: "Technology",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 95,
    readTime: "5 min read",
    views: 28100,
    comments: 156,
    publishedAt: "4 hours ago",
  },
  {
    id: "3",
    title: "Breakthrough in Renewable Energy Storage Technology",
    excerpt: "Scientists announce a major advancement in battery technology that could revolutionize solar and wind power storage capabilities.",
    author: "Dr. Emily Watson",
    organization: "Science Daily",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800",
    category: "Science",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 97,
    readTime: "6 min read",
    views: 31500,
    comments: 89,
    publishedAt: "5 hours ago",
  },
  {
    id: "4",
    title: "Economic Report Claims Unprecedented Growth Figures",
    excerpt: "Recent claims about economic growth figures are under scrutiny as experts question the methodology used in the analysis.",
    author: "Michael Rivera",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
    category: "Economy",
    credibility: "questionable" as CredibilityLevel,
    credibilityScore: 45,
    readTime: "4 min read",
    views: 18700,
    comments: 234,
    publishedAt: "6 hours ago",
  },
  {
    id: "5",
    title: "New Study Reveals Impact of Social Media on Mental Health",
    excerpt: "Research conducted across multiple countries shows significant correlations between social media usage and mental well-being.",
    author: "Dr. Lisa Park",
    organization: "Health Research Institute",
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800",
    category: "Health",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 92,
    readTime: "7 min read",
    views: 22400,
    comments: 178,
    publishedAt: "7 hours ago",
  },
  {
    id: "6",
    title: "International Sports Federation Announces Major Rule Changes",
    excerpt: "The governing body has approved significant modifications to competition rules that will take effect next season.",
    author: "Carlos Martinez",
    organization: "Sports Network",
    image: "https://images.unsplash.com/photo-1461896836934- voices?w=800",
    category: "Sports",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 94,
    readTime: "4 min read",
    views: 15800,
    comments: 67,
    publishedAt: "8 hours ago",
  },
  {
    id: "7",
    title: "Viral Claim About Vaccine Side Effects Debunked",
    excerpt: "Fact-checkers have thoroughly investigated and disproven widespread claims about vaccine complications circulating online.",
    author: "Medical Review Team",
    organization: "FactCheck Central",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800",
    category: "Health",
    credibility: "fake" as CredibilityLevel,
    credibilityScore: 8,
    readTime: "5 min read",
    views: 89200,
    comments: 1245,
    publishedAt: "9 hours ago",
  },
  {
    id: "8",
    title: "Space Agency Confirms New Exoplanet Discovery",
    excerpt: "Astronomers have identified a potentially habitable planet in a nearby star system using advanced telescope technology.",
    author: "Dr. Robert Chang",
    organization: "Space Exploration Center",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800",
    category: "Science",
    credibility: "verified" as CredibilityLevel,
    credibilityScore: 99,
    readTime: "6 min read",
    views: 52100,
    comments: 298,
    publishedAt: "10 hours ago",
  },
];

const FeedPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("trending");
  const [activeCredibility, setActiveCredibility] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNews = newsArticles.filter((article) => {
    const matchesCategory = activeCategory === "All" || article.category === activeCategory;
    const matchesCredibility = activeCredibility === "all" || article.credibility === activeCredibility;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesCredibility && matchesSearch;
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

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredNews.length}</span> articles
          </p>
        </div>

        {/* News Grid */}
        {filteredNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((article, index) => (
              <NewsCard 
                key={article.id} 
                {...article} 
                featured={index === 0}
              />
            ))}
          </div>
        ) : (
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
        {filteredNews.length > 0 && (
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
