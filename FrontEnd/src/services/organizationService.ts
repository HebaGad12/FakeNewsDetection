import apiClient from "./apiClient";

// ---------- Types matching backend DTOs ----------

export interface OrgProfileResponse {
  id: string;
  name: string;
  email: string;
  profile?: string;
  isActive: boolean;
  createdAt: string;
  totalFollowers: number;
  totalPosts: number;
  walletBalance: number;
}

export interface OrgJournalistResponse {
  id: string;
  name: string;
  email: string;
  licenceNumber: string;
  isActive: boolean;
  registrationStatus: string;
  createdAt: string;
}

export interface OrgPostResponse {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorName: string;
  authorId: string;
  moderationStatus: string;
  verificationStatus: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  comments: number;
}

export interface OrgFollowerResponse {
  userId: string;
  name: string;
  email: string;
  role: string;
  followedAt: string;
}

export interface OrgAnalyticsResponse {
  organizationId: string;
  organizationName: string;
  totalPosts: number;
  pendingPosts: number;
  approvedPosts: number;
  rejectedPosts: number;
  totalFollowers: number;
  journalistCount: number;
  activeJournalistCount: number;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  totalReportsReceived: number;
  walletBalance: number;
}

export interface OrgWalletResponse {
  walletId: string;
  organizationId: string;
  organizationName: string;
  balance: number;
  updatedAt: string;
}

export interface OrgWalletTransactionResponse {
  id: string;
  amount: number;
  type: string;
  description: string;
  donorName?: string;
  createdAt: string;
}

export interface OrgPublicListResponse {
  id: string;
  name: string;
  profile?: string;
  createdAt: string;
}

// ---------- Requests ----------

export interface AddOrgJournalistRequest {
  name: string;
  email: string;
  password: string;
  licenceNumber: string;
}

export interface OrgSetStatusRequest {
  isActive: boolean;
}

export interface OrgReviewPostRequest {
  approve: boolean;
  notes?: string;
}

export interface OrgDonationRequest {
  amount: number;
  message?: string;
}

// ---------- Service class ----------

class OrganizationService {
  // ========== Private endpoints (Organization role only) ==========

  async getMyOrganization(): Promise<OrgProfileResponse> {
    return await apiClient.get<OrgProfileResponse>("/organizations/me");
  }

  async addJournalist(orgUserId: string, data: AddOrgJournalistRequest): Promise<{ message: string; journalistId: string; registrationStatus: string }> {
    return await apiClient.post<{ message: string; journalistId: string; registrationStatus: string }>(
      `/organizations/${orgUserId}/journalists`,
      data
    );
  }

  async getJournalists(orgUserId: string): Promise<OrgJournalistResponse[]> {
    return await apiClient.get<OrgJournalistResponse[]>(`/organizations/${orgUserId}/journalists`);
  }

  async setJournalistStatus(orgUserId: string, journalistId: string, isActive: boolean): Promise<{ message: string }> {
    return await apiClient.patch<{ message: string }>(
      `/organizations/${orgUserId}/journalists/${journalistId}/status`,
      { isActive } as OrgSetStatusRequest
    );
  }

  async getOrganizationPosts(orgUserId: string, status?: string): Promise<OrgPostResponse[]> {
    const params = status ? { status } : {};
    return await apiClient.get<OrgPostResponse[]>(`/organizations/${orgUserId}/posts`, { params });
  }

  async reviewPost(orgUserId: string, postId: string, approve: boolean, notes?: string): Promise<{ message: string; moderationStatus: string }> {
    return await apiClient.patch<{ message: string; moderationStatus: string }>(
      `/organizations/${orgUserId}/posts/${postId}/review`,
      { approve, notes } as OrgReviewPostRequest
    );
  }

  async setPostStatus(orgUserId: string, postId: string, isActive: boolean): Promise<{ message: string }> {
    return await apiClient.patch<{ message: string }>(
      `/organizations/${orgUserId}/posts/${postId}/status`,
      { isActive } as OrgSetStatusRequest
    );
  }

  async getFollowers(orgUserId: string): Promise<OrgFollowerResponse[]> {
    return await apiClient.get<OrgFollowerResponse[]>(`/organizations/${orgUserId}/followers`);
  }

  async getAnalytics(orgUserId: string): Promise<OrgAnalyticsResponse> {
    return await apiClient.get<OrgAnalyticsResponse>(`/organizations/${orgUserId}/analytics`);
  }

  async getWallet(orgUserId: string): Promise<OrgWalletResponse> {
    return await apiClient.get<OrgWalletResponse>(`/organizations/${orgUserId}/wallet`);
  }

  async getWalletTransactions(orgUserId: string): Promise<OrgWalletTransactionResponse[]> {
    return await apiClient.get<OrgWalletTransactionResponse[]>(`/organizations/${orgUserId}/wallet/transactions`);
  }

  // ========== Public endpoints ==========

  async followOrganization(orgUserId: string): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>(`/organizations/${orgUserId}/follow`);
  }

  async unfollowOrganization(orgUserId: string): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/organizations/${orgUserId}/follow`);
  }

  async donateToOrganization(orgUserId: string, amount: number, message?: string): Promise<{ message: string; newBalance: number }> {
    return await apiClient.post<{ message: string; newBalance: number }>(
      `/organizations/${orgUserId}/donate`,
      { amount, message } as OrgDonationRequest
    );
  }

  async listOrganizations(): Promise<OrgPublicListResponse[]> {
    return await apiClient.get<OrgPublicListResponse[]>("/organizations");
  }
}

export const organizationService = new OrganizationService();
export default organizationService;