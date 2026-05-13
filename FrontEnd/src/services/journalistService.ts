import apiClient from "./apiClient";
import { POST_DELETED_EVENT } from "./postsService";
import { getCachedUpload, cacheUpload } from "@/lib/uploadCache";

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
  images?: File[];
  isCopyrightedFlags?: boolean[];
  isDraft?: boolean;
  taskId?: string;
}

export interface JournalistPostResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any;
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
  images: File[];
  isCopyrightedFlags?: boolean[];
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

  // File upload with caching
  async uploadFile(file: File): Promise<{ path: string; fileName: string }> {
    // Check if this file has already been uploaded
    const cachedPath = await getCachedUpload(file);
    if (cachedPath) {
      return { path: cachedPath, fileName: file.name };
    }

    // File hasn't been uploaded before, so upload it
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ path: string; fileName: string }>(
      "/journalist/upload",
      formData
    );

    // Cache the upload result
    await cacheUpload(file, response.path);

    return response;
  }

  // المنشورات
  async createPost(data: JournalistCreatePostRequest): Promise<{ postId: string; moderationStatus: string }> {
    const formData = new FormData();
    formData.append("Title", data.title);
    formData.append("Content", data.content);
     if (data.tags && data.tags.length > 0) {
  formData.append("Tags", data.tags.join(","));
}

    if (data.images) {
      for (const image of data.images) {
        formData.append("images", image);
      }
    }

    if (data.isCopyrightedFlags) {
      for (const flag of data.isCopyrightedFlags) {
        formData.append("IsCopyrightedFlags", String(flag));
      }
    }

    if (data.isDraft !== undefined) {
      formData.append("IsDraft", String(data.isDraft));
    }

    if (data.taskId) {
      formData.append("TaskId", data.taskId);
    }

    return await apiClient.post<{ postId: string; moderationStatus: string }>("/journalist/posts", formData);
  }

  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/journalist/posts/${postId}`);
    window.dispatchEvent(new CustomEvent(POST_DELETED_EVENT, { detail: { postId } }));
  }

  async getMyPosts(): Promise<JournalistPostResponse[]> {
    return await apiClient.get<JournalistPostResponse[]>("/journalist/posts");
  }

  async addMediaToPost(postId: string, data: AddPostMediaRequest): Promise<MediaDto[]> {
    const formData = new FormData();

    for (const image of data.images) {
      formData.append("images", image);
    }

    if (data.isCopyrightedFlags) {
      for (const flag of data.isCopyrightedFlags) {
        formData.append("IsCopyrightedFlags", String(flag));
      }
    }

    return await apiClient.post<MediaDto[]>(`/journalist/posts/${postId}/media`, formData);
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

  /**
   * Analyze text for grammar or facts
   */
  async analyzeText(text: string, mode: "grammar" | "factcheck"): Promise<{ text: string; mode: string; analysis: string }> {
    return await apiClient.post("/chat", { text, mode });
  }
}

export const journalistService = new JournalistService();
export default journalistService;