import apiClient from "./apiClient";
import { API_BASE_URL } from "@/lib/constants";
import { getAuthToken } from "@/lib/authStorage";
import {
  UserProfileExtended,
  EditProfileRequest,
  UserOverview,
  FollowingUser,
  ReportPostRequest,
  UserActivity,
} from "./types";

/**
 * User Service
 * Handles user profile, following, reporting, and activity operations
 */
class UserService {
  subscribeToNewsletter(email: string) {
    throw new Error("Method not implemented.");
  }
  /**
   * Get current user profile with social stats
   * @returns Promise<UserProfileExtended>
   */
  async getMe(): Promise<UserProfileExtended> {
    return await apiClient.get<UserProfileExtended>("/user/me");
  }

  /**
   * Edit user profile
   * @param data - Profile update data
   * @returns Promise<void>
   */
  async editProfile(data: EditProfileRequest): Promise<void> {
    await apiClient.put("/user/edit", data);
  }

  /**
   * Get user overview statistics
   * @returns Promise<UserOverview>
   */
  async getOverview(): Promise<UserOverview> {
    return await apiClient.get<UserOverview>("/user/overview");
  }

  /**
   * Get list of users/journalists the current user is following
   * @returns Promise<FollowingUser[]>
   */
  async getFollowing(): Promise<FollowingUser[]> {
    return await apiClient.get<FollowingUser[]>("/user/following");
  }

  /**
   * Follow a user or journalist
   * @param targetId - UUID of the user to follow
   * @returns Promise<void>
   */
  async follow(targetId: string): Promise<void> {
    await apiClient.post(`/user/follow/${targetId}`);
  }

  /**
   * Unfollow a user or journalist
   * @param targetId - UUID of the user to unfollow
   * @returns Promise<void>
   */
  async unfollow(targetId: string): Promise<void> {
    await apiClient.delete(`/user/unfollow/${targetId}`);
  }

  /**
   * Report a post
   * @param postId - UUID of the post to report
   * @param data - Report reason
   * @returns Promise<void>
   */
  async reportPost(postId: string, data: ReportPostRequest): Promise<void> {
    await apiClient.post(`/user/posts/${postId}/report`, data);
  }

  /**
   * Get user activity history
   * @returns Promise<UserActivity[]>
   */
  async getActivity(): Promise<UserActivity[]> {
    return await apiClient.get<UserActivity[]>("/user/activity");
  }

  /**
   * Upload a profile picture for the given user
   * @param userId - UUID of the user
   * @param file - Image file to upload
   */
  async uploadPicture(userId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    await apiClient.post(`/user/${userId}/upload-picture`, formData);
  }

  /**
   * Fetch the user's profile picture as a blob URL.
   * Uses the auth token since the endpoint requires authentication.
   * Returns null if no picture exists (404).
   * Includes retry logic with exponential backoff for freshly uploaded images.
   * @param userId - UUID of the user
   */
  async fetchPictureBlobUrl(userId: string): Promise<string | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/user/${userId}/picture`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        // If successful, return blob URL
        if (response.ok) {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        }
        
        // If 404, image doesn't exist (don't retry)
        if (response.status === 404) {
          return null;
        }
        
        // For other errors, retry with exponential backoff
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on last attempt
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    
    // Log failure after all retries exhausted
    console.warn(
      `Failed to fetch picture for user ${userId} after ${maxRetries} attempts:`,
      lastError
    );
    return null;
  }
}

export const userService = new UserService();
export default userService;