import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Shield, Search, Bell, User, LogOut, Settings, Lock, LayoutDashboard, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { publicProfileService, userService } from "@/services";
import type { ProfileSearchItem } from "@/services/publicProfileService";
import { toast } from "sonner";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "News Feed" },
  { href: "/communities", label: "Communities" },
  { href: "/live", label: "Live" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isProfileSearchOpen, setIsProfileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRole, setSearchRole] = useState<string>("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchResults, setSearchResults] = useState<ProfileSearchItem[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const loadFollowingProfiles = async () => {
    try {
      const following = await userService.getFollowing();
      setFollowingIds(following.map((item) => item.id));
    } catch {
      setFollowingIds([]);
    }
  };

  const openProfileSearch = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setIsProfileSearchOpen(true);
    await loadFollowingProfiles();
  };

  const handleSearchProfiles = async (page = 1, append = false) => {
    setSearchLoading(true);
    try {
      const response = await publicProfileService.searchProfiles({
        q: searchQuery,
        role: searchRole === "all" ? undefined : searchRole,
        page,
        pageSize: 10,
      });

      setSearchPage(response.page);
      setSearchTotal(response.total);
      setSearchResults((prev) => (append ? [...prev, ...response.results] : response.results));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadMoreProfiles = async () => {
    await handleSearchProfiles(searchPage + 1, true);
  };

  const handleViewProfile = (id: string) => {
    setIsProfileSearchOpen(false);
    navigate(`/profiles/${id}`);
  };

  const handleFollowProfile = async (id: string) => {
    setFollowLoadingId(id);
    try {
      await userService.follow(id);
      setFollowingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, followers: item.followers + 1 } : item
        )
      );
      toast.success("Profile followed successfully");
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setFollowingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        toast.error("You are already following this profile");
      } else {
        toast.error("Failed to follow profile");
      }
    } finally {
      setFollowLoadingId(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-display text-xl font-bold text-primary">
              TruthTrack
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  location.pathname === link.href
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Search public profiles"
              onClick={openProfileSearch}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      {user?.name || "Account"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-lg font-medium transition-all",
                    location.pathname === link.href
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-start"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openProfileSearch();
                  }}
                >
                  <Search className="h-4 w-4" />
                  Search Profiles
                </Button>
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full gap-2 justify-start">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 justify-start"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsEditProfileOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 justify-start"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                    >
                      <Lock className="h-4 w-4" />
                      Change Password
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full gap-2 justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">Sign In</Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={isChangePasswordOpen} 
        onOpenChange={setIsChangePasswordOpen} 
      />
      
      {/* Edit Profile Dialog */}
      <EditProfileDialog 
        open={isEditProfileOpen} 
        onOpenChange={setIsEditProfileOpen} 
      />

      <Dialog open={isProfileSearchOpen} onOpenChange={setIsProfileSearchOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Search Public Profiles</DialogTitle>
            <DialogDescription>
              Find journalists and organizations by name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={searchRole} onValueChange={setSearchRole}>
                <SelectTrigger className="md:w-52">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="Journalist">Journalist</SelectItem>
                  <SelectItem value="Organization">Organization</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => handleSearchProfiles(1, false)} disabled={searchLoading}>
                {searchLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3 max-h-[55vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.role}
                        {item.organization ? ` • ${item.organization}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.followers} followers • {item.totalPosts} posts
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewProfile(item.id)}>
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFollowProfile(item.id)}
                          disabled={followingIds.includes(item.id) || followLoadingId === item.id}
                        >
                          {followLoadingId === item.id
                            ? "Following..."
                            : followingIds.includes(item.id)
                              ? "Following"
                              : "Follow"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Use search to find profiles.
                  </p>
                )}

                {searchResults.length > 0 && searchResults.length < searchTotal && (
                  <div className="text-center pt-1">
                    <Button variant="outline" onClick={handleLoadMoreProfiles} disabled={searchLoading}>
                      {searchLoading ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
