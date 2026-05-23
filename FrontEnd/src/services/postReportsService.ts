import apiClient from "./apiClient";

export interface PostReportItem {
	id: string;
	reporterName: string;
	reporterRole: string;
	reason: string;
	reportedAt: string;
}

export interface PostReportSummary {
	postId: string;
	title: string;
	authorName: string;
	authorId: string;
	organizationName?: string;
	moderationStatus: string;
	verificationStatus: string;
	createdAt: string;
	likes: number;
	comments: number;
	totalReports: number;
	reports: PostReportItem[];
	totalFollowers: number;
	totalArticles: number;
}

class PostReportsService {
	async getPostReports(): Promise<PostReportSummary[]> {
		return await apiClient.get<PostReportSummary[]>("/reports/posts");
	}

	async getPostReportById(postId: string): Promise<PostReportSummary> {
		return await apiClient.get<PostReportSummary>(`/reports/posts/${postId}`);
	}

}
export const postReportsService = new PostReportsService();
export default postReportsService;