import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services";
import { UserOverview, FollowingUser, UserActivity, UserProfileExtended } from "@/services/types";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

const ReaderDashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileExtended | null>(null);
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Following List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Following ({following.length})
            </h2>
            <div className="space-y-4">
              {following.length > 0 ? (
                following.slice(0, 5).map((person) => (
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
            {following.length > 5 && (
              <Button variant="ghost" className="w-full mt-4">
                View All Following
              </Button>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {activity.length > 0 ? (
                activity.slice(0, 5).map((item, index) => (
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
            {activity.length > 5 && (
              <Button variant="ghost" className="w-full mt-4">
                View All Activity
              </Button>
            )}
          </motion.div>
        </div>

        {/* Helpful Reports Badge */}
        {overview && overview.helpfulReports > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 bg-gradient-to-r from-verified/10 to-accent/10 border border-verified/20 rounded-xl p-6"
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
      </main>

      <Footer />
    </div>
  );
};

export default ReaderDashboard;
