import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import ReaderDashboard from "@/components/dashboards/ReaderDashboard";
import JournalistDashboard from "@/components/dashboards/JournalistDashboard";
import OrganizationDashboard from "@/components/dashboards/OrganizationDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "viewer":
      return <ReaderDashboard />;
    case "journalist":
      return <JournalistDashboard />;
    case "organization":
      return <OrganizationDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default DashboardPage;
