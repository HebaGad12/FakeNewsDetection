import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, 
  Archive,
  LayoutDashboard,
  Users,
  Wallet,
  CheckCircle2,
  User,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  TrendingUp,
  Send,
  Home,
  LogOut,
  Shield,
  ChevronRight,
  ExternalLink,
  UserMinus,
  DollarSign,
  AlertCircle,
  Check,
  X,
  ChevronDown,
 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { UserOverview, FollowingUser, UserActivity, UserProfileExtended } from "@/services/types";
import donationService, {
  DonationRecord,
  WalletResponse,
  WalletTransactionResponse,
} from "@/services/donationService";
import { postsService, Post } from "@/services/postsService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Tab = "dashboard" | "following" | "wallet";

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
};

const ReaderDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileExtended | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);
  const [walletTxns, setWalletTxns] = useState<WalletTransactionResponse[]>([]);
  const [sentDonations, setSentDonations] = useState<DonationRecord[]>([]);
  const [receivedDonations, setReceivedDonations] = useState<DonationRecord[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh following list when returning from a public profile page
  useEffect(() => {
    const state = location.state as { refreshFollowing?: boolean } | null;
    if (state?.refreshFollowing) {
      loadDashboardData();
      // Clear the state so it doesn't re-trigger on tab changes
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [profileData, overviewData, followingData, activityData, allPosts] = await Promise.all([
        userService.getMe(),
        userService.getOverview(),
        userService.getFollowing(),
        userService.getActivity(),
        postsService.getAllPosts(),
      ]);
      
      setUserProfile(profileData);
      setOverview(overviewData);
      setFollowing(followingData);
      setActivity(activityData);
      
      // Get latest 3 posts for the feed
      const sortedPosts = [...allPosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentPosts(sortedPosts.slice(0, 3));

      try {
        const [w, txns] = await Promise.all([
          donationService.getMyWallet(),
          donationService.getMyTransactions(),
        ]);
        setMyWallet(w);
        setWalletTxns(txns);
      } catch {
        // Wallet may not exist yet
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (targetId: string) => {
    try {
      setFollowingJournos((prev) => prev.filter((j) => j.id !== targetId));
      await userService.unfollow(targetId);
      toast.success("Unfollowed successfully");
    } catch (error) {
      toast.error("Failed to unfollow");
      loadDashboardData();
    }
  };

  // ── Donation Modal State ──────────────────────────────────────────────────
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [donationStep, setDonationStep]           = useState<"select" | "amount" | "confirm" | "success">("select");
  const [selectedJournalist, setSelectedJournalist] = useState<FollowingUser | null>(null);
  const [donationAmount, setDonationAmount]         = useState("");
  const [donationMessage, setDonationMessage]       = useState("");
  const [donationLoading, setDonationLoading]       = useState(false);
  const [donationError, setDonationError]           = useState("");

  const journalistsFollowed = following.filter((f) => f.role === "Journalist");

  const openDonationModal = () => {
    setDonationStep("select");
    setSelectedJournalist(null);
    setDonationAmount("");
    setDonationMessage("");
    setDonationError("");
    setDonationModalOpen(true);
  };

  const closeDonationModal = () => {
    setDonationModalOpen(false);
    // slight delay so animation is smooth before resetting
    setTimeout(() => {
      setDonationStep("select");
      setSelectedJournalist(null);
      setDonationAmount("");
      setDonationMessage("");
      setDonationError("");
    }, 300);
  };

  const handleDonationSubmit = async () => {
    const amount = parseFloat(donationAmount);
    if (!selectedJournalist) return;
    if (isNaN(amount) || amount <= 0) {
      setDonationError("Please enter a valid amount greater than 0.");
      return;
    }
    if (myWallet && amount > myWallet.balance) {
      setDonationError(`Insufficient balance. Your balance: ${formatCurrency(myWallet.balance)}`);
      return;
    }

    setDonationLoading(true);
    setDonationError("");
    try {
      await donationService.sendDonation({
        recipientId: selectedJournalist.id,
        amount,
        message: donationMessage || undefined,
      });

      // Refresh wallet so balance is up to date
      try {
        const [w, txns, sent] = await Promise.all([
          donationService.getMyWallet(),
          donationService.getMyTransactions(),
          donationService.getSentDonations(),
        ]);
        setMyWallet(w);
        setWalletTxns(txns);
        setSentDonations(sent);
      } catch { /* silent */ }

      setDonationStep("success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to send donation. Please try again.";
      setDonationError(msg);
    } finally {
      setDonationLoading(false);
    }
  };

  // Get a random/featured post for the hero section
  const featuredPost = recentPosts[0];
  const sidePosts = recentPosts.slice(1, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5B5E66] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#5B5E66] text-sm font-label font-bold uppercase tracking-widest">Initializing Archive...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "following", icon: Users, label: "Following" },
    { id: "wallet", icon: Wallet, label: "Archive Wallet" },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen font-body">
      {/* SideNavBar */}
      <aside className={cn("h-screen w-64 fixed left-0 top-0 flex flex-col z-40 bg-[#0f172a] border-r border-white/5 shadow-2xl hidden md:flex transition-transform duration-300", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>

        {/* ── Brand ── */}
        <div className="px-5 pt-7 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight tracking-wide">Reader Portal</h1>
              <p className="text-blue-400/60 text-[10px] font-mono uppercase tracking-widest mt-0.5">The Veritas Archive</p>
            </div>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-bold uppercase">
                {userProfile?.name?.substring(0, 2).toUpperCase() || user?.name?.substring(0, 2).toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{userProfile?.name || user?.name}</p>
              <p className="text-white/35 text-[10px] font-mono">Reader Account</p>
            </div>
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4">
          <p className="text-white/20 text-[9px] font-mono uppercase tracking-[0.18em] px-2 mb-2">Navigation</p>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-white/45 hover:text-white hover:bg-white/6"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-300 rounded-r-full" />
                )}
                <item.icon className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-white/35 group-hover:text-white/70"
                )} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-200/50 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* ── Footer Buttons ── */}
        <div className="px-3 pb-5 pt-3 border-t border-white/5 flex flex-col gap-2">
          {/* Go to Home */}
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/30"
          >
            <Home className="h-4 w-4 flex-shrink-0 transition-transform group-hover:-translate-y-0.5 duration-150" />
            <span className="flex-1 text-left">Go to Home</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Logout */}
          <button
            onClick={() => { if (typeof window !== "undefined") navigate("/login"); }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all duration-150 bg-white/4 text-white/40 hover:bg-red-600/80 hover:text-white border border-white/5 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-900/20"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className={cn("transition-all duration-300 p-4 md:p-8 max-w-[1200px] mb-20 md:mb-0", isSidebarOpen ? "md:ml-64" : "ml-0")}>
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div className="flex items-start gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 flex-shrink-0 -ml-2 mt-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors hidden md:inline-flex">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-2 block">
                {activeTab === "dashboard" && "Reader Interface"}
                {activeTab === "following" && "Intelligence Network"}
                {activeTab === "wallet" && "Financial Operations"}
              </span>
              <h1 className="font-headline text-4xl text-on-surface font-bold">
                {activeTab === "dashboard" && "Your Archive"}
                {activeTab === "following" && "Your Network"}
                {activeTab === "wallet" && "Your Treasury"}
              </h1>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="font-label text-[10px] uppercase text-outline">System Status</p>
              <p className="text-secondary font-bold flex items-center gap-1 justify-end">
                <span className="w-2 h-2 bg-secondary rounded-full"></span>
                ACTIVE
              </p>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-[400px]"
          >
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 flex flex-col gap-12">
                  {/* Featured News Section - Dynamic */}
                  <section>
                    <div className="flex items-baseline justify-between mb-8">
                      <h2 className="font-display text-3xl font-bold text-foreground">Your Intelligence Feed</h2>
                      <button 
                        onClick={() => loadDashboardData()} 
                        className="text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                      >
                        Refresh Feed
                      </button>
                    </div>
                    
                    {recentPosts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Featured Post */}
                        {featuredPost && (
                          <article className="md:col-span-8 group relative overflow-hidden bg-card rounded-lg border border-border cursor-pointer"
                            onClick={() => navigate(`/article/${featuredPost.id}`)}>
                            <div className="aspect-[16/9] overflow-hidden bg-muted">
                              {featuredPost.media && featuredPost.media[0] ? (
                                <img 
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                  src={postsService.getImageUrl(featuredPost.media[0].path)} 
                                  alt={featuredPost.title} 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <Archive className="w-12 h-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-6 relative z-10 w-full shadow-sm bg-card">
                              <div className="flex items-center gap-3 mb-4">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                                  featuredPost.verificationStatus?.toString().toLowerCase() === "verified"
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : featuredPost.verificationStatus?.toString().toLowerCase() === "questionable"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                                )}>
                                  {featuredPost.verificationStatus === 1 ? "Verified" : featuredPost.verificationStatus === 2 ? "Questionable" : featuredPost.verificationStatus === 3 ? "Fake" : featuredPost.verificationStatus || "Pending"}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                  {featuredPost.tags?.[0] || "News"} • {Math.ceil(featuredPost.content.split(/\s+/).length / 200)} min read
                                </span>
                              </div>
                              <h3 className="font-display text-2xl md:text-3xl mb-4 leading-tight text-foreground group-hover:text-primary transition-colors font-bold">
                                {featuredPost.title}
                              </h3>
                              <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-2 text-sm">
                                {featuredPost.content.substring(0, 150)}...
                              </p>
                              <div className="flex items-center gap-4 border-t border-border pt-4">
                                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                                  <User className="h-4 w-4 text-muted-foreground"/>
                                </div>
                                <span className="text-xs font-bold text-foreground">{featuredPost.authorName}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> {featuredPost.likesCount || 0}
                                </span>
                              </div>
                            </div>
                          </article>
                        )}

                        {/* Side Posts */}
                        <div className="md:col-span-4 flex flex-col gap-6">
                          {sidePosts.map((post) => (
                            <article 
                              key={post.id} 
                              className="bg-card border border-border rounded-lg p-5 space-y-3 hover:border-primary/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/article/${post.id}`)}>
                              <span className={cn(
                                "text-[10px] uppercase tracking-widest font-bold",
                                post.verificationStatus?.toString().toLowerCase() === "verified" 
                                  ? "text-emerald-500" 
                                  : post.verificationStatus?.toString().toLowerCase() === "questionable"
                                  ? "text-amber-500"
                                  : "text-rose-500"
                              )}>
                                {post.tags?.[0] || "News"}
                              </span>
                              <h4 className="font-display text-lg font-bold leading-snug line-clamp-2">{post.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">{post.content.substring(0, 80)}...</p>
                              <div className="flex items-center gap-2 pt-2">
                                <span className="text-xs text-muted-foreground">{post.authorName}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Heart className="h-3 w-3" /> {post.likesCount || 0}
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card border border-border rounded-lg">
                        <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No posts available. Explore the feed to get started.</p>
                        <button 
                          onClick={() => navigate("/feed")}
                          className="mt-4 text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                        >
                          Browse Feed →
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Recent Activity Section - Dynamic */}
                  <section>
                    <h2 className="font-display text-2xl font-bold mb-6">Recent Reading Activity</h2>
                    <div className="space-y-1">
                      {activity.length > 0 ? (
                        activity.slice(0, 5).map((act, i) => (
                          <div key={i} className="group flex items-center justify-between p-4 bg-card hover:bg-muted transition-colors border border-border rounded-lg">
                            <div className="flex gap-4 items-center flex-1 min-w-0">
                              <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0 font-mono">
                                {formatDate(act.timestamp)}
                              </span>
                              <div className="min-w-0 pr-4 flex-1">
                                <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{act.target}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                  <span>{act.actionType}</span>
                                  <span>•</span>
                                  <span>{formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}</span>
                                </p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-card border border-border rounded-lg">
                          <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No reading activity recorded yet.</p>
                          <button 
                            onClick={() => navigate("/feed")}
                            className="mt-3 text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                          >
                            Start Exploring →
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Profile Sidebar - Dynamic */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 sticky top-24">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground text-lg">{userProfile?.name || user?.name}</h3>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Reader Account</p>
                        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                      </div>
                    </div>

                    {overview && (
                      <div className="grid grid-cols-2 gap-3 mt-2 pt-4 border-t border-border">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-foreground">{overview.likes}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Heart className="h-3 w-3" /> Likes
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-foreground">{overview.comments}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> Comments
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-amber-500">{overview.reports}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Reports</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-emerald-500">{overview.helpfulReports}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Helpful</span>
                        </div>
                      </div>
                    )}

                    {/* Following Stats */}
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">Following</span>
                        <span className="text-sm font-bold text-foreground">{following.length}</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab("following")}
                        className="w-full mt-3 text-xs text-center uppercase tracking-widest text-primary font-bold hover:underline"
                      >
                        View Network →
                      </button>
                    </div>

                    {/* Wallet Quick View */}
                    {myWallet && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">Wallet Balance</span>
                          <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(myWallet.balance)}</span>
                        </div>
                        <button 
                          onClick={() => setActiveTab("wallet")}
                          className="w-full mt-3 text-xs text-center uppercase tracking-widest text-primary font-bold hover:underline"
                        >
                          Manage Funds →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "following" && (
              <section>
                <div className="flex items-baseline justify-between mb-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Following</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{following.length} connections</p>
                  </div>
                </div>

                {following.length === 0 ? (
                  <div className="p-12 text-center bg-card border border-border rounded-xl">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-1">Not following anyone yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Discover journalists and follow their work</p>
                    <button
                      onClick={() => navigate("/feed")}
                      className="text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                    >
                      Discover Journalists →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {following.map((f) => (
                      <div
                        key={f.id}
                        className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-blue-500/30 hover:shadow-md transition-all"
                      >
                        {/* Top: avatar + info */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                            {f.avatar ? (
                              <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="text-muted-foreground w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                              {f.organizationName || f.role}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Users className="h-3 w-3" /> {f.followersCount} followers
                            </p>
                          </div>
                        </div>

                        {/* Bottom: action buttons */}
                        <div className="flex gap-2 pt-1 border-t border-border">
                          {/* View journalist profile */}
                          <button
                            onClick={() => navigate(`/profiles/${f.id}`, { state: { from: "dashboard" } })}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-500/20 hover:border-blue-500 transition-all text-xs font-semibold"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Profile
                          </button>
                          {/* Unfollow */}
                          <button
                            onClick={() => handleUnfollow(f.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20 hover:border-rose-500 transition-all text-xs font-semibold"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Unfollow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "wallet" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Wallet Balance Card */}
                <div className="bg-foreground text-background rounded-xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl font-bold">The Archive Wallet</h3>
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">Total Balance</p>
                    <p className="text-4xl font-display font-bold tracking-tight">
                      {formatCurrency(myWallet?.balance ?? 0)}
                    </p>
                  </div>
                  
                  {/* Transaction History */}
                  <div className="pt-6 border-t border-background/20">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-4">Transaction History</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {walletTxns.length > 0 ? (
                        walletTxns.slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs">
                            <div className="flex-1 min-w-0">
                              <p className="truncate opacity-80">{tx.description || tx.type}</p>
                              <p className="text-[9px] opacity-50">{formatDate(tx.createdAt)}</p>
                            </div>
                            <span className={cn("font-bold tabular-nums whitespace-nowrap ml-4", tx.amount > 0 ? "text-emerald-400" : "text-rose-400")}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs opacity-60 text-center py-4">No recent transactions</p>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={openDonationModal}
                    className="w-full py-4 bg-background text-foreground rounded-lg font-bold text-xs uppercase tracking-[0.15em] hover:bg-background/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Donation
                  </button>
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                  <div className="p-6 bg-card rounded-xl border-l-4 border-primary shadow-sm">
                    <h4 className="font-display font-bold text-lg mb-2">Independent & Unbeholden</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your engagement and contributions support journalistic integrity and help maintain the quality of the Archive.
                    </p>
                  </div>

                  {/* Received Donations Summary */}
                  {receivedDonations.length > 0 && (
                    <div className="p-6 bg-card rounded-xl border border-border">
                      <h4 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-emerald-500" /> Recent Support
                      </h4>
                      <div className="space-y-2">
                        {receivedDonations.slice(0, 3).map((d) => (
                          <div key={d.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                            <div>
                              <p className="font-medium text-foreground">{d.senderName}</p>
                              {d.message && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{d.message}</p>}
                            </div>
                            <span className="text-emerald-500 font-bold">+{formatCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sent Donations Summary */}
                  {sentDonations.length > 0 && (
                    <div className="p-6 bg-card rounded-xl border border-border">
                      <h4 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                        <Send className="w-4 h-4 text-rose-500" /> Your Contributions
                      </h4>
                      <div className="space-y-2">
                        {sentDonations.slice(0, 3).map((d) => (
                          <div key={d.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                            <div>
                              <p className="font-medium text-foreground">To {d.recipientName}</p>
                              {d.message && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{d.message}</p>}
                            </div>
                            <span className="text-rose-500 font-bold">-{formatCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BottomNavBar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-2 pb-5 px-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl z-50 border-t border-stone-200/20">
        <button onClick={() => navigate("/feed")} className="flex flex-col items-center text-[#5B5E66]/60 dark:text-stone-500 font-sans text-[10px] uppercase tracking-widest gap-1">
          <Archive className="w-5 h-5" /> Feed
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "dashboard" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <LayoutDashboard className="w-5 h-5" /> Dash
        </button>
        <button onClick={() => setActiveTab("following")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "following" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <Users className="w-5 h-5" /> Network
        </button>
        <button onClick={() => setActiveTab("wallet")} className={cn("flex flex-col items-center font-sans text-[10px] uppercase tracking-widest gap-1", activeTab === "wallet" ? "text-[#2D3435] dark:text-white font-bold" : "text-[#5B5E66]/60 dark:text-stone-500")}>
          <Wallet className="w-5 h-5" /> Funds
        </button>
      </nav>
      {/* ── Send Donation Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {donationModalOpen && (
          <motion.div
            key="donation-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeDonationModal(); }}
          >
            <motion.div
              key="donation-modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* ── Modal Header ── */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                    <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">Send Donation</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      {donationStep === "select"  && "Choose a journalist"}
                      {donationStep === "amount"  && "Set amount"}
                      {donationStep === "confirm" && "Confirm donation"}
                      {donationStep === "success" && "Donation sent!"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDonationModal}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Step: Select Journalist ── */}
              {donationStep === "select" && (
                <div className="px-6 py-5">
                  {journalistsFollowed.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground mb-1">No journalists followed</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Follow a journalist to send them a donation.
                      </p>
                      <button
                        onClick={() => { closeDonationModal(); navigate("/feed"); }}
                        className="text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                      >
                        Discover Journalists →
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        Select a journalist you follow to support their work.
                      </p>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                        {journalistsFollowed.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => { setSelectedJournalist(f); setDonationStep("amount"); setDonationError(""); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group",
                              selectedJournalist?.id === f.id
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                : "border-border hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10"
                            )}
                          >
                            {/* avatar */}
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {f.avatar ? (
                                <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">
                                  {f.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{f.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                                {f.organizationName || f.role}
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Step: Amount ── */}
              {donationStep === "amount" && selectedJournalist && (
                <div className="px-6 py-5 space-y-5">
                  {/* Selected journalist preview */}
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedJournalist.avatar ? (
                        <img src={selectedJournalist.avatar} alt={selectedJournalist.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {selectedJournalist.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedJournalist.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedJournalist.role}</p>
                    </div>
                    <button
                      onClick={() => { setDonationStep("select"); setDonationError(""); }}
                      className="text-[10px] text-primary font-bold uppercase tracking-wider hover:underline flex-shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {/* Balance indicator */}
                  {myWallet && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-muted-foreground">Available balance</span>
                      <span className="font-bold font-mono text-foreground">{formatCurrency(myWallet.balance)}</span>
                    </div>
                  )}

                  {/* Quick amount chips */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Quick amounts</p>
                    <div className="grid grid-cols-4 gap-2">
                      {["5", "10", "25", "50"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setDonationAmount(q)}
                          className={cn(
                            "py-2 rounded-lg border text-xs font-bold transition-all",
                            donationAmount === q
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border hover:border-emerald-400 text-foreground"
                          )}
                        >
                          ${q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom amount input */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Custom amount</p>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={donationAmount}
                        onChange={(e) => { setDonationAmount(e.target.value); setDonationError(""); }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Optional message */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Message <span className="normal-case font-normal">(optional)</span></p>
                    <textarea
                      rows={2}
                      placeholder="Add a note to your donation..."
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition"
                    />
                  </div>

                  {donationError && (
                    <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{donationError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setDonationStep("select")}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        const amt = parseFloat(donationAmount);
                        if (isNaN(amt) || amt <= 0) { setDonationError("Enter a valid amount greater than 0."); return; }
                        if (myWallet && amt > myWallet.balance) { setDonationError(`Insufficient balance. Your balance: ${formatCurrency(myWallet.balance)}`); return; }
                        setDonationError("");
                        setDonationStep("confirm");
                      }}
                      disabled={!donationAmount}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Confirm ── */}
              {donationStep === "confirm" && selectedJournalist && (
                <div className="px-6 py-5 space-y-5">
                  {/* Summary card */}
                  <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-semibold text-foreground">{selectedJournalist.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                        {formatCurrency(parseFloat(donationAmount))}
                      </span>
                    </div>
                    {donationMessage && (
                      <div className="flex justify-between items-start text-sm gap-4">
                        <span className="text-muted-foreground flex-shrink-0">Message</span>
                        <span className="text-foreground text-right text-xs italic">{donationMessage}</span>
                      </div>
                    )}
                    {myWallet && (
                      <div className="flex justify-between items-center text-xs border-t border-border pt-3 mt-1">
                        <span className="text-muted-foreground">Balance after</span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(myWallet.balance - parseFloat(donationAmount))}
                        </span>
                      </div>
                    )}
                  </div>

                  {donationError && (
                    <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{donationError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setDonationStep("amount")}
                      disabled={donationLoading}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleDonationSubmit}
                      disabled={donationLoading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {donationLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Confirm & Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Success ── */}
              {donationStep === "success" && selectedJournalist && (
                <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
                  >
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Donation Sent!</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      You've sent <span className="font-bold text-foreground">{formatCurrency(parseFloat(donationAmount))}</span> to{" "}
                      <span className="font-bold text-foreground">{selectedJournalist.name}</span>.
                    </p>
                    {donationMessage && (
                      <p className="text-xs text-muted-foreground italic mt-2">"{donationMessage}"</p>
                    )}
                  </div>
                  <button
                    onClick={closeDonationModal}
                    className="mt-2 w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReaderDashboard;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFollowingJournos(arg0: (prev: any) => any) {
  throw new Error("Function not implemented.");
}
