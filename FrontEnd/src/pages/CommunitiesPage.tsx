import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  TrendingUp,
  MessageSquare,
  Globe,
  Lock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { communityService } from "@/services";
import type {
  CommunityDto,
} from "@/services/commnityServices";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type ViewMode = "all" | "mine";

interface CommunityCard extends CommunityDto {
  members: number;
  posts: number;
  category: string;
  image: string;
  isPublic: boolean;
}

interface CreateHubForm {
  name: string;
  description: string;
  isOpen: boolean;
  image: File | null;
}


const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400";

const borderColors = [
  "border-l-primary",
  "border-l-accent",
  "border-l-foreground",
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-emerald-500",
];

const CommunitiesPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [communities, setCommunities] = useState<CommunityCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [membershipActionId, setMembershipActionId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<CreateHubForm>({
    name: "",
    description: "",
    isOpen: true,
    image: null,
  });

  const buildCommunityCards = useCallback(async (items: CommunityDto[]) => {
    const cards = await Promise.all(
      items.map(async (community) => {
        const [membersResult, postsResult] = await Promise.allSettled([
          communityService.getMembers(community.id),
          communityService.getCommunityPosts(community.id),
        ]);

        const membersCount =
          membersResult.status === "fulfilled" ? membersResult.value.length : 0;
        const postsCount =
          postsResult.status === "fulfilled" ? postsResult.value.length : 0;

        return {
          ...community,
          members: membersCount,
          posts: postsCount,
          category: community.creatorRole || "Community",
          image: community.imageUrl
            ? communityService.getImageUrl(community.imageUrl)
            : DEFAULT_IMAGE,
          isPublic: community.isOpen,
        } as CommunityCard;
      })
    );

    return cards;
  }, []);

  const fetchCommunities = useCallback(
    async (mode: ViewMode, query?: string) => {
      setIsLoading(true);
      setLoadError("");
      try {
        let data: CommunityDto[] = [];

        if (mode === "all") {
          if (query) {
            data = await communityService.searchCommunities(query);
          } else {
            data = await communityService.getAllCommunities();
          }
        } else {
          if (!user?.id) {
            setLoadError("Sign in to view your communities.");
            setIsLoading(false);
            return;
          }
          data = await communityService.getByJournalist(user.id);
        }

        const cards = await buildCommunityCards(data);
        setCommunities(cards);
      } catch {
        setLoadError("Failed to load communities. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [buildCommunityCards, user]
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (viewMode === "all") {
      fetchCommunities(viewMode, trimmed || undefined);
    } else {
      fetchCommunities(viewMode);
    }
  }, [fetchCommunities, viewMode, searchQuery]);

  const categories = useMemo(() => {
    const unique = new Set(communities.map((community) => community.category));
    return ["All", ...Array.from(unique)];
  }, [communities]);

  const filteredCommunities = communities.filter((community) => {
    const matchesCategory =
      activeCategory === "All" ||
      (community.category && community.category.toLowerCase() === activeCategory.toLowerCase());
    const matchesSearch =
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const trendingCommunities = useMemo(() => {
    return [...communities]
      .sort((a, b) => b.members - a.members)
      .slice(0, 3);
  }, [communities]);

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      description: "",
      isOpen: true,
      image: null,
    });
    setCreateError("");
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create a community.");
      navigate("/login");
      return;
    }
    handleCreateOpenChange(true);
  };

  const handleCreateHub = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!createForm.name.trim() || !createForm.description.trim()) {
      setCreateError("Name and description are required.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    try {
      const response = await communityService.createCommunity({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        isOpen: createForm.isOpen,
        image: createForm.image,
      });

      if (!response.success) {
        setCreateError(response.message || "Unable to create community.");
        toast.error(response.message || "Unable to create community.");
        return;
      }

      toast.success(response.message || "Community created successfully.");
      handleCreateOpenChange(false);
      await fetchCommunities(viewMode, searchQuery.trim() || undefined);
    } catch {
      setCreateError("Unable to create community. Please try again.");
      toast.error("Unable to create community.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (communityId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to join a community.");
      navigate("/login");
      return;
    }

    setMembershipActionId(communityId);
    try {
      const response = await communityService.joinCommunity(communityId);
      if (!response.success) {
        toast.error(response.message || "Failed to join the community.");
        return;
      }

      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? { ...community, members: community.members + 1 }
            : community
        )
      );
      setDetailsStatus({ status: "Member" });
      if (selectedCommunity?.id === communityId) {
        setSelectedCommunity({
          ...selectedCommunity,
          members: selectedCommunity.members + 1,
        });
      }
      toast.success(response.message || "Joined successfully.");
    } catch {
      toast.error("Failed to join the community.");
    } finally {
      setMembershipActionId(null);
    }
  };

  const handleViewCommunity = (community: CommunityCard) => {
    navigate(`/communities/${community.id}`);
  };

  const handleResetFilters = () => {
    setActiveCategory("All");
    setSearchQuery("");
    setViewMode("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background/50 text-foreground font-sans selection:bg-accent/20">
      <Header />

      <main className="max-w-[1440px] mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <header className="mb-12">
            <div className="flex justify-between flex-wrap gap-4 items-start mb-4">
              <div>
                <p className="font-sans text-xs text-accent font-semibold tracking-widest uppercase mb-2">
                  Network Expansion
                </p>
                <h1 className="font-display text-4xl md:text-5xl text-foreground font-light tracking-tight leading-tight">
                  Intelligence Hubs
                </h1>
              </div>
              <Button
                type="button"
                onClick={handleCreateClick}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 px-6 rounded-md"
              >
                <Plus className="h-4 w-4" />
                Create Hub
              </Button>
            </div>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Connect with investigative leads, verified contributors, and specialized research communities shaping the global discourse.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={viewMode === "all" ? "default" : "outline"}
                  onClick={() => setViewMode("all")}
                >
                  All Hubs
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "mine" ? "default" : "outline"}
                  onClick={() => setViewMode("mine")}
                >
                  My Hubs
                </Button>
              </div>

              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search intelligence hubs..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {isLoading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                <Search className="w-8 h-8 mb-4 opacity-20" />
                <p className="font-medium text-sm">Loading communities...</p>
              </div>
            )}

            {!isLoading && loadError && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                <Search className="w-8 h-8 mb-4 opacity-20" />
                <p className="font-medium text-sm">{loadError}</p>
              </div>
            )}

            {!isLoading && !loadError &&
              filteredCommunities.map((community, index) => (
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
                    {/* <button
                      type="button"
                      onClick={() => handleJoin(community.id)}
                      disabled={!community.isPublic || membershipActionId === community.id}
                      className={cn(
                        "bg-primary/10 text-primary whitespace-nowrap text-xs font-sans font-semibold px-4 py-2 rounded-sm transition-all",
                        community.isPublic
                          ? "hover:bg-primary hover:text-primary-foreground"
                          : "cursor-not-allowed opacity-60"
                      )}
                    >
                      {membershipActionId === community.id
                        ? "Joining..."
                        : community.isPublic
                        ? "Join Hub"
                        : "Closed"}
                    </button> */}
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
                    <button
                      type="button"
                      onClick={() => handleViewCommunity(community)}
                      className="group/btn flex py-1 px-1 -mr-1 items-center justify-center"
                    >
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover/btn:text-primary group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}

            {!isLoading && !loadError && filteredCommunities.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                <Search className="w-8 h-8 mb-4 opacity-20" />
                <p className="font-medium text-sm">No intelligence hubs found matching your search.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="w-full lg:w-80 flex flex-col gap-8 flex-shrink-0">
          <section className="bg-card border border-border p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-foreground">
                Trending Networks
              </h3>
            </div>

            <div className="space-y-6">
              {trendingCommunities.map((community) => (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => handleViewCommunity(community)}
                  className="group cursor-pointer text-left"
                >
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
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full mt-8 py-3 border border-border text-xs font-sans font-semibold uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-colors rounded-sm shadow-sm hover:shadow-md"
            >
              View All Categories
            </button>
          </section>

          <section className="bg-card border border-border p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-foreground">
                Top Contributors
              </h3>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Contributor data is not available yet.
              </p>
            </div>
          </section>
        </aside>
      </main>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a new community</DialogTitle>
            <DialogDescription>
              Provide a name, short description, and visibility for your new hub.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHub} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="community-name">Community name</Label>
              <Input
                id="community-name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Investigative Collective"
                disabled={createLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="community-description">Description</Label>
              <Textarea
                id="community-description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="What is this community about?"
                disabled={createLoading}
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="community-image">Cover image (optional)</Label>
              <Input
                id="community-image"
                type="file"
                accept="image/*"
                disabled={createLoading}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    image: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </div>
            {/* <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Open community</p>
                <p className="text-xs text-muted-foreground">
                  Allow anyone to join without approval.
                </p>
              </div>
              <Switch
                checked={createForm.isOpen}
                onCheckedChange={(checked) =>
                  setCreateForm((prev) => ({ ...prev, isOpen: checked }))
                }
              />
            </div> */}
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateOpenChange(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Hub"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      <Footer />
    </div>
  );
};

export default CommunitiesPage;
