import apiClient from "./apiClient";
import {
  UserProfileExtended,
  EditProfileRequest,
  EditProfileResponse,
  UserOverview,
  FollowingUser,
  ReportPostRequest,
  ReportPostResponse,
  FollowActionResponse,
  UserActivity,
} from "./types";

/**
 * User Service
 * Handles user profile, following, reporting, and activity operations
 */
class UserService {
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
   * @returns Promise<EditProfileResponse>
   */
  async editProfile(data: EditProfileRequest): Promise<EditProfileResponse> {
    return await apiClient.put<EditProfileResponse>("/user/edit", data);
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
   * @returns Promise<FollowActionResponse>
   */
  async follow(targetId: string): Promise<FollowActionResponse> {
    return await apiClient.post<FollowActionResponse>(`/user/follow/${targetId}`);
  }

  /**
   * Unfollow a user or journalist
   * @param targetId - UUID of the user to unfollow
   * @returns Promise<FollowActionResponse>
   */
  async unfollow(targetId: string): Promise<FollowActionResponse> {
    return await apiClient.delete<FollowActionResponse>(`/user/unfollow/${targetId}`);
  }

  /**
   * Report a post
   * @param postId - UUID of the post to report
   * @param data - Report reason
   * @returns Promise<ReportPostResponse>
   */
  async reportPost(postId: string, data: ReportPostRequest): Promise<ReportPostResponse> {
    return await apiClient.post<ReportPostResponse>(`/user/posts/${postId}/report`, data);
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