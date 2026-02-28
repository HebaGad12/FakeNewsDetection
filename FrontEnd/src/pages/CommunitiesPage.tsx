import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Search, 
  TrendingUp, 
  MessageSquare, 
  Globe, 
  Lock,
  ChevronRight,
  Plus
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  posts: number;
  category: string;
  image: string;
  isPublic: boolean;
  trending: boolean;
}

const communities: Community[] = [
  {
    id: "1",
    name: "Climate Action Now",
    description: "Discussing climate change, environmental policies, and sustainable solutions for a better future.",
    members: 45200,
    posts: 1234,
    category: "Environment",
    image: "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400",
    isPublic: true,
    trending: true,
  },
  {
    id: "2",
    name: "Tech & Privacy",
    description: "Exploring the intersection of technology, data privacy, and digital rights in the modern age.",
    members: 32100,
    posts: 892,
    category: "Technology",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400",
    isPublic: true,
    trending: true,
  },
  {
    id: "3",
    name: "Political Analysis",
    description: "Fact-based discussions on political developments, policies, and governance worldwide.",
    members: 28500,
    posts: 2156,
    category: "Politics",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400",
    isPublic: true,
    trending: false,
  },
  {
    id: "4",
    name: "Health & Science",
    description: "Latest medical research, health tips, and scientific discoveries explained clearly.",
    members: 38900,
    posts: 1567,
    category: "Health",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400",
    isPublic: true,
    trending: true,
  },
  {
    id: "5",
    name: "Economic Insights",
    description: "Understanding markets, economic policies, and financial trends that affect our lives.",
    members: 21300,
    posts: 743,
    category: "Economy",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    isPublic: true,
    trending: false,
  },
  {
    id: "6",
    name: "Investigative Journalists",
    description: "A private space for journalists to collaborate on investigations and share resources.",
    members: 1250,
    posts: 456,
    category: "Professional",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400",
    isPublic: false,
    trending: false,
  },
];

const categories = ["All", "Environment", "Technology", "Politics", "Health", "Economy", "Professional"];

const CommunitiesPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCommunities = communities.filter((community) => {
    const matchesCategory = activeCategory === "All" || community.category === activeCategory;
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const trendingCommunities = communities.filter(c => c.trending);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
              Communities
            </h1>
            <p className="text-muted-foreground">
              Join discussions and connect with like-minded readers
            </p>
          </div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 w-fit">
            <Plus className="h-4 w-4" />
            Create Community
          </Button>
        </div>

        {/* Trending Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Trending Communities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trendingCommunities.map((community, index) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="h-24 overflow-hidden">
                  <img 
                    src={community.image} 
                    alt={community.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>
                <div className="relative p-4 -mt-8">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {community.name}
                    </h3>
                    {community.isPublic ? (
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {community.members.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {community.posts}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border"
            />
          </div>

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
        </div>

        {/* All Communities */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            All Communities
          </h2>
          <div className="space-y-4">
            {filteredCommunities.map((community, index) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all cursor-pointer"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={community.image} 
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {community.name}
                        </h3>
                        {!community.isPublic && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-accent font-medium">
                        {community.category}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="hidden md:flex gap-1">
                      Join
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {community.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {community.members.toLocaleString()} members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {community.posts} posts
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CommunitiesPage;
