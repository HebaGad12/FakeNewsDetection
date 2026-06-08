import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Shield, Search, Bell, User, LogOut, Lock, LayoutDashboard, Edit } from "lucide-react";
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
import journalistService from "@/services/journalistService";
import notificationsService, { NotificationDto } from "@/services/notificationsService";
import { useNotificationSignalR } from "@/hooks/useNotificationSignalR";
import type { ProfileSearchItem } from "@/services/publicProfileService";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

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
  const [avatarError, setAvatarError] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Reset avatar error when user changes (e.g., after upload)
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
      const countRes = await notificationsService.getUnreadCount();
      setUnreadCount(countRes.count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useNotificationSignalR({
    onReceiveNotification: (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast(notification.title, { description: notification.message });
    },
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const loadFollowingProfiles = async () => {
    try {
      if (user?.role?.toLowerCase() === "journalist") {
        const following = await journalistService.getFollowing();
        setFollowingIds(following.map((item) => item.id));
      } else {
        const following = await userService.getFollowing();
        setFollowingIds(following.map((item) => item.id));
      }
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
    if (id === user?.id) {
      toast.error("You cannot follow yourself");
      return;
    }

    setFollowLoadingId(id);
    try {
      if (user?.role?.toLowerCase() === "journalist") {
        await journalistService.followUser(id);
      } else {
        await userService.follow(id);
      }
      setFollowingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, followers: item.followers + 1 } : item
        )
      );
      toast.success("Profile followed successfully");
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 409) {
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <div className="news-container">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 transition-colors group-hover:bg-red-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-2xl font-bold text-slate-950">
                TruthTrack
              </span>
              <p className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 sm:block">
                Independent News Desk
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                  location.pathname === link.href
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Search public profiles"
              onClick={openProfileSearch}
            >
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto rounded-lg border-slate-200">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem 
                        key={n.id} 
                        className={cn("flex flex-col items-start gap-1 p-3 cursor-pointer", !n.isRead && "bg-red-50/70")}
                        onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      >
                        <div className="flex justify-between w-full items-center">
                          <span className="font-semibold text-sm">{n.title}</span>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-red-600"></span>}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                        <span className="text-[10px] text-muted-foreground/70">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                      {user?.avatar && !avatarError ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-5 w-5 rounded-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      {user?.name || "Account"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-lg border-slate-200">
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
                  <Button variant="outline" size="sm" className="gap-2 rounded-md border-slate-200">
                    <User className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-md bg-red-600 text-white hover:bg-red-700">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-md md:hidden"
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
            className="md:hidden border-t border-slate-200 bg-white"
          >
            <nav className="news-container py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "block rounded-md px-4 py-3 font-semibold transition-colors",
                    location.pathname === link.href
                      ? "bg-red-50 text-red-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-200 space-y-2">
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
                        {item.id === user?.id ? (
                          <Button size="sm" variant="secondary" disabled>
                            Your Profile
                          </Button>
                        ) : (
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
                        )}
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