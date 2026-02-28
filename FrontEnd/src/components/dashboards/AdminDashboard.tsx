import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  UserCheck,
  Building2,
  TrendingUp,
  Eye,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Total Users", value: "45,230", icon: Users, change: "+1,230 this month" },
  { label: "Total Articles", value: "12,450", icon: FileText, change: "+450 this month" },
  { label: "Pending Reports", value: "23", icon: AlertTriangle, change: "-5 today" },
  { label: "Active Organizations", value: "156", icon: Building2, change: "+8 this month" },
];

const pendingReports = [
  {
    id: "1",
    type: "article",
    title: "Questionable Health Claims Article",
    reportedBy: "Multiple users",
    reason: "Potential misinformation",
    reportedAt: "1 hour ago",
  },
  {
    id: "2",
    type: "comment",
    title: "Hate speech in comments",
    reportedBy: "Community moderator",
    reason: "Hate speech",
    reportedAt: "2 hours ago",
  },
  {
    id: "3",
    type: "stream",
    title: "Live stream policy violation",
    reportedBy: "Auto-detection",
    reason: "Content policy violation",
    reportedAt: "3 hours ago",
  },
];

const pendingRegistrations = [
  {
    id: "1",
    name: "Alex Thompson",
    type: "journalist",
    licenseNumber: "PL-2024-98765",
    submittedAt: "2 hours ago",
  },
  {
    id: "2",
    name: "Media Corp International",
    type: "organization",
    submittedAt: "5 hours ago",
  },
  {
    id: "3",
    name: "Maria Garcia",
    type: "journalist",
    licenseNumber: "PL-2024-54321",
    submittedAt: "Yesterday",
  },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"reports" | "registrations">("reports");

  const handleApproveRegistration = (id: string) => {
    toast.success("Registration approved!");
  };

  const handleRejectRegistration = (id: string) => {
    toast.error("Registration rejected");
  };

  const handleResolveReport = (id: string) => {
    toast.success("Report resolved!");
  };

  const handleDismissReport = (id: string) => {
    toast.info("Report dismissed");
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
                  Root Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Welcome, {user?.name}</p>
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

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            onClick={() => setActiveTab("reports")}
            className="gap-2"
          >
            <Flag className="h-4 w-4" />
            Reports ({pendingReports.length})
          </Button>
          <Button
            variant={activeTab === "registrations" ? "default" : "ghost"}
            onClick={() => setActiveTab("registrations")}
            className="gap-2"
          >
            <UserCheck className="h-4 w-4" />
            Registrations ({pendingRegistrations.length})
          </Button>
        </div>

        {/* Content Based on Tab */}
        {activeTab === "reports" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Content Reports
            </h2>
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-muted/50 border-l-4 border-destructive"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          report.type === "article" && "bg-accent/20 text-accent",
                          report.type === "comment" && "bg-questionable/20 text-questionable",
                          report.type === "stream" && "bg-destructive/20 text-destructive"
                        )}>
                          {report.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{report.reportedAt}</span>
                      </div>
                      <p className="font-medium text-foreground mb-1">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Reported by: {report.reportedBy} • Reason: {report.reason}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleResolveReport(report.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismissReport(report.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-accent" />
              Pending Registrations
            </h2>
            <div className="space-y-4">
              {pendingRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        reg.type === "journalist" ? "bg-accent/20" : "bg-primary/20"
                      )}>
                        {reg.type === "journalist" ? (
                          <UserCheck className="h-5 w-5 text-accent" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{reg.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reg.type === "journalist" ? (
                            <>License: {reg.licenseNumber}</>
                          ) : (
                            "Organization"
                          )}
                          <span className="mx-2">•</span>
                          {reg.submittedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRegistration(reg.id)}
                        className="bg-verified hover:bg-verified/90"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRegistration(reg.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Platform Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-card border border-border rounded-xl p-6"
        >
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Platform Analytics
          </h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Platform-wide analytics visualization coming soon...</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
