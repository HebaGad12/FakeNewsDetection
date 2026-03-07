import apiClient from "./apiClient";

// ============================================================================
// Admin Types
// ============================================================================

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPosts: number;
  pendingPosts: number;
  approvedPosts: number;
  rejectedPosts: number;
  flaggedPosts: number;
  verifiedPosts: number;
  fakePosts: number;
  misleadingPosts: number;
  unknownPosts: number;
  totalJournalists: number;
  totalOrganizations: number;
  totalRegularUsers: number;
  totalAdmins: number;
  pendingJournalistRequests: number;
  rejectedJournalistRequests: number;
  pendingOrganizationRequests: number;
  rejectedOrganizationRequests: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  journalistExternalId: string | null;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  totalInteractions: number;
  moderationActionsCount: number;
}

export interface AdminPostListItem {
  id: string;
  title: string;
  authorName: string;
  authorEmail: string;
  authorId: string;
  verificationStatus: string;
  confidenceScore: number;
  moderationStatus: string;
  createdAt: string;
  updatedAt: string;
  interactionCount: number;
  organizationName: string | null;
}

export interface AdminPostDetail extends AdminPostListItem {
  content: string;
  tags: string[];
  authorRole: string;
  organizationId: string | null;
  communityCredibilityPercent: number;
  moderationNotes: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  reportCount: number;
  totalInteractions: number;
}

export interface PendingJournalistRequest {
  id: string;
  name: string;
  email: string;
  journalistExternalId: string;
  registeredAt: string;
}

export interface RejectedJournalistRequest {
  id: string;
  name: string;
  email: string;
  journalistId: string;
  rejectionReason: string;
  registeredAt: string;
}

export interface ReviewJournalistRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface ReviewOrganizationRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface PendingOrganizationRequest {
  userId: string;
  name: string;
  email: string;
  license: string;
  registeredAt: string;
}

export interface RejectedOrganizationRequest {
  userId: string;
  name: string;
  email: string;
  license: string;
  registeredAt: string;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

export interface UpdatePostModerationRequest {
  moderationStatus: string;
  moderationNotes?: string;
}

export interface UpdatePostVerificationRequest {
  verificationStatus: string;
  confidenceScore?: number;
}

export interface AdminUsersParams {
  role?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminPostsParams {
  moderationStatus?: string;
  verificationStatus?: string;
  authorId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// AdminService
// ============================================================================

class AdminService {
  // --- Dashboard ---

  async getDashboardStats(): Promise<AdminDashboardStats> {
    return apiClient.get<AdminDashboardStats>("/admin/dashboard/stats");
  }

  // --- Users ---

  async getUsers(params: AdminUsersParams = {}): Promise<PaginatedResult<AdminUserListItem>> {
    const { page = 1, pageSize = 20, role, isActive } = params;
    const query: Record<string, unknown> = { page, pageSize };
    if (role !== undefined) query.role = role;
    if (isActive !== undefined) query.isActive = isActive;

    const result = await apiClient.getPaginated<AdminUserListItem[]>("/admin/users", {
      params: query,
    });
    return { data: result.data, totalCount: result.totalCount, page: result.page, pageSize: result.pageSize };
  }

  async getUserById(id: string): Promise<AdminUserDetail> {
    return apiClient.get<AdminUserDetail>(`/admin/users/${id}`);
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  }

  async updateUserStatus(id: string, request: UpdateUserStatusRequest): Promise<void> {
    await apiClient.patch(`/admin/users/${id}/status`, request);
  }

  // --- Posts ---

  async getPosts(params: AdminPostsParams = {}): Promise<PaginatedResult<AdminPostListItem>> {
    const { page = 1, pageSize = 20, moderationStatus, verificationStatus, authorId } = params;
    const query: Record<string, unknown> = { page, pageSize };
    if (moderationStatus) query.moderationStatus = moderationStatus;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (authorId) query.authorId = authorId;

    const result = await apiClient.getPaginated<AdminPostListItem[]>("/admin/posts", {
      params: query,
    });
    return { data: result.data, totalCount: result.totalCount, page: result.page, pageSize: result.pageSize };
  }

  async getPostById(id: string): Promise<AdminPostDetail> {
    return apiClient.get<AdminPostDetail>(`/admin/posts/${id}`);
  }

  async deletePost(id: string): Promise<void> {
    await apiClient.delete(`/admin/posts/${id}`);
  }

  async updatePostModeration(id: string, request: UpdatePostModerationRequest): Promise<void> {
    await apiClient.patch(`/admin/posts/${id}/moderation`, request);
  }

  async updatePostVerification(id: string, request: UpdatePostVerificationRequest): Promise<void> {
    await apiClient.patch(`/admin/posts/${id}/verification`, request);
  }

  // --- Journalists ---

  async getPendingJournalists(): Promise<PendingJournalistRequest[]> {
    return apiClient.get<PendingJournalistRequest[]>("/admin/journalists/pending");
  }

  async reviewJournalist(id: string, request: ReviewJournalistRequest): Promise<void> {
    await apiClient.patch(`/admin/journalists/${id}/review`, request);
  }

  async getRejectedJournalists(): Promise<RejectedJournalistRequest[]> {
    return apiClient.get<RejectedJournalistRequest[]>("/admin/journalists/rejected");
  }

  async reopenJournalistRequest(id: string): Promise<void> {
    await apiClient.patch(`/admin/journalists/${id}/reopen`);
  }

  // --- Organizations ---

  async getPendingOrganizations(): Promise<PendingOrganizationRequest[]> {
    return apiClient.get<PendingOrganizationRequest[]>("/admin/organizations/pending");
  }

  async reviewOrganization(userId: string, request: ReviewOrganizationRequest): Promise<void> {
    await apiClient.patch(`/admin/organizations/${userId}/review`, request);
  }

  async getRejectedOrganizations(): Promise<RejectedOrganizationRequest[]> {
    return apiClient.get<RejectedOrganizationRequest[]>("/admin/organizations/rejected");
  }

  // --- Reports ---

  async getPostsByModeration(): Promise<unknown> {
    return apiClient.get("/admin/reports/posts-by-moderation");
  }

  async getPostsByVerification(): Promise<unknown> {
    return apiClient.get("/admin/reports/posts-by-verification");
  }

  async getUsersByRole(): Promise<unknown> {
    return apiClient.get("/admin/reports/users-by-role");
  }
}

export const adminService = new AdminService();
export default adminService;