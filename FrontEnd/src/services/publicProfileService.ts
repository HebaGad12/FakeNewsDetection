import apiClient from "./apiClient";

export interface PublicProfileMedia {
	id: string;
	url: string;
	mediaType: string;
	isCopyrighted: boolean;
	uploadedAt: string;
}

export interface PublicProfilePost {
	id: string;
	title: string;
	content: string;
	tags: string[];
	createdAt: string;
	likes: number;
	comments: number;
	verificationStatus: string;
	confidenceScore?: number | null;
	media: PublicProfileMedia[];
}

export interface PublicProfile {
	id: string;
	name: string;
	role: string;
	organization?: string | null;
	bio?: string | null;
	followers: number;
	totalPosts: number;
	totalJournalists?: number;
	memberSince: string;
	posts: PublicProfilePost[];
}

export interface ProfileSearchItem {
	id: string;
	name: string;
	role: string;
	organization?: string | null;
	bio?: string | null;
	followers: number;
	totalPosts: number;
	memberSince: string;
}

export interface ProfileSearchResponse {
	page: number;
	pageSize: number;
	total: number;
	results: ProfileSearchItem[];
}

type RawProfileSearchResponse =
	| ProfileSearchItem[]
	| {
			page?: number;
			pageSize?: number;
			total?: number;
			results?: ProfileSearchItem[];
			Page?: number;
			PageSize?: number;
			Total?: number;
			Results?: ProfileSearchItem[];
		};

class PublicProfileService {
	async getProfile(id: string): Promise<PublicProfile> {
		return await apiClient.get<PublicProfile>(`/profiles/${id}`);
	}

	async searchProfiles(params?: {
		q?: string;
		role?: string;
		page?: number;
		pageSize?: number;
	}): Promise<ProfileSearchResponse> {
		const queryParams: Record<string, string | number> = {};

		if (params?.q?.trim()) queryParams.q = params.q.trim();
		if (params?.role?.trim()) queryParams.role = params.role.trim();
		if (params?.page) queryParams.page = params.page;
		if (params?.pageSize) queryParams.pageSize = params.pageSize;

		const response = await apiClient.get<RawProfileSearchResponse>("/profiles/search", {
			params: queryParams,
		});

		if (Array.isArray(response)) {
			return {
				page: params?.page ?? 1,
				pageSize: params?.pageSize ?? response.length,
				total: response.length,
				results: response,
			};
		}

		return {
			page: response.page ?? response.Page ?? params?.page ?? 1,
			pageSize: response.pageSize ?? response.PageSize ?? params?.pageSize ?? 20,
			total: response.total ?? response.Total ?? 0,
			results: response.results ?? response.Results ?? [],
		};
	}
}

export const publicProfileService = new PublicProfileService();
export default publicProfileService;
