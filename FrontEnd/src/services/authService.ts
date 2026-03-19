import apiClient from "./apiClient";
import { RegisterRequest, LoginRequest, AuthResponse, ChangePasswordRequest, UserProfile } from "./types";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authStorage";

/**
 * Authentication Service
 * Handles user registration, login, logout, and token management
 */
class AuthService {
  /**
   * Register a new user
   * @param data - Registration data including name, email, password, role, etc.
   * @returns Promise<AuthResponse> - Authentication response with token and user info
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    
    // Store token in sessionStorage so each tab can use a different user
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  }

  /**
   * Login an existing user
   * @param data - Login credentials (email and password)
   * @returns Promise<AuthResponse> - Authentication response with token and user info
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    
    // Store token in sessionStorage so each tab can use a different user
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  }

  /**
   * Logout the current user
   * Removes the authentication token from storage
   */
  logout(): void {
    clearAuthToken();
  }

  /**
   * Check if user is authenticated
   * @returns boolean - True if user has a valid token
   */
  isAuthenticated(): boolean {
    const token = getAuthToken();
    return !!token;
  }

  /**
   * Get the current authentication token
   * @returns string | null - The stored token or null if not authenticated
   */
  getToken(): string | null {
    return getAuthToken();
  }

  /**
   * Get current user profile
   * @returns Promise<UserProfile> - Current user's profile information
   */
  async getCurrentUser(): Promise<UserProfile> {
    return await apiClient.get<UserProfile>("/auth/me");
  }

  /**
   * Change user password
   * @param data - Current and new password
   * @returns Promise<void>
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.put<void>("/auth/change-password", data);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
