import apiClient from "./apiClient";
import { POST_DELETED_EVENT } from "./postsService";

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

export interface MediaItemRequest {
  path: string;
  mediaType: "image" | "video";
  isCopyrighted?: boolean;
}

export interface JournalistCreatePostRequest {
  title: string;
  content: string;
  tags: string[];
  media?: MediaItemRequest[];
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
  media: MediaDto[];
}

export interface JournalistFollowingResponse {
  id: string;
  name: string;
  role: string;
  followers: number;
}

export interface MediaDto {
  mediaId: string;
  path: string;
  mediaType: string;
  isCopyrighted: boolean;
  uploadedAt: string;
}

export interface AddPostMediaRequest {
  mediaItems: MediaItemRequest[];
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

  // File upload
  async uploadFile(file: File): Promise<{ path: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return await apiClient.post<{ path: string; fileName: string }>(
      "/journalist/upload", 
      formData
    );
  }

  // المنشورات
  async createPost(data: JournalistCreatePostRequest): Promise<{ postId: string; moderationStatus: string }> {
    return await apiClient.post<{ postId: string; moderationStatus: string }>("/journalist/posts", data);
  }

  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/journalist/posts/${postId}`);
    window.dispatchEvent(new CustomEvent(POST_DELETED_EVENT, { detail: { postId } }));
  }

  async getMyPosts(): Promise<JournalistPostResponse[]> {
    return await apiClient.get<JournalistPostResponse[]>("/journalist/posts");
  }

  async addMediaToPost(postId: string, data: AddPostMediaRequest): Promise<MediaDto[]> {
    return await apiClient.post<MediaDto[]>(`/journalist/posts/${postId}/media`, data);
  }

  async deleteMediaFromPost(postId: string, mediaId: string): Promise<void> {
    await apiClient.delete(`/journalist/posts/${postId}/media/${mediaId}`);
  }

  async setMediaCopyright(postId: string, mediaId: string, isCopyrighted: boolean): Promise<MediaDto> {
    return await apiClient.patch<MediaDto>(
      `/journalist/posts/${postId}/media/${mediaId}/copyright`,
      { isCopyrighted }
    );
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