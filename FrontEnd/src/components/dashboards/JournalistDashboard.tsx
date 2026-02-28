import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  TrendingUp,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  BarChart3,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Total Articles", value: "47", icon: FileText, change: "+3 this month" },
  { label: "Total Views", value: "125.4K", icon: Eye, change: "+15% vs last month" },
  { label: "Engagement Rate", value: "8.2%", icon: TrendingUp, change: "+2.1%" },
  { label: "Revenue", value: "$2,450", icon: DollarSign, change: "+$350 this month" },
];

const articles = [
  {
    id: "1",
    title: "Global Climate Summit Reaches Historic Agreement",
    status: "published",
    views: 45200,
    publishedAt: "2 hours ago",
    credibilityScore: 98,
  },
  {
    id: "2",
    title: "Breakthrough in Renewable Energy Storage Technology",
    status: "published",
    views: 31500,
    publishedAt: "5 hours ago",
    credibilityScore: 97,
  },
  {
    id: "3",
    title: "New Environmental Policy Draft",
    status: "pending",
    views: 0,
    publishedAt: "Pending approval",
    credibilityScore: null,
  },
  {
    id: "4",
    title: "Interview with Climate Scientists",
    status: "draft",
    views: 0,
    publishedAt: "Draft",
    credibilityScore: null,
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "published":
      return <CheckCircle className="h-4 w-4 text-verified" />;
    case "pending":
      return <Clock className="h-4 w-4 text-questionable" />;
    case "draft":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const JournalistDashboard = () => {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<"all" | "published" | "pending" | "draft">("all");

  const filteredArticles = articles.filter(
    (article) => filter === "all" || article.status === filter
  );

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
          <div className="flex items-center justify-between flex-wrap gap-4">
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
                  Welcome, {user?.name}!
                </h1>
                <p className="text-muted-foreground">
                  Journalist Dashboard • {user?.organization}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/create-article">
                  <Plus className="h-4 w-4 mr-2" />
                  New Article
                </Link>
              </Button>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
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
                <stat.icon className="h-5 w-5 text-accent" />
                <span className="text-xs text-verified">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Articles Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Your Articles
            </h2>
            <div className="flex gap-2">
              {(["all", "published", "pending", "draft"] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {getStatusIcon(article.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{article.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{article.publishedAt}</span>
                      {article.views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {article.views.toLocaleString()}
                        </span>
                      )}
                      {article.credibilityScore && (
                        <span className="text-verified">
                          {article.credibilityScore}% credibility
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/edit-article/${article.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Analytics Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Analytics Overview
          </h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Analytics visualization coming soon...</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default JournalistDashboard;
