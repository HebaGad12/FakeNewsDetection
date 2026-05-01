import apiClient from "./apiClient";
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
}

export const userService = new UserService();
export default userService;