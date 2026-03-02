import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authService } from "@/services";
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
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Predefined test users
const testUsers: Record<string, { password: string; user: User }> = {
  "reader@test.com": {
    password: "reader123",
    user: {
      id: "1",
      name: "John Reader",
      email: "reader@test.com",
      role: "viewer",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    },
  },
  "journalist@test.com": {
    password: "journalist123",
    user: {
      id: "2",
      name: "Sarah Mitchell",
      email: "journalist@test.com",
      role: "journalist",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      organization: "Climate Watch Network",
      licenseNumber: "PL-2024-12345",
    },
  },
  "org@test.com": {
    password: "org123",
    user: {
      id: "3",
      name: "Global News Admin",
      email: "org@test.com",
      role: "organization",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100",
      organization: "Global News Network",
    },
  },
  "admin@test.com": {
    password: "admin123",
    user: {
      id: "4",
      name: "Root Administrator",
      email: "admin@test.com",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    },
  },
};

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

// Helper function to convert AuthResponse or UserProfile to User
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

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const profile = await authService.getCurrentUser();
          setUser(mapAuthResponseToUser(profile));
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
    setUser(mapAuthResponseToUser(response));
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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

export { testUsers };
