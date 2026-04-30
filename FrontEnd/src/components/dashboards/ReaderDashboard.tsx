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
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { UserOverview, FollowingUser, UserActivity, UserProfileExtended } from "@/services/types";
import donationService, {
  WalletResponse,
  WalletTransactionResponse,
} from "@/services/donationService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "following" | "wallet";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [profileData, overviewData, followingData, activityData] = await Promise.all([
        userService.getMe(),
        userService.getOverview(),
        userService.getFollowing(),
        userService.getActivity(),
      ]);
      
      setUserProfile(profileData);
      setOverview(overviewData);
      setFollowing(followingData);
      setActivity(activityData);

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

        <Link to="/" className="mt-auto text-xs font-label uppercase tracking-widest text-[#5B5E66] text-center hover:opacity-80 pb-4">
          Return Home
        </Link>
      </aside>

      {/* Main Content Canvas */}
      <main className="md:ml-64 p-4 md:p-8 max-w-[1200px] mb-20 md:mb-0">
        <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <span className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-2 block">
              Archive System v4.2
            </span>
            <h1 className="font-headline text-4xl text-on-surface font-bold">
              {activeTab === "dashboard" && "Reader Interface"}
              {activeTab === "following" && "Intelligence Network"}
              {activeTab === "wallet" && "Financial Operations"}
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="font-label text-[10px] uppercase text-outline">System Status</p>
              <p className="text-secondary font-bold flex items-center gap-1 justify-end">
                <span className="w-2 h-2 bg-secondary rounded-full"></span>
                ENCRYPTED
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
                  <section>
                    <div className="flex items-baseline justify-between mb-8">
                    <h2 className="font-display text-3xl font-bold text-foreground">Your Intelligence Feed</h2>
                    <a className="text-xs uppercase tracking-widest text-primary font-bold hover:underline" href="#">Refresh Feed</a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <article className="md:col-span-8 group relative overflow-hidden bg-card rounded-lg border border-border">
                      <div className="aspect-[16/9] overflow-hidden">
                      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Feature" src="https://images.unsplash.com/photo-1541888046425-d81bb19240f5?auto=format&fit=crop&q=80&w=800&h=450" />
                      </div>
                      <div className="p-6 relative z-10 w-full shadow-sm bg-card">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Verified</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Global Economics • 12m read</span>
                      </div>
                      <h3 className="font-display text-2xl md:text-3xl mb-4 leading-tight text-foreground group-hover:text-primary transition-colors font-bold">The Digital Silk Road: How Infrastructure Decides Information Sovereignty.</h3>
                      <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-2 text-sm">An in-depth investigation into the underwater fiber-optic networks shaping the next decade of geopolitical influence across the Pacific basin.</p>
                      <div className="flex items-center gap-4 border-t border-border pt-4">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        </div>
                        <span className="text-xs font-bold text-foreground">Elena Vostov</span>
                      </div>
                      </div>
                    </article>
                    <div className="md:col-span-4 flex flex-col gap-6">
                      <article className="bg-card border border-border rounded-lg p-5 space-y-4 hover:border-primary/50 transition-colors">
                      <span className="text-[10px] text-orange-500 uppercase tracking-widest font-bold">Climate Security</span>
                      <h4 className="font-display text-lg font-bold leading-snug">The Arctic Buffer: Thawing Tensions in the North Circle.</h4>
                      <p className="text-xs text-muted-foreground">As the ice recedes, new trade routes emerge—bringing both opportunity and naval friction.</p>
                      </article>
                      <article className="bg-card border border-border rounded-lg p-5 space-y-4 hover:border-primary/50 transition-colors">
                      <span className="text-[10px] text-blue-500 uppercase tracking-widest font-bold">Tech Ethics</span>
                      <h4 className="font-display text-lg font-bold leading-snug">Decentralized Truth: The Rise of Cryptographic Journalism.</h4>
                      <p className="text-xs text-muted-foreground">How blockchain is being used to immutable-ize field reporting in conflict zones.</p>
                      </article>
                    </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="font-display text-2xl font-bold mb-6">Recent Reading Activity</h2>
                    <div className="space-y-1">
                      {activity.length > 0 ? (
                        activity.slice(0, 5).map((act, i) => (
                          <div key={i} className="group flex items-center justify-between p-4 bg-card hover:bg-muted transition-colors border border-border rounded-lg">
                            <div className="flex gap-4 items-center flex-1 min-w-0">
                              <span className="text-[10px] text-muted-foreground w-12 flex-shrink-0">
                                {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                              </span>
                              <div className="min-w-0 pr-4">
                                <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{act.target}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{act.actionType}</p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-sm text-muted-foreground bg-card border border-border rounded-lg">No reading activity recorded yet.</p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
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
                      </div>
                    </div>

                    {overview && (
                      <div className="grid grid-cols-2 gap-3 mt-2 pt-4 border-t border-border">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-foreground">{overview.likes}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Likes</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-foreground">{overview.comments}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Comments</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-foreground">{overview.reports}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Reports</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold font-display text-emerald-500">{overview.helpfulReports}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Helpful</span>
                        </div>
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
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {following.map((f) => (
                    <div key={f.id} className="p-4 bg-card border border-border rounded-lg flex flex-col items-center text-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer relative group">
                      <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full overflow-hidden">
                        <User className="text-muted-foreground w-5 h-5"/>
                      </div>
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-xs font-bold text-foreground line-clamp-1">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {f.organizationName || (f.role === '1' ? 'Journalist' : 'User')}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollow(f.id);
                        }}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold text-destructive rounded-lg"
                      >
                        Unfollow
                      </button>
                    </div>
                  ))}

                  {following.length === 0 && (
                    <div className="col-span-full p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                      You are not following anyone yet.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "wallet" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-foreground text-background rounded-xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl font-bold">The Archive Wallet</h3>
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">Total Balance</p>
                    <p className="text-4xl font-display font-bold tracking-tight">${(myWallet?.balance ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="pt-6 border-t border-background/20">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-4">Transaction History</p>
                    <div className="space-y-3">
                      {walletTxns.length > 0 ? (
                        walletTxns.slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs">
                            <span className="truncate pr-4 opacity-80">{tx.description || tx.type}</span>
                            <span className={cn("font-bold tabular-nums whitespace-nowrap", tx.amount > 0 ? "text-emerald-400" : "text-rose-400")}>
                              {tx.amount > 0 ? '+' : ''}${(Math.abs(tx.amount)).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs opacity-60">No recent transactions</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {/* Implement Manage / Export */}}
                    className="w-full py-4 bg-background text-foreground rounded-lg font-bold text-xs uppercase tracking-[0.15em] hover:bg-background/90 transition-colors"
                  >
                    Manage Contributions
                  </button>
                </section>

                <div className="space-y-8">
                  <section className="p-6 bg-card rounded-xl border-l-4 border-primary shadow-sm">
                    <h4 className="font-display font-bold text-lg mb-2">Independent & Unbeholden</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your engagement and contributions support journalistic integrity and help maintain the quality of the Archive.
                    </p>
                  </section>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BottomNavBar - Hidden on Desktop */}
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
