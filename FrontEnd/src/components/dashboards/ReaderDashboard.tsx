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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  { label: "Articles Read", value: "142", icon: BookOpen, change: "+12 this week" },
  { label: "Comments Made", value: "28", icon: MessageCircle, change: "+3 this week" },
  { label: "Bookmarks", value: "35", icon: Bookmark, change: "+5 this week" },
  { label: "Reading Time", value: "24h", icon: Clock, change: "+2h this week" },
];

const readingHistory = [
  {
    id: "1",
    title: "Global Climate Summit Reaches Historic Agreement",
    category: "Environment",
    readAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Tech Giants Face New Regulations",
    category: "Technology",
    readAt: "Yesterday",
  },
  {
    id: "3",
    title: "Breakthrough in Renewable Energy",
    category: "Science",
    readAt: "2 days ago",
  },
];

const ReaderDashboard = () => {
  const { user, logout } = useAuth();

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
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
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
                <stat.icon className="h-5 w-5 text-accent" />
                <span className="text-xs text-verified">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reading History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Reading History
            </h2>
            <div className="space-y-4">
              {readingHistory.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">{article.title}</p>
                    <p className="text-sm text-muted-foreground">{article.category}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {article.readAt}
                  </span>
                </Link>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              View All History
            </Button>
          </motion.div>

          {/* Bookmarked Articles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-accent" />
              Saved Articles
            </h2>
            <div className="space-y-4">
              {readingHistory.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">{article.title}</p>
                    <p className="text-sm text-muted-foreground">{article.category}</p>
                  </div>
                  <Bookmark className="h-4 w-4 text-accent" />
                </Link>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              View All Bookmarks
            </Button>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
