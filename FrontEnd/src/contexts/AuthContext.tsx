import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authService } from "@/services";
import { userService } from "@/services/userService";
import { AuthResponse, Role, UserProfile } from "@/services/types";

export type UserRole = "viewer" | "journalist" | "organization" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  licenseNumber?: string;
  licenseDocument?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAvatar: (localBlobUrl?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// Helper function to map API role string to UserRole
const mapRoleToUserRole = (role: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    "Regular": "viewer",
    "Journalist": "journalist",
    "Organization": "organization",
    "Admin": "admin",
  };
  return roleMap[role] || "viewer";
};

// Helper function to convert AuthResponse or UserProfile to User (without avatar — loaded separately)
const mapAuthResponseToUser = (response: AuthResponse | UserProfile): User => {
  return {
    id: response.userId,
    name: response.name,
    email: response.email,
    role: mapRoleToUserRole(response.role),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: fetch and set avatar blob URL for a user id
  const loadAvatar = async (userId: string) => {
    const blobUrl = await userService.fetchPictureBlobUrl(userId);
    if (blobUrl) {
      setUser((prev) => (prev && prev.id === userId ? { ...prev, avatar: blobUrl } : prev));
    }
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const profile = await authService.getCurrentUser();
          const mappedUser = mapAuthResponseToUser(profile);
          setUser(mappedUser);
          // Fetch avatar in parallel (don't block loading state)
          loadAvatar(mappedUser.id);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await authService.login({ email, password });
    const mappedUser = mapAuthResponseToUser(response);
    setUser(mappedUser);
    // Fetch avatar after login
    loadAvatar(mappedUser.id);
  };

  const refreshAvatar = async (localBlobUrl?: string) => {
    if (!user?.id) return;
    // Revoke old blob URL to prevent memory leaks
    if (user.avatar && user.avatar.startsWith("blob:")) {
      URL.revokeObjectURL(user.avatar);
    }
    if (localBlobUrl) {
      // Use the provided local blob URL directly — instant update everywhere
      setUser((prev) =>
        prev ? { ...prev, avatar: localBlobUrl } : prev
      );
    } else {
      // Fallback: fetch from server with a small delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const blobUrl = await userService.fetchPictureBlobUrl(user.id);
      setUser((prev) =>
        prev ? { ...prev, avatar: blobUrl || undefined } : prev
      );
    }
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const profile = await authService.getCurrentUser();
      const mappedUser = mapAuthResponseToUser(profile);
      // Preserve the current avatar since it's managed separately
      setUser((prev) => ({
        ...mappedUser,
        avatar: prev?.avatar,
      }));
    } catch (error) {
      console.error("Failed to refresh user profile:", error);
    }
  };

  const logout = () => {
    // Clean up blob URL
    if (user?.avatar && user.avatar.startsWith("blob:")) {
      URL.revokeObjectURL(user.avatar);
    }
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshAvatar, refreshUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

