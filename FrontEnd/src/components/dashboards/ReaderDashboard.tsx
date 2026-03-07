import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Heart,
  MessageCircle,
  Clock,
  Bookmark,
  TrendingUp,
  Star,
  User,
  AlertTriangle,
  Users,
  UserPlus,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { UserOverview, FollowingUser, UserActivity, UserProfileExtended } from "@/services/types";
import donationService, {
  WalletResponse,
  WalletTransactionResponse,
  DonationRecord,
} from "@/services/donationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "following" | "activity" | "wallet";

const ReaderDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("following");
  const [userProfile, setUserProfile] = useState<UserProfileExtended | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [myWallet, setMyWallet] = useState<WalletResponse | null>(null);
  const [walletTxns, setWalletTxns] = useState<WalletTransactionResponse[]>([]);
  const [sentDonations, setSentDonations] = useState<DonationRecord[]>([]);
  const [receivedDonations, setReceivedDonations] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Send donation dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendRecipientId, setSendRecipientId] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Map following names to IDs for the send dialog
  const recipientName = following.find((f) => f.id === sendRecipientId)?.name ?? "";

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

      // Load wallet data (non-blocking)
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
        // Wallet may not exist yet — that's ok
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
      loadDashboardData(); // Reload data
    } catch (error) {
      toast.error("Failed to unfollow");
    }
  };

  const handleSendDonation = async () => {
    const amount = parseFloat(sendAmount);
    if (!sendRecipientId) {
      toast.error("Please select a recipient");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    setSending(true);
    try {
      await donationService.sendDonation({
        recipientId: sendRecipientId,
        amount,
        message: sendMessage.trim() || undefined,
      });
      toast.success("Donation sent successfully!");
      setShowSendDialog(false);
      setSendRecipientId("");
      setSendAmount("");
      setSendMessage("");
      // Refresh wallet data
      try {
        const [w, txns, sent] = await Promise.all([
          donationService.getMyWallet(),
          donationService.getMyTransactions(),
          donationService.getSentDonations(),
        ]);
        setMyWallet(w);
        setWalletTxns(txns);
        setSentDonations(sent);
      } catch { /* ignore */ }
    } catch {
      toast.error("Failed to send donation");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading your dashboard..." />;
  }

  const stats = [
    { label: "Likes Given", value: overview?.likes || 0, icon: Heart, color: "text-red-500" },
    { label: "Comments Made", value: overview?.comments || 0, icon: MessageCircle, color: "text-blue-500" },
    { label: "Reports Submitted", value: overview?.reports || 0, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Followers", value: userProfile?.followersCount || 0, icon: Users, color: "text-purple-500" },
    { label: "Following", value: userProfile?.followingCount || 0, icon: UserPlus, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                  <User className="h-8 w-8 text-accent-foreground" />
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
                  Welcome back, {user?.name}!
                </h1>
                <p className="text-muted-foreground">Reader Dashboard</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Helpful Reports Badge */}
        {overview && overview.helpfulReports > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8 bg-gradient-to-r from-verified/10 to-accent/10 border border-verified/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-verified flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Community Hero
                </h3>
                <p className="text-muted-foreground">
                  {overview.helpfulReports} of your reports were marked as helpful. Thank you for
                  keeping our community safe!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {([
            { id: "following" as Tab, label: "Following", icon: <Users className="h-4 w-4" />, count: following.length },
            { id: "activity" as Tab, label: "Recent Activity", icon: <Clock className="h-4 w-4" />, count: activity.length },
            { id: "wallet" as Tab, label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-border text-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* FOLLOWING */}
          {activeTab === "following" && (
            <motion.div
              key="following"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Following ({following.length})
              </h2>
              <div className="space-y-4">
                {following.length > 0 ? (
                  following.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{person.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {person.role} {person.organizationName && `• ${person.organizationName}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {person.followersCount} followers • {person.recentPostsCount} recent posts
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfollow(person.id)}
                      >
                        Unfollow
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    You're not following anyone yet. Start exploring journalists!
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* RECENT ACTIVITY */}
          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {activity.length > 0 ? (
                  activity.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {item.actionType}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.target}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.timestamp).toLocaleDateString()} at{" "}
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent activity yet. Start engaging with content!
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* WALLET */}
          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-2xl bg-accent p-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-white/70" />
                    <p className="text-white/70 text-sm">My Wallet</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="relative z-10"
                    onClick={() => setShowSendDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Donation
                  </Button>
                </div>
                <p className="text-4xl font-bold text-white tracking-tight">
                  ${(myWallet?.balance ?? 0).toFixed(2)}
                </p>
                {myWallet && (
                  <p className="text-white/50 text-xs mt-2">
                    Last updated {new Date(myWallet.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>

              {/* Transaction History */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-4">Transaction History</h3>
                {walletTxns.length > 0 ? (
                  <div>
                    {walletTxns.map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                            isCredit ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                          )}>
                            {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.type}{tx.actorName ? ` · ${tx.actorName}` : ""} · {new Date(tx.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className={cn("font-semibold text-sm tabular-nums", isCredit ? "text-emerald-400" : "text-rose-400")}>
                            {isCredit ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">No transactions yet.</p>
                  </div>
                )}
              </div>

              {/* Sent & Received Donations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sent Donations */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                    Sent Donations ({sentDonations.length})
                  </h3>
                  {sentDonations.length > 0 ? (
                    <div className="space-y-0">
                      {sentDonations.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              To {d.recipientName}
                            </p>
                            {d.message && (
                              <p className="text-xs text-muted-foreground truncate">{d.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className="font-semibold text-sm text-rose-400 tabular-nums">
                            -${d.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-muted-foreground">
                      No donations sent yet.
                    </p>
                  )}
                </div>

                {/* Received Donations */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                    Received Donations ({receivedDonations.length})
                  </h3>
                  {receivedDonations.length > 0 ? (
                    <div className="space-y-0">
                      {receivedDonations.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              From {d.senderName}
                            </p>
                            {d.message && (
                              <p className="text-xs text-muted-foreground truncate">{d.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className="font-semibold text-sm text-emerald-400 tabular-nums">
                            +${d.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-muted-foreground">
                      No donations received yet.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <Button asChild>
            <Link to="/feed">Browse News Feed</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/communities">Join Communities</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/live">Watch Live Streams</Link>
          </Button>
        </motion.div>

        {/* Send Donation Dialog */}
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-accent" />
                Send Donation
              </DialogTitle>
              <DialogDescription>
                Send a donation to a journalist or user. Your current balance: ${(myWallet?.balance ?? 0).toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={sendRecipientId} onValueChange={setSendRecipientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person you follow" />
                  </SelectTrigger>
                  <SelectContent>
                    {following.length > 0 ? (
                      following.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} <span className="text-muted-foreground">({person.role})</span>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        You're not following anyone yet
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter amount"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="Add a message..."
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendDonation} disabled={sending}>
                {sending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
};

export default ReaderDashboard;
