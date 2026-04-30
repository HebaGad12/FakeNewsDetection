const fs = require('fs');
const content = import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { UserOverview, FollowingUser, UserActivity, UserProfileExtended } from "@/services/types";
import donationService, {
  WalletResponse,
  WalletTransactionResponse,
  DonationRecord,
} from "@/services/donationService";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

const ReaderDashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileExtended | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);
  const [walletTxns, setWalletTxns] = useState<WalletTransactionResponse[]>([]);
  const [sentDonations, setSentDonations] = useState<DonationRecord[]>([]);
  const [receivedDonations, setReceivedDonations] = useState<DonationRecord[]>([]);
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
        const [w, txns, sent, received] = await Promise.all([
          donationService.getMyWallet(),
          donationService.getMyTransactions(),
          donationService.getSentDonations(),
          donationService.getReceivedDonations(),
        ]);
        setMyWallet(w);
        setWalletTxns(txns);
        setSentDonations(sent);
        setReceivedDonations(received);
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

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading your dashboard..." />;
  }

  const totalContribution = sentDonations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="bg-surface text-on-surface selection:bg-secondary-container font-body min-h-screen">
      <aside className="hidden md:flex flex-col p-4 gap-2 bg-[#F9F9F9] dark:bg-stone-950 text-[#5B5E66] dark:text-stone-300 font-sans text-sm font-medium h-screen w-64 fixed left-0 top-0 z-40 bg-stone-100 dark:bg-stone-900 shadow-sm border-r border-[#e2e8f0] dark:border-stone-800">
        <div className="mb-8 px-2">
          <h1 className="font-headline text-2xl font-bold italic text-on-surface tracking-tight">Veritas Archive</h1>
          <div className="mt-4 flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="User Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-outline mt-2 ml-2">person</span>
              )}
            </div>
            <div>
              <p className="font-bold text-on-surface leading-tight text-sm">{user?.name || "Reader"}</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Verified Reader</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 bg-stone-200 dark:bg-stone-800 text-[#2D3435] dark:text-white rounded-sm active:scale-[0.98] transition-transform">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            Dashboard
          </Link>
          <Link to="/feed" className="flex items-center gap-3 px-3 py-2 text-[#5B5E66] dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
            <span className="material-symbols-outlined">article</span>
            News Feed
          </Link>
          <Link to="/fact-checks" className="flex items-center gap-3 px-3 py-2 text-[#5B5E66] dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
            <span className="material-symbols-outlined">verified_user</span>
            Fact Check
          </Link>
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 text-[#5B5E66] dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </nav>
      </aside>

      <main className="md:ml-64 min-h-screen">
        <header className="bg-[#F9F9F9]/80 backdrop-blur-md flex justify-between items-center px-6 py-4 sticky top-0 z-30 w-full shadow-sm">
          <div className="flex items-center gap-8">
            <span className="font-headline text-lg tracking-tight text-[#2D3435]">Reader Dashboard</span>
            <nav className="hidden lg:flex gap-6">
              <Link to="/feed" className="text-[#2D3435] border-b-2 border-[#5B5E66] pb-1 font-headline text-md">Newsroom</Link>
              <Link to="/community" className="text-[#5B5E66]/70 hover:text-[#2D3435] font-headline text-md transition-colors">Community</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input
                type="text"
                placeholder="Search archives..."
                className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none focus:ring-0 focus:border-b-2 focus:border-primary text-sm w-64 transition-all"
              />
            </div>
            <button className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/profile" className="p-2 hover:bg-stone-100 rounded-full transition-colors inline-block">
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
          </div>
        </header>

        <div className="max-w-[1200px] mx-auto p-6 md:p-10 space-y-12">
          <section>
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-headline text-3xl font-bold text-on-surface">Your Intelligence Feed</h2>
              <button onClick={loadDashboardData} className="font-label text-xs uppercase tracking-widest text-primary font-bold hover:underline">
                Refresh Feed
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <article className="md:col-span-8 group relative overflow-hidden bg-surface-container-lowest">
                <div className="aspect-[16/9] overflow-hidden bg-surface-container-low">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCApqEvU-FNkkTlD_UI_f1i5zg47WYbew9hMS2ygmOJo6bOziU6dvOCXd-HLdYFCpjkV0wUrEmPqFm_VRiaV9yBmeFpfCokO1UC36PaPpNcFfpqRwO9N_6x2ByUJYoxBTqKzEdzOghHHoBBOkeQPm9RLqWeieaxyHDIjq2A4AA4j-r1tUYVrMwMpnr9vN9EUBntFU7b_1F8S6Q_TLeKB3ex_8yBHKaw8IMEu5V6pMNz18s8E9kXZQRSVPOD0BqaCyo07ZxXXs3Hh7RW"
                    alt="Featured"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-8 -mt-16 relative z-10 bg-surface-container-lowest w-[90%] shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Verified
                    </span>
                    <span className="font-label text-[10px] text-outline-variant uppercase tracking-widest">
                      Global Economics &bull; 12m read
                    </span>
                  </div>
                  <h3 className="font-headline text-4xl mb-4 leading-tight text-on-surface group-hover:text-primary transition-colors">
                    The Digital Silk Road: How Infrastructure Decides Information Sovereignty.
                  </h3>
                  <p className="font-body text-on-surface-variant leading-relaxed mb-6 line-clamp-2">
                    An in-depth investigation into the underwater fiber-optic networks shaping the next decade of geopolitical influence across the Pacific basin.
                  </p>
                  <div className="flex items-center gap-4 border-t border-surface-container-high pt-6">
                    <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
                      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAkgi-EwQgT0NE-QLQ8rcDjHlFxdO4tn_7jsRdjU__uszoDeXtgUQJCeoqqMokmoZbdCC_kfqTWN_e0Lgi4cHiSnCsyOvu5iQZF396apUECBnfdVQ7z7ffq_g79Rq-gx7kvDTFOvA-KVWOZ8ldlSKqep5gLWAvQQ7v5oep76T62NeYr3bQijrMISimdIWmaOp-kQF1gMG4OVsQE4wzgtfY5O5YB0wkfl9qw_eosHGOXzEEk2Bptf_yIyg3Yf1U43MwoJkt0MmbSFsW" alt="Author" />
                    </div>
                    <span className="font-label text-xs font-bold text-on-surface">Elena Vostov</span>
                  </div>
                </div>
              </article>

              <div className="md:col-span-4 flex flex-col gap-6">
                <article className="bg-surface-container-low p-6 space-y-4 hover:bg-surface-container transition-colors">
                  <span className="font-label text-[10px] text-secondary uppercase tracking-widest font-bold">Climate Security</span>
                  <h4 className="font-headline text-xl leading-snug">The Arctic Buffer: Thawing Tensions in the North Circle.</h4>
                  <p className="font-body text-sm text-on-surface-variant">As the ice recedes, new trade routes emerge&mdash;bringing both opportunity and naval friction.</p>
                </article>
                <article className="bg-surface-container-low p-6 space-y-4 hover:bg-surface-container transition-colors">
                  <span className="font-label text-[10px] text-tertiary-dim uppercase tracking-widest font-bold">Tech Ethics</span>
                  <h4 className="font-headline text-xl leading-snug">Decentralized Truth: The Rise of Cryptographic Journalism.</h4>
                  <p className="font-body text-sm text-on-surface-variant">How blockchain is being used to immutable-ize field reporting in conflict zones.</p>
                </article>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12">
              <section>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="font-headline text-2xl font-bold">Followed Journalists</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {following.slice(0, 3).map((f) => (
                    <div key={f.id} className="p-4 bg-surface-container-lowest flex flex-col items-center text-center gap-3 hover:bg-stone-50 transition-colors">
                      <div className="w-12 h-12 overflow-hidden rounded-full bg-surface-container-highest flex items-center justify-center">
                        {f.profileImage ? (
                           <img src={f.profileImage} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                           <span className="material-symbols-outlined text-primary">person</span>
                        )}
                      </div>
                      <span className="font-label text-xs font-bold truncate w-full">{f.name}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-surface-container-lowest flex flex-col items-center text-center gap-3 hover:bg-stone-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-surface-container-highest flex items-center justify-center rounded-full">
                      <span className="material-symbols-outlined text-primary">add</span>
                    </div>
                    <span className="font-label text-xs font-bold text-outline">Manage</span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-headline text-2xl font-bold mb-6">Recent Activity</h2>
                <div className="space-y-1">
                  {activity.length > 0 ? (
                    activity.slice(0, 5).map((act, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 bg-surface hover:bg-surface-container-low transition-colors border-l-2 border-transparent hover:border-primary">
                        <div className="flex gap-4 items-center">
                          <span className="font-label text-[10px] text-outline w-12 truncate uppercase text-right">
                            {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                          </span>
                          <div>
                            <p className="font-body text-sm font-bold group-hover:text-primary transition-colors truncate max-w-[250px] md:max-w-md">{act.target}</p>
                            <p className="font-label text-[10px] text-outline-variant uppercase">{act.actionType}</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_forward_ios</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground py-4 text-sm">No recent activity yet.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <section className="bg-[#2D3435] text-white p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-2xl italic">The Archive Wallet</h3>
                  <span className="material-symbols-outlined text-secondary-container">account_balance_wallet</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-outline-variant">Total Contribution</p>
                  <p className="text-4xl font-headline font-bold">&#36;{totalContribution.toFixed(2)}</p>
                </div>
                <div className="pt-6 border-t border-stone-700">
                  <p className="text-[10px] uppercase tracking-widest text-outline-variant mb-4">Contribution History</p>
                  <div className="space-y-3">
                    {sentDonations.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex justify-between items-center text-xs gap-4">
                        <span className="truncate flex-1">To: {d.recipientName || d.recipientId}</span>
                        <span className="font-bold">&#36;{d.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {sentDonations.length === 0 && (
                      <p className="text-xs text-outline-variant">No contributions yet.</p>
                    )}
                  </div>
                </div>
                <button className="w-full py-4 bg-secondary-container text-on-secondary-container font-bold text-xs uppercase tracking-[0.15em] hover:bg-secondary-fixed transition-colors">
                  Manage Contributions
                </button>
              </section>

              <section className="p-6 bg-surface-container-low border-l-4 border-primary">
                <h4 className="font-headline text-lg italic mb-2">Independent & Unbeholden</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Your contributions help fund investigative reports. You are directly supporting journalistic integrity.
                </p>
              </section>
            </div>
          </div>
        </div>

        <footer className="mt-20 px-6 py-12 bg-surface-container-low text-center">
          <p className="font-headline text-xl text-on-surface italic mb-4">Veritas Archive</p>
          <p className="font-label text-[10px] text-outline-variant uppercase tracking-[0.3em]">Institutional Integrity &bull; Est. 1982 &bull; Digital Repository</p>
        </footer>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center pt-2 pb-6 px-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl z-50 rounded-t-xl shadow-[0px_-4px_20px_0px_rgba(0,0,0,0.05)] border-t border-stone-200/20">
        <Link to="/feed" className="flex flex-col items-center justify-center text-[#2D3435] dark:text-white font-bold transition-transform active:scale-95">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>newspaper</span>
          <span className="font-sans text-[10px] uppercase tracking-widest">Feed</span>
        </Link>
        <Link to="/live" className="flex flex-col items-center justify-center text-[#5B5E66]/60 dark:text-stone-500 transition-transform active:scale-95">
          <span className="material-symbols-outlined">sensors</span>
          <span className="font-sans text-[10px] uppercase tracking-widest">Live</span>
        </Link>
        <Link to="/fact-checks" className="flex flex-col items-center justify-center text-[#5B5E66]/60 dark:text-stone-500 transition-transform active:scale-95">
          <span className="material-symbols-outlined">verified</span>
          <span className="font-sans text-[10px] uppercase tracking-widest">Fact-Check</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center justify-center text-[#5B5E66]/60 dark:text-stone-500 transition-transform active:scale-95">
          <span className="material-symbols-outlined">person</span>
          <span className="font-sans text-[10px] uppercase tracking-widest">Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default ReaderDashboard;
;
fs.writeFileSync('FrontEnd/src/components/dashboards/ReaderDashboard.tsx', content, 'utf8');
