import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  organizationService,
  OrgProfileResponse,
  OrgJournalistResponse,
  OrgPostResponse,
  OrgFollowerResponse,
  OrgAnalyticsResponse,
  OrgWalletResponse,
  OrgWalletTransactionResponse,
} from "@/services/organizationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const OrganizationDashboard: React.FC = () => {
  const { user } = useAuth();
  const orgUserId = user?.id; // معرف المؤسسة الحالية

  const [profile, setProfile] = useState<OrgProfileResponse | null>(null);
  const [journalists, setJournalists] = useState<OrgJournalistResponse[]>([]);
  const [posts, setPosts] = useState<OrgPostResponse[]>([]);
  const [followers, setFollowers] = useState<OrgFollowerResponse[]>([]);
  const [analytics, setAnalytics] = useState<OrgAnalyticsResponse | null>(null);
  const [wallet, setWallet] = useState<OrgWalletResponse | null>(null);
  const [transactions, setTransactions] = useState<OrgWalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newJournalist, setNewJournalist] = useState({ name: "", email: "", password: "", licenceNumber: "" });
  const [selectedPostFilter, setSelectedPostFilter] = useState<string>("");

  useEffect(() => {
    if (orgUserId) fetchAllData();
  }, [orgUserId]);

  const fetchAllData = async () => {
    if (!orgUserId) return;
    setLoading(true);
    try {
      const [
        profileData,
        journalistsData,
        postsData,
        followersData,
        analyticsData,
        walletData,
        transactionsData,
      ] = await Promise.all([
        organizationService.getMyOrganization(),
        organizationService.getJournalists(orgUserId),
        organizationService.getOrganizationPosts(orgUserId),
        organizationService.getFollowers(orgUserId),
        organizationService.getAnalytics(orgUserId),
        organizationService.getWallet(orgUserId),
        organizationService.getWalletTransactions(orgUserId),
      ]);
      setProfile(profileData);
      setJournalists(journalistsData);
      setPosts(postsData);
      setFollowers(followersData);
      setAnalytics(analyticsData);
      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddJournalist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgUserId) return;
    try {
      const result = await organizationService.addJournalist(orgUserId, newJournalist);
      toast.success(result.message);
      setNewJournalist({ name: "", email: "", password: "", licenceNumber: "" });
      const updated = await organizationService.getJournalists(orgUserId);
      setJournalists(updated);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.response?.data?.title || "Failed to add journalist");
    }
  };

  const handleToggleJournalistStatus = async (journalistId: string, currentActive: boolean) => {
    if (!orgUserId) return;
    try {
      await organizationService.setJournalistStatus(orgUserId, journalistId, !currentActive);
      toast.success(`Journalist ${!currentActive ? "activated" : "deactivated"}`);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to change status");
    }
  };

  const handleReviewPost = async (postId: string, approve: boolean, notes?: string) => {
    if (!orgUserId) return;
    try {
      const result = await organizationService.reviewPost(orgUserId, postId, approve, notes);
      toast.success(result.message);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to review post");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading organization dashboard...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Dashboard</h1>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journalists">Journalists</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardContent>
                <p><strong>Name:</strong> {profile?.name}</p>
                <p><strong>Email:</strong> {profile?.email}</p>
                <p><strong>Status:</strong> {profile?.isActive ? "Active" : "Inactive"}</p>
                <p><strong>Joined:</strong> {profile && new Date(profile.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
              <CardContent>
                <p>📊 Total posts: {analytics?.totalPosts}</p>
                <p>⏳ Pending: {analytics?.pendingPosts}</p>
                <p>✅ Approved: {analytics?.approvedPosts}</p>
                <p>❌ Rejected: {analytics?.rejectedPosts}</p>
                <p>👥 Followers: {analytics?.totalFollowers}</p>
                <p>📰 Journalists: {analytics?.journalistCount} (active: {analytics?.activeJournalistCount})</p>
                <p>❤️ Total likes: {analytics?.totalLikesReceived}</p>
                <p>💬 Comments: {analytics?.totalCommentsReceived}</p>
                <p>🚩 Reports: {analytics?.totalReportsReceived}</p>
                <p>💰 Wallet balance: {analytics?.walletBalance}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Journalists Tab */}
        <TabsContent value="journalists">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Add New Journalist</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddJournalist} className="space-y-4">
                  <Input placeholder="Name" value={newJournalist.name} onChange={e => setNewJournalist({...newJournalist, name: e.target.value})} required />
                  <Input type="email" placeholder="Email" value={newJournalist.email} onChange={e => setNewJournalist({...newJournalist, email: e.target.value})} required />
                  <Input type="password" placeholder="Password" value={newJournalist.password} onChange={e => setNewJournalist({...newJournalist, password: e.target.value})} required />
                  <Input placeholder="Licence Number" value={newJournalist.licenceNumber} onChange={e => setNewJournalist({...newJournalist, licenceNumber: e.target.value})} required />
                  <Button type="submit">Add</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Journalists List</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {journalists.length === 0 ? (
                  <p>No journalists yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {journalists.map(j => (
                      <li key={j.id} className="border-b pb-2">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{j.name}</p>
                            <p className="text-sm text-muted-foreground">{j.email}</p>
                            <p className="text-xs">Licence: {j.licenceNumber}</p>
                            <p className="text-xs">Status: {j.isActive ? "Active" : "Inactive"} • Registration: {j.registrationStatus}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleToggleJournalistStatus(j.id, j.isActive)}>
                            {j.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <div className="mb-4">
            <label className="mr-2">Filter by status:</label>
            <select value={selectedPostFilter} onChange={e => setSelectedPostFilter(e.target.value)} className="border rounded p-1">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="removed">Rejected</option>
            </select>
          </div>
          <div className="grid gap-4">
            {posts
              .filter(p => !selectedPostFilter || p.moderationStatus.toLowerCase() === selectedPostFilter)
              .map(post => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">by {post.authorName} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3">{post.content}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>❤️ {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span className={`capitalize ${post.moderationStatus === 'Approved' ? 'text-green-600' : post.moderationStatus === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                        Status: {post.moderationStatus}
                      </span>
                    </div>
                    {post.moderationStatus === 'Pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => handleReviewPost(post.id, true)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          const notes = prompt("Reason for rejection (optional):");
                          handleReviewPost(post.id, false, notes || undefined);
                        }}>Reject</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers">
          <Card>
            <CardHeader><CardTitle>Followers ({followers.length})</CardTitle></CardHeader>
            <CardContent>
              {followers.length === 0 ? (
                <p>No followers yet.</p>
              ) : (
                <ul className="space-y-2">
                  {followers.map(f => (
                    <li key={f.userId} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{f.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.role} • followed {formatDistanceToNow(new Date(f.followedAt), { addSuffix: true })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Wallet Balance</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{wallet?.balance.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Last updated: {wallet && new Date(wallet.updatedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p>No transactions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {transactions.map(t => (
                      <li key={t.id} className="border-b pb-2">
                        <div className="flex justify-between">
                          <span className={t.amount > 0 ? "text-green-600" : "text-red-600"}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
                          <span className="text-sm">{t.type}</span>
                        </div>
                        <p className="text-xs">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationDashboard;