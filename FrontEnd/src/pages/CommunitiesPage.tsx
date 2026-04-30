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

const borderColors = [
    "border-l-primary",
    "border-l-accent",
    "border-l-foreground",
    "border-l-blue-500",
    "border-l-purple-500",
    "border-l-emerald-500"
];

const CommunitiesPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCommunities = communities.filter((community) => {
    const matchesCategory = 
      activeCategory === "All" || 
      (community.category && community.category.toLowerCase() === activeCategory.toLowerCase());
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const trendingCommunities = communities.filter(c => c.trending);

  return (
    <div className="min-h-screen bg-background/50 text-foreground font-sans selection:bg-accent/20">
      <Header />

      <main className="max-w-[1440px] mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        {/* Main Content Area: Intelligence Hubs */}
        <div className="flex-1">
          <header className="mb-12">
            <div className="flex justify-between flex-wrap gap-4 items-start mb-4">
              <div>
                <p className="font-sans text-xs text-accent font-semibold tracking-widest uppercase mb-2">Network Expansion</p>
                <h1 className="font-display text-4xl md:text-5xl text-foreground font-light tracking-tight leading-tight">Intelligence Hubs</h1>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 px-6 rounded-md">
                <Plus className="h-4 w-4" />
                Create Hub
              </Button>
            </div>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Connect with investigative leads, verified contributors, and specialized research communities shaping the global discourse.
            </p>
            
            {/* Search and Filters */}
            <div className="mt-8 space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search intelligence hubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 bg-card border-border shadow-sm text-sm"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-4 py-2 rounded-sm text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all border snap-start",
                      activeCategory === category
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Bento-style Hub Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filteredCommunities.map((community, index) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "bg-card p-8 flex flex-col gap-6 group hover:shadow-xl transition-all duration-300 border-l-[3px] border-t border-r border-b border-border rounded-r-lg",
                  borderColors[index % borderColors.length]
                )}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                      {community.category} Network
                    </span>
                    <h2 className="font-display text-2xl text-foreground flex items-center gap-2 leading-tight">
                        {community.name}
                        {!community.isPublic && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </h2>
                  </div>
                  <button className="bg-primary/10 text-primary whitespace-nowrap text-xs font-sans font-semibold px-4 py-2 rounded-sm hover:bg-primary hover:text-primary-foreground transition-all">
                    Join Hub
                  </button>
                </div>
                
                <div className="relative h-48 w-full overflow-hidden rounded-md bg-muted">
                  <img 
                    src={community.image} 
                    alt={community.name}
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                  />
                  <div className="absolute bottom-0 left-0 bg-primary/95 backdrop-blur-sm px-3 py-1.5 rounded-tr-md flex items-center gap-2">
                    <span className="font-sans text-[10px] text-primary-foreground font-bold uppercase tracking-wider">
                      {community.members.toLocaleString()} Active Leads
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                  <h3 className="font-sans text-xs font-bold uppercase text-muted-foreground tracking-wider border-b border-border pb-2">
                    Mission Brief
                  </h3>
                  <p className="text-sm font-medium leading-relaxed line-clamp-3 text-foreground/80">
                    {community.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-[10px] font-sans text-muted-foreground uppercase tracking-tighter font-semibold">
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {community.posts.toLocaleString()} Documents
                    </span>
                  </div>
                  <button className="group/btn flex py-1 px-1 -mr-1 items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover/btn:text-primary group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
            
            {filteredCommunities.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                    <Search className="w-8 h-8 mb-4 opacity-20" />
                    <p className="font-medium text-sm">No intelligence hubs found matching your search.</p>
                </div>
            )}
          </div>
        </div>

        {/* Sidebar: Trending & Leads */}
        <aside className="w-full lg:w-80 flex flex-col gap-8 flex-shrink-0">
          {/* Trending Discussions */}
          <section className="bg-card border border-border p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
                <TrendingUp className="w-4 h-4 text-accent" />
                <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-foreground">Trending Networks</h3>
            </div>
            
            <div className="space-y-6">
              {trendingCommunities.map(community => (
                <div key={community.id} className="group cursor-pointer">
                  <p className="text-[10px] font-sans text-accent font-bold uppercase tracking-widest mb-1">
                    {community.category}
                  </p>
                  <h4 className="font-display text-lg leading-tight group-hover:text-primary transition-colors mb-2">
                    {community.name}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-sans text-muted-foreground uppercase tracking-widest flex items-center gap-1 font-semibold">
                        <Users className="w-3 h-3" /> {community.members.toLocaleString()} Participants
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-8 py-3 border border-border text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-colors rounded-sm shadow-sm hover:shadow-md">
                View All Categories
            </button>
          </section>
          
          {/* Verified Community Leads */}
          <section className="bg-card border border-border p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-foreground">Top Contributors</h3>
            </div>
            <div className="space-y-3">
              {[
                  { name: "Marcus Vane", role: "Geo-Strategic Analyst", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8ilyk3BHMETBbDk4SxErK6KY8b8ijJ4-wgmYs4xzZ3ZVrMR4s3oq5G8CTsofACh8iRCiXYUbX-CzVkGHZ30o5O_fVj-84s9s7TFK-XYq0-EsjFEDKPYIopZvl8GE9KL87h3IN1xe_8HHPfgxJvPmZwHM8Q7Jto-8rXp5wb1hhCy4tFAerVxhS-K86grfJEQ2ifQU0vG6FlCmVouYmUMKnYIswumOipGOo9DfYyNLDAi03QWintoiGkOogYq0CZg5Ve6ROg-k-ttSh" },
                  { name: "Dr. Aris Thorne", role: "AI Ethics Lead", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpgZS1nNjI9PREZ_TAy2sBhSrtVJwgcMA1Pc6mNxp0HX76dsbNDy0AAoJUcivuWHeVV8bdccn_Js2AW9eZ83lkd1FZ2pFgcq927DlXC9gYthb5FZDSki3vUbWa-sQOUt36s3FyffdvA9i3d3tB3MO1X1x3uah742kFNvNEva0E6Q5mQZiC9YlKXvLGWoKKjxnI2hHkLQ0ME2JEti8t3gqshmaHEYYrqHd9RGjTlZZ2WrdKwaYTxFdMmU3th98OR0EOOMOHmYkI_LKE" }
              ].map((lead, i) => (
                <div key={i} className="flex items-center justify-between p-2 -mx-2 rounded-sm hover:bg-muted transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <img 
                      className="w-10 h-10 object-cover rounded-full grayscale group-hover:grayscale-0 transition-all border border-border shadow-sm" 
                      src={lead.img} 
                      alt={lead.name}
                    />
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{lead.name}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{lead.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default CommunitiesPage;
