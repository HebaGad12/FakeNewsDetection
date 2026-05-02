import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
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
      await userService.unfollow(targetId);
      toast.success("Unfollowed successfully");
      loadDashboardData();
    } catch (error) {
      toast.error("Failed to unfollow");
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
      <aside className="bg-[#F9F9F9] dark:bg-stone-950 text-[#5B5E66] dark:text-stone-300 font-sans text-sm font-medium h-screen w-64 fixed left-0 top-0 flex flex-col p-4 gap-2 z-40 border-r border-[#EAEAEA] dark:border-stone-800 hidden md:flex">
        <div className="mb-8 px-2 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0">
              {userProfile?.name?.substring(0, 2).toUpperCase() || user?.name?.substring(0, 2).toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-sm leading-tight truncate w-36">{userProfile?.name || user?.name}</h2>
              <p className="text-xs text-on-surface-variant font-normal truncate w-36">Reader Account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
               key={item.id}
               onClick={() => setActiveTab(item.id as Tab)}
               className={cn(
                 "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-transform active:scale-[0.98] w-full text-left",
                 activeTab === item.id
                   ? "bg-stone-200 dark:bg-stone-800 text-[#2D3435] dark:text-white"
                   : "text-[#5B5E66] dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
               )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <Link to="/feed" className="mt-auto text-xs font-label uppercase tracking-widest text-[#5B5E66] text-center hover:opacity-80 pb-4">
          Return to Feed
        </Link>
      </aside>

      {/* Main Content Canvas */}
      <main className="md:ml-64 p-4 md:p-8 max-w-[1200px] mb-20 md:mb-0">
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
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
                                  featuredPost.verificationStatus?.toLowerCase() === "verified" 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : featuredPost.verificationStatus?.toLowerCase() === "questionable"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                                )}>
                                  {featuredPost.verificationStatus || "Pending"}
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
                                post.verificationStatus?.toLowerCase() === "verified" 
                                  ? "text-emerald-500" 
                                  : post.verificationStatus?.toLowerCase() === "questionable"
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
                  <h2 className="font-display text-2xl font-bold">Followed & Interests</h2>
                  <span className="text-xs text-muted-foreground">{following.length} connections</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {following.map((f) => (
                    <div key={f.id} className="p-4 bg-card border border-border rounded-lg flex flex-col items-center text-center gap-3 hover:shadow-md transition-all cursor-pointer relative group"
                      onClick={() => navigate(`/profile/${f.id}`)}>
                      <div className="w-14 h-14 bg-muted flex items-center justify-center rounded-full overflow-hidden">
                        {f.avatar ? (
                          <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-muted-foreground w-6 h-6"/>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 items-center">
                        <span className="text-sm font-bold text-foreground line-clamp-1">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {f.organizationName || f.role}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {f.followersCount} followers
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollow(f.id);
                        }}
                        className="absolute inset-0 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-xs font-bold text-rose-600 rounded-lg"
                      >
                        Unfollow
                      </button>
                    </div>
                  ))}

                  {following.length === 0 && (
                    <div className="col-span-full p-12 text-center bg-card border border-border rounded-lg">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">You are not following anyone yet.</p>
                      <button 
                        onClick={() => navigate("/feed")}
                        className="mt-4 text-xs uppercase tracking-widest text-primary font-bold hover:underline"
                      >
                        Discover Journalists →
                      </button>
                    </div>
                  )}
                </div>
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
                    onClick={() => {/* Optionally add donation modal */}}
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
    </div>
  );
};

export default ReaderDashboard;