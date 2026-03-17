import { useState, useCallback } from "react";
import { postsService } from "@/services/postsService";
import type { AxiosError } from "axios";

interface UsePostInteractionsOptions {
  postId: string;
  initialLiked?: boolean;
  initialLikesCount?: number;
  initialCommentsCount?: number;
}

interface UsePostInteractionsResult {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  isLiking: boolean;
  isCommenting: boolean;
  error: string | null;
  
  likePost: () => Promise<void>;
  unlikePost: () => Promise<void>;
  toggleLike: () => Promise<void>;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  setIsLiked: (liked: boolean) => void;
  setLikesCount: (count: number) => void;
}

/**
 * Hook for managing post interactions (like, comment, delete comment)
 */
export function usePostInteractions({
  postId,
  initialLiked = false,
  initialLikesCount = 0,
  initialCommentsCount = 0,
}: UsePostInteractionsOptions): UsePostInteractionsResult {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const likePost = useCallback(async () => {
    try {
      setIsLiking(true);
      setError(null);
      
      const result = await postsService.likePost(postId);
      setIsLiked(true);
      setLikesCount(result.likes);
      
      // Refresh the post to get the most accurate likes count from the database
      try {
        const post = await postsService.getPostById(postId);
        if (post) {
          setLikesCount(post.likesCount);
        }
      } catch (refreshError) {
        console.error("Failed to refresh post after like:", refreshError);
        // Keep the count from the API response if refresh fails
      }
    } catch (err) {
      const error = err as AxiosError;
      
      // If already liked (409), refresh the post to get accurate count
      if (error.response?.status === 409) {
        console.log("Post already liked, refreshing count...");
        setIsLiked(true);
        setError(null);
        // Refresh the post to get the current likes count
        try {
          const post = await postsService.getPostById(postId);
          if (post) {
            setLikesCount(post.likesCount);
          }
        } catch (refreshError) {
          console.error("Failed to refresh post:", refreshError);
        }
      } else {
        console.error("Failed to like post:", err);
        setError("Failed to like post");
      }
    } finally {
      setIsLiking(false);
    }
  }, [postId]);

  const unlikePost = useCallback(async () => {
    try {
      setIsLiking(true);
      setError(null);
      
      const result = await postsService.unlikePost(postId);
      setIsLiked(false);
      setLikesCount(result.likes);
      
      // Refresh the post to get the most accurate likes count from the database
      try {
        const post = await postsService.getPostById(postId);
        if (post) {
          setLikesCount(post.likesCount);
        }
      } catch (refreshError) {
        console.error("Failed to refresh post after unlike:", refreshError);
        // Keep the count from the API response if refresh fails
      }
    } catch (err) {
      const error = err as AxiosError;
      
      // If not liked (404), refresh the post to get accurate count
      if (error.response?.status === 404) {
        console.log("Post not liked, refreshing count...");
        setIsLiked(false);
        setError(null);
        // Refresh the post to get the current likes count
        try {
          const post = await postsService.getPostById(postId);
          if (post) {
            setLikesCount(post.likesCount);
          }
        } catch (refreshError) {
          console.error("Failed to refresh post:", refreshError);
        }
      } else {
        console.error("Failed to unlike post:", err);
        setError("Failed to unlike post");
      }
    } finally {
      setIsLiking(false);
    }
  }, [postId]);

  const toggleLike = useCallback(async () => {
    if (isLiking) return;
    
    if (isLiked) {
      await unlikePost();
    } else {
      await likePost();
    }
  }, [isLiked, isLiking, likePost, unlikePost]);

  const addComment = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      
      try {
        setIsCommenting(true);
        setError(null);
        await postsService.addComment(postId, content);
        setCommentsCount((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to add comment:", err);
        setError("Failed to add comment");
        throw err;
      } finally {
        setIsCommenting(false);
      }
    },
    [postId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        setIsCommenting(true);
        setError(null);
        await postsService.deleteComment(postId, commentId);
        setCommentsCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to delete comment:", err);
        setError("Failed to delete comment");
        throw err;
      } finally {
        setIsCommenting(false);
      }
    },
    [postId]
  );

  return {
    isLiked,
    likesCount,
    commentsCount,
    isLiking,
    isCommenting,
    error,
    
    likePost,
    unlikePost,
    toggleLike,
    addComment,
    deleteComment,
    setIsLiked,
    setLikesCount,
  };
}
