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
    <div className="editorial-shell flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md py-8"
        >
          {/* Logo */}
          <Link to="/" className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950">
              <Shield className="h-6 w-6 text-white" />
            </span>
            <span className="font-display text-2xl font-bold text-slate-950">TruthTrack</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="news-kicker mb-4">Join The Desk</div>
            <h1 className="mb-2 font-display text-4xl font-bold leading-tight text-slate-950">
              Create your account
            </h1>
            <p className="text-slate-600">
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
                    "cursor-pointer rounded-md border p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-red-600",
                    selectedRole === role.id
                      ? "border-red-600 bg-red-50"
                      : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/60"
                  )}
                >
                  <role.icon className={cn(
                    "h-6 w-6 mx-auto mb-2",
                    selectedRole === role.id ? "text-red-700" : "text-slate-500"
                  )} />
                  <span className={cn(
                    "text-sm font-medium block",
                    selectedRole === role.id ? "text-red-700" : "text-slate-950"
                  )}>
                    {role.title}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {roles.find(r => r.id === selectedRole)?.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="editorial-card space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="editorial-input pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="editorial-input pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="editorial-input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-slate-500 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-red-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
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
                  <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="license"
                    type="text"
                    placeholder="e.g., PL-2024-12345"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="editorial-input pl-11"
                  />
                </div>
                <p className="text-xs text-slate-500">
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
                    <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="orgLicense"
                      type="text"
                      placeholder="e.g., ORG-2024-12345"
                      value={formData.organizationLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, organizationLicenseNumber: e.target.value })}
                      className="editorial-input pl-11"
                    />
                  </div>
                </div>
                {/* <div className="space-y-2">
                  <Label>Business License Document *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer">
                    <input type="file" id="license-upload" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" />
                    <label htmlFor="license-upload" className="cursor-pointer">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Upload license document</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or image (max 10MB)</p>
                    </label>
                  </div>
                </div> */}
                <p className="text-xs text-slate-500">
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

            <Button type="submit" disabled={isLoading} className="editorial-button-primary h-12 w-full gap-2">
              {isLoading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-red-700 hover:text-red-900">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden flex-1 items-center justify-center bg-slate-950 p-12 text-white lg:flex">
        <div className="max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 border-l-4 border-red-600 pl-5"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-red-600">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">Verified News Desk</p>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 font-display text-4xl font-bold leading-tight text-white"
          >
            Be Part of the Solution
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 text-base leading-7 text-slate-300"
          >
            Join thousands of readers, journalists, and organizations committed to fighting misinformation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-3 text-left"
          >
            {[
              { value: "99.2%", label: "AI Accuracy" },
              { value: "50K+", label: "Verified Articles" },
              { value: "10K+", label: "Journalists" },
              { value: "2M+", label: "Readers" },
            ].map((stat, index) => (
              <div key={index} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="font-display text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-300">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
