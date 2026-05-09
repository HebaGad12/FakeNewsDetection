import apiClient from "./apiClient";
import { API_BASE_URL } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

export interface CommunityDto {
	id: string;
	name: string;
	description: string;
	isOpen: boolean;
	imageUrl?: string | null;
	createdBy: string;
	creatorName: string;
	creatorRole: string;
}

export interface MemberDto {
	id: string;
	name: string;
	role: string;
	joinedAt: string;
	isBanned: boolean;
}

export interface CommentDto {
	id: string;
	authorId: string;
	authorName: string;
	authorRole: string;
	content: string;
	createdAt: string;
}

export interface CommunityPostDto {
	id: string;
	content: string;
	authorId: string;
	authorName: string;
	authorRole: string;
	authorOrgId?: string | null;
	authorOrgName?: string | null;
	createdAt: string;
	mediaPaths?: string[] | null;
	totalLikes: number;
	comments: CommentDto[];
}

export interface MemberStatusDto {
	status: "Member" | "Banned" | "NotMember" | string;
}

export interface CreateCommunityRequest {
	name: string;
	description: string;
	isOpen: boolean;
	image?: File | null;
}

export interface CreateCommunityPostRequest {
	content: string;
	mediaFiles?: File[];
}

// ============================================================================
// Service
// ============================================================================

class CommunityService {
	private baseUrl = "/Community";

	getImageUrl(imagePath?: string | null): string {
		if (!imagePath) return "";
		if (imagePath.startsWith("http")) return imagePath;
		const baseWithoutApi = API_BASE_URL.replace("/api", "");
		return `${baseWithoutApi}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
	}

	async createCommunity(payload: CreateCommunityRequest): Promise<ApiResponse<CommunityDto>> {
		const formData = new FormData();
		formData.append("Name", payload.name);
		formData.append("Description", payload.description);
		formData.append("IsOpen", String(payload.isOpen));
		if (payload.image) {
			formData.append("image", payload.image);
		}

		return apiClient.post<ApiResponse<CommunityDto>>(`${this.baseUrl}/create`, formData);
	}

	async getCommunity(communityId: string): Promise<CommunityDto> {
		return apiClient.get<CommunityDto>(`${this.baseUrl}/${communityId}`);
	}

	async joinCommunity(communityId: string): Promise<ApiResponse<string>> {
		return apiClient.post<ApiResponse<string>>(`${this.baseUrl}/${communityId}/join`);
	}

	async leaveCommunity(communityId: string): Promise<ApiResponse<string>> {
		return apiClient.delete<ApiResponse<string>>(`${this.baseUrl}/${communityId}/leave`);
	}

	async getMembers(communityId: string): Promise<MemberDto[]> {
		return apiClient.get<MemberDto[]>(`${this.baseUrl}/${communityId}/members`);
	}

	async getCommunityPosts(communityId: string): Promise<CommunityPostDto[]> {
		return apiClient.get<CommunityPostDto[]>(`${this.baseUrl}/${communityId}/posts`);
	}

	async createPost(
		communityId: string,
		payload: CreateCommunityPostRequest
	): Promise<ApiResponse<CommunityPostDto>> {
		const formData = new FormData();
		formData.append("content", payload.content);
		if (payload.mediaFiles) {
			payload.mediaFiles.forEach((file) => {
				formData.append("mediaFiles", file);
			});
		}

		return apiClient.post<ApiResponse<CommunityPostDto>>(
			`${this.baseUrl}/${communityId}/posts/create`,
			formData
		);
	}

	async banUser(communityId: string, targetUserId: string): Promise<ApiResponse<string>> {
		return apiClient.post<ApiResponse<string>>(
			`${this.baseUrl}/${communityId}/members/${targetUserId}/ban`
		);
	}

	async unbanUser(communityId: string, targetUserId: string): Promise<ApiResponse<string>> {
		return apiClient.post<ApiResponse<string>>(
			`${this.baseUrl}/${communityId}/members/${targetUserId}/unban`
		);
	}

	async deletePost(communityId: string, postId: string): Promise<ApiResponse<string>> {
		return apiClient.delete<ApiResponse<string>>(`${this.baseUrl}/${communityId}/posts/${postId}`);
	}

	async getMemberStatus(communityId: string, targetUserId: string): Promise<ApiResponse<MemberStatusDto>> {
		return apiClient.get<ApiResponse<MemberStatusDto>>(
			`${this.baseUrl}/${communityId}/members/${targetUserId}/status`
		);
	}

	async getAllCommunities(): Promise<CommunityDto[]> {
		return apiClient.get<CommunityDto[]>(`${this.baseUrl}/all`);
	}

	async getByJournalist(journalistId: string): Promise<CommunityDto[]> {
		return apiClient.get<CommunityDto[]>(`${this.baseUrl}/by-journalist/${journalistId}`);
	}

	async searchCommunities(query: string): Promise<CommunityDto[]> {
		return apiClient.get<CommunityDto[]>(`${this.baseUrl}/search`, {
			params: { query },
		});
	}
}

export const communityService = new CommunityService();
export default communityService;
