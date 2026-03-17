import apiClient from "./apiClient";
import { API_BASE_URL } from "@/lib/constants";
import type { AxiosError } from "axios";

export const POST_DELETED_EVENT = "post:deleted";

declare global {
  interface WindowEventMap {
    "post:deleted": CustomEvent<{ postId: string }>;
  }
}

// ────── TypeScript Interfaces ──────

/**
 * Media attached to a post
 */
export interface PostMedia {
  mediaId: string;
  path: string;
  mediaType: string;
  isCopyrighted: boolean;
  uploadedAt: string;
}

/**
 * Comment on a post
 */
export interface PostComment {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

/**
 * Post/Article from API
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorName: string;
  authorId: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  comments: PostComment[];
  media: PostMedia[];
}

/**
 * Request body for adding a comment
 */
export interface AddCommentRequest {
  content: string;
}

// ────── Posts Service ──────

class PostsService {
  private baseUrl = "/posts";

  /**
   * Helper: Convert relative image path to full URL
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath; // Already full URL
    // Remove /api from API_BASE_URL and append the image path
    const baseWithoutApi = API_BASE_URL.replace("/api", "");
    return `${baseWithoutApi}/${imagePath}`;
  }

  /**
   * Get all posts for the feed
   * GET /api/posts
   */
  async getAllPosts(): Promise<Post[]> {
    try {
      const response = await apiClient.get<Post[]>(this.baseUrl);
      return response || [];
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      throw error;
    }
  }

  /**
   * Get a single post by ID
   * Fetches all posts and filters by ID
   */
  async getPostById(postId: string): Promise<Post | null> {
    try {
      const posts = await this.getAllPosts();
      return posts.find((post) => post.id === postId) || null;
    } catch (error) {
      console.error(`Failed to fetch post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Like a post
   * POST /api/posts/{postId}/like
   * Returns: { likes: number }
   * Throws on error (409 = already liked, other = network/server error)
   */
  async likePost(postId: string): Promise<{ likes: number }> {
    const response = await apiClient.post<{ Likes?: number; LikesCount?: number }>(
      `${this.baseUrl}/${postId}/like`
    );
    const likesCount = response.Likes !== undefined ? response.Likes : (response.LikesCount ?? 0);
    return { likes: likesCount };
  }

  /**
   * Remove like from a post (unlike)
   * DELETE /api/posts/{postId}/like
   * Returns: { likes: number }
   * Throws on error (404 = not liked, other = network/server error)
   */
  async unlikePost(postId: string): Promise<{ likes: number }> {
    const response = await apiClient.delete<{ Likes?: number; LikesCount?: number }>(
      `${this.baseUrl}/${postId}/like`
    );
    const likesCount = response.Likes !== undefined ? response.Likes : (response.LikesCount ?? 0);
    return { likes: likesCount };
  }

  /**
   * Check if current user has liked a specific post
   * GET /api/user/activity
   * Filters user's likes to find if they've liked this post
   */
  async hasUserLikedPost(postId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<any[]>("/user/activity");
      if (!Array.isArray(response)) return false;
      
      return response.some((activity: any) => 
        activity.actionType === "Like" && activity.postId === postId
      );
    } catch (error) {
      console.error(`Failed to check if user liked post ${postId}:`, error);
      return false; // Default to not liked if we can't check
    }
  }



  /**
   * Add a comment to a post
   * POST /api/posts/{postId}/comment
   */
  async addComment(postId: string, content: string): Promise<PostComment> {
    try {
      const request: AddCommentRequest = { content };
      const response = await apiClient.post<PostComment>(
        `${this.baseUrl}/${postId}/comment`,
        request
      );
      return response;
    } catch (error) {
      console.error(`Failed to add comment to post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a comment from a post
   * DELETE /api/posts/{postId}/comment/{commentId}
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${postId}/comment/${commentId}`);
    } catch (error) {
      console.error(
        `Failed to delete comment ${commentId} from post ${postId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a post
   * DELETE /api/journalist/posts/{postId}
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/journalist/posts/${postId}`);
      window.dispatchEvent(new CustomEvent(POST_DELETED_EVENT, { detail: { postId } }));
    } catch (error) {
      console.error(`Failed to delete post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Transform Post to NewsCard props
   * Maps Post data to the format expected by NewsCard component
   */
  postToNewsCardProps(post: Post, userLikedPost?: boolean) {
    return {
      id: post.id,
      title: post.title,
      excerpt: post.content.substring(0, 150) + "...", // Truncate for preview
      author: post.authorName,
      organization: post.organizationName,
      image: post.media?.[0]?.path 
        ? this.getImageUrl(post.media[0].path) 
        : "https://images.unsplash.com/photo-1557804506-669714131143?w=800",
      category: post.tags?.[0] || "News",
      credibility: "verified" as const, // TODO: Determine based on fact-check data
      credibilityScore: 85, // TODO: Calculate from actual data
      readTime: this.estimateReadTime(post.content),
      views: 0, // TODO: Add view count to API response
      comments: post.comments.length,
      publishedAt: this.formatRelativeTime(post.createdAt),
      featured: post.media && post.media.length > 0,
    };
  }

  /**
   * Helper: Estimate read time based on word count
   */
  private estimateReadTime(content: string): string {
    const wordCount = content.split(/\s+/).length;
    const readTimeMinutes = Math.ceil(wordCount / 200); // Average 200 words per minute
    return `${readTimeMinutes} min read`;
  }

  /**
   * Helper: Format timestamp to relative time (e.g., "2 hours ago")
   */
  private formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  }
}

export const postsService = new PostsService();
export default postsService;