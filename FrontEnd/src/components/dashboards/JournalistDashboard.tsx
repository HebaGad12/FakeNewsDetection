import React, { useEffect, useState } from "react";
import {
  journalistService,
  JournalistResponse,
  JournalistPostResponse,
  JournalistFollowingResponse,
  JournalistFollowerResponse,
} from "@/services/journalistService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const JournalistDashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<JournalistResponse | null>(null);
  const [posts, setPosts] = useState<JournalistPostResponse[]>([]);
  const [following, setFollowing] = useState<JournalistFollowingResponse[]>([]);
  const [followers, setFollowers] = useState<JournalistFollowerResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTags, setNewPostTags] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profileData, postsData, followingData, followersData] = await Promise.all([
        journalistService.getMe(),
        journalistService.getMyPosts(),
        journalistService.getFollowing(),
        journalistService.getFollowers(),
      ]);
      setProfile(profileData);
      setEditName(profileData.name);
      setEditEmail(profileData.email);
      setPosts(postsData);
      setFollowing(followingData);
      setFollowers(followersData);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await journalistService.editProfile({ name: editName, email: editEmail });
      toast.success("Profile updated");
      fetchDashboardData(); // refresh
    } catch {
      toast.error("Update failed");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = newPostTags.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      const result = await journalistService.createPost({
        title: newPostTitle,
        content: newPostContent,
        tags: tagsArray,
      });
      toast.success(`Post created. Status: ${result.moderationStatus}`);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostTags("");
      fetchDashboardData(); // refresh list
    } catch {
      toast.error("Failed to create post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await journalistService.deletePost(postId);
      toast.success("Post deleted");
      fetchDashboardData();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Journalist Dashboard</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="posts">My Posts</TabsTrigger>
          <TabsTrigger value="follows">Follows</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback>{profile?.name?.charAt(0) || "J"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xl font-semibold">{profile?.name}</p>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Organization:</div><div>{profile?.organizationName}</div>
                    <div>Followers:</div><div>{profile?.followersCount}</div>
                    <div>Posts:</div><div>{profile?.postsCount}</div>
                    <div>Member since:</div><div>{profile && new Date(profile.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditProfile} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create New Post</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <Input
                    placeholder="Title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    required
                  />
                  <Textarea
                    placeholder="Content"
                    rows={6}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                  />
                  <Button type="submit">Publish Post</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Posts</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {posts.length === 0 ? (
                  <p className="text-muted-foreground">No posts yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {posts.map((post) => (
                      <li key={post.id} className="border-b pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{post.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                            <div className="flex gap-4 text-xs mt-1">
                              <span>❤️ {post.likes}</span>
                              <span>💬 {post.comments}</span>
                              <span>🚩 {post.reports}</span>
                              <span className="capitalize">Status: {post.moderationStatus}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Delete
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

        {/* Follows Tab */}
        <TabsContent value="follows">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Following ({following.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {following.length === 0 ? (
                  <p className="text-muted-foreground">Not following anyone yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {following.map((f) => (
                      <li key={f.followeeId} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.role} • {f.followersCount} followers</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => journalistService.unfollowUser(f.followeeId).then(fetchDashboardData)}
                        >
                          Unfollow
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Followers ({followers.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {followers.length === 0 ? (
                  <p className="text-muted-foreground">No followers yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {followers.map((f) => (
                      <li key={f.followerId}>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.role} • {f.followersCount} followers</p>
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

export default JournalistDashboard;