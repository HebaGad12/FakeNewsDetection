import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService, Role } from "@/services";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle,
  User,
  FileText,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type UserRole = "viewer" | "journalist" | "organization";

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationLicenseNumber: "",
    licenseNumber: "",
  });
  const navigate = useNavigate();

  // Map UI role to API Role enum
  const mapRoleToApiRole = (role: UserRole): Role => {
    const roleMap: Record<UserRole, Role> = {
      viewer: Role.Regular,
      journalist: Role.Journalist,
      organization: Role.Organization,
    };
    return roleMap[role];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Registration form submitted", { 
      role: selectedRole, 
      email: formData.email,
      name: formData.name 
    });
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      const missingFields = [];
      if (!formData.name) missingFields.push("name");
      if (!formData.email) missingFields.push("email");
      if (!formData.password) missingFields.push("password");
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    
    setIsLoading(true);

    try {
      // Prepare registration data
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: mapRoleToApiRole(selectedRole),
        ...(selectedRole === "organization" && formData.organizationLicenseNumber && {
          organizationLicense: formData.organizationLicenseNumber,
        }),
        ...(selectedRole === "journalist" && formData.licenseNumber && {
          journalistId: formData.licenseNumber,
        }),
      };

      console.log("Attempting registration...", { ...registerData, password: "***" });
      await authService.register(registerData);
      console.log("Registration successful");
      toast.success("Account created successfully!");
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Handle different error scenarios
      const status = error.response?.status;
      const message = error.response?.data?.message;
      
      if (status === 409 || (message && message.toLowerCase().includes("already exists"))) {
        toast.error("An account with this email already exists.");
      } else if (status === 400) {
        toast.error(message || "Invalid registration data. Please check your information.");
      } else if (error.code === "ERR_NETWORK" || error.message.includes("Network")) {
        toast.error("Cannot connect to server. Please ensure the backend is running.");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: "viewer" as UserRole,
      title: "Reader",
      description: "Browse news, join communities, and support journalists",
      icon: User,
    },
    {
      id: "journalist" as UserRole,
      title: "Journalist",
      description: "Publish articles, host streams, and grow your audience",
      icon: FileText,
    },
    {
      id: "organization" as UserRole,
      title: "Organization",
      description: "Manage teams of journalists and track performance",
      icon: Building2,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md py-8"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-accent" />
            <span className="font-display text-xl font-bold text-primary">
              TruthTrack
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-primary mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Join the movement for verified news
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <Label className="mb-3 block">I want to join as a</Label>
            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all",
                    selectedRole === role.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  <role.icon className={cn(
                    "h-6 w-6 mx-auto mb-2",
                    selectedRole === role.id ? "text-accent" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium block",
                    selectedRole === role.id ? "text-accent" : "text-foreground"
                  )}>
                    {role.title}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {roles.find(r => r.id === selectedRole)?.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-11 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-11 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 pr-11 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Journalist-specific field */}
            {selectedRole === "journalist" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="license">Press License Number</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="license"
                    type="text"
                    placeholder="e.g., PL-2024-12345"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="pl-11 h-12"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for journalist verification. Your account will be reviewed by our admin team.
                </p>
              </motion.div>
            )}

            {/* Organization-specific fields */}
            {selectedRole === "organization" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="orgLicense">Organization License Number</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="orgLicense"
                      type="text"
                      placeholder="e.g., ORG-2024-12345"
                      value={formData.organizationLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, organizationLicenseNumber: e.target.value })}
                      className="pl-11 h-12"
                    />
                  </div>
                </div>
                {/* <div className="space-y-2">
                  <Label>Business License Document *</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/50 transition-colors cursor-pointer">
                    <input type="file" id="license-upload" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" />
                    <label htmlFor="license-upload" className="cursor-pointer">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Upload license document</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or image (max 10MB)</p>
                    </label>
                  </div>
                </div> */}
                <p className="text-xs text-muted-foreground">
                  Your organization will require admin approval before activation.
                </p>
              </motion.div>
            )}

            {/* Terms
            <div className="flex items-start gap-2 text-sm">
              <input type="checkbox" id="terms" className="mt-1 rounded border-border" />
              <label htmlFor="terms" className="text-muted-foreground">
                I agree to the{" "}
                <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
              </label>
            </div> */}

            <Button type="submit" disabled={isLoading} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              {isLoading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
              <Shield className="h-10 w-10 text-primary-foreground" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-3xl font-bold text-primary-foreground mb-4"
          >
            Be Part of the Solution
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-primary-foreground/80 mb-8"
          >
            Join thousands of readers, journalists, and organizations committed to fighting misinformation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4 text-left"
          >
            {[
              { value: "99.2%", label: "AI Accuracy" },
              { value: "50K+", label: "Verified Articles" },
              { value: "10K+", label: "Journalists" },
              { value: "2M+", label: "Readers" },
            ].map((stat, index) => (
              <div key={index} className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="font-display text-2xl font-bold text-primary-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-primary-foreground/70">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
