import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Eye,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building2,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const stats = [
  { label: "Team Members", value: "12", icon: Users, change: "+2 this month" },
  { label: "Total Articles", value: "156", icon: FileText, change: "+18 this month" },
  { label: "Total Views", value: "1.2M", icon: Eye, change: "+25% vs last month" },
  { label: "Revenue", value: "$15,240", icon: DollarSign, change: "+$2,100 this month" },
];

const pendingDrafts = [
  {
    id: "1",
    title: "Investigation: Corporate Environmental Claims Under Scrutiny",
    author: "Sarah Mitchell",
    submittedAt: "2 hours ago",
    credibilityScore: 94,
  },
  {
    id: "2",
    title: "New Study on Urban Air Quality",
    author: "James Chen",
    submittedAt: "5 hours ago",
    credibilityScore: 91,
  },
  {
    id: "3",
    title: "Interview with Climate Policy Expert",
    author: "Emily Watson",
    submittedAt: "Yesterday",
    credibilityScore: 88,
  },
];

const teamMembers = [
  {
    id: "1",
    name: "Sarah Mitchell",
    role: "Senior Journalist",
    articles: 47,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50",
  },
  {
    id: "2",
    name: "James Chen",
    role: "Tech Correspondent",
    articles: 32,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50",
  },
  {
    id: "3",
    name: "Emily Watson",
    role: "Science Editor",
    articles: 28,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50",
  },
];

const OrganizationDashboard = () => {
  const { user, logout } = useAuth();

  const handleApprove = (id: string) => {
    toast.success("Article approved and published!");
  };

  const handleReject = (id: string) => {
    toast.error("Article rejected");
  };

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
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Building2 className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
                  {user?.organization}
                </h1>
                <p className="text-muted-foreground">Organization Dashboard</p>
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
          {/* Pending Approvals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-questionable" />
              Pending Approvals ({pendingDrafts.length})
            </h2>
            <div className="space-y-4">
              {pendingDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-4 rounded-lg bg-muted/50"
                >
                  <p className="font-medium text-foreground mb-1 line-clamp-2">
                    {draft.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span>{draft.author}</span>
                      <span className="mx-2">•</span>
                      <span>{draft.submittedAt}</span>
                      <span className="mx-2">•</span>
                      <span className="text-verified">{draft.credibilityScore}% AI Score</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(draft.id)}
                        className="bg-verified hover:bg-verified/90"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(draft.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team Members */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Team Members
            </h2>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{member.articles}</p>
                    <p className="text-xs text-muted-foreground">articles</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Team
            </Button>
          </motion.div>
        </div>

        {/* Performance Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Organization Performance
          </h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Performance analytics visualization coming soon...</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default OrganizationDashboard;
