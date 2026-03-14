import apiClient from "./apiClient";

// ---------- Types matching backend DTOs ----------
export interface JournalistResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string | null;
  followers: number;
  posts: number;
  createdAt: string;
}

export interface JournalistEditProfileRequest {
  name?: string;
  email?: string;
}

export interface JournalistCreatePostRequest {
  title: string;
  content: string;
  tags: string[];
}

export interface JournalistPostResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  reports: number;
  organizationName: string;
  moderationStatus: string;
}

export interface JournalistFollowingResponse {
  id: string;
  name: string;
  role: string;
  followers: number;
}

export interface JournalistFollowerResponse {
  id: string;
  name: string;
  role: string;
  followers: number;
}

export interface PostReportResponse {
  postId: string;
  title: string;
  moderationStatus: string;
  likes: number;
  comments: number;
  reports: number;
  reportReasons: string[];
}

export type JournalistReportRequest = object

// ---------- Service class ----------
class JournalistService {
  // الملف الشخصي
  async getMe(): Promise<JournalistResponse> {
    // apiClient.get يعيد البيانات مباشرة
    return await apiClient.get<JournalistResponse>("/journalist/me");
  }

  async editProfile(data: JournalistEditProfileRequest): Promise<void> {
    // apiClient.put قد يعيد بيانات لكننا لا نحتاجها هنا
    await apiClient.put("/journalist/edit", data);
  }

  // المنشورات
  async createPost(data: JournalistCreatePostRequest): Promise<{ postId: string; moderationStatus: string }> {
    return await apiClient.post<{ postId: string; moderationStatus: string }>("/journalist/posts", data);
  }

  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/journalist/posts/${postId}`);
  }

  async getMyPosts(): Promise<JournalistPostResponse[]> {
    return await apiClient.get<JournalistPostResponse[]>("/journalist/posts");
  }

  // الإبلاغ عن منشور (خاص بالصحفي)
  async reportPost(postId: string, data?: JournalistReportRequest): Promise<void> {
    await apiClient.post(`/journalist/posts/${postId}/report`, data || {});
  }

  // الحصول على تقرير تفاعلات منشور معين
  async getPostReport(postId: string): Promise<PostReportResponse> {
    return await apiClient.get<PostReportResponse>(`/journalist/posts/${postId}/report`);
  }

  // متابعة / إلغاء متابعة
  async followUser(targetId: string): Promise<void> {
    await apiClient.post(`/journalist/follow/${targetId}`);
  }

  async unfollowUser(targetId: string): Promise<void> {
    await apiClient.delete(`/journalist/unfollow/${targetId}`);
  }

  async getFollowing(): Promise<JournalistFollowingResponse[]> {
    return await apiClient.get<JournalistFollowingResponse[]>("/journalist/following");
  }

  async getFollowers(): Promise<JournalistFollowerResponse[]> {
    return await apiClient.get<JournalistFollowerResponse[]>("/journalist/followers");
  }
}

export const journalistService = new JournalistService();
export default journalistService;