/**
 * Type definitions for API requests and responses
 * These should match your backend DTOs
 */

// Common Types
export enum Role {
  Regular = 0,
  Journalist = 1,
  Organization = 2,
  Admin = 3,
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Registration request payload
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  organizationLicense?: string;
  journalistId?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * User profile response (from /me endpoint)
 */
export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * Extended user profile with social stats
 */
export interface UserProfileExtended {
  id: string;
  name: string;
  email: string;
  role: string;
  followersCount: number;
  followingCount: number;
}

/**
 * Edit user profile request
 */
export interface EditProfileRequest {
  name: string;
  email: string;
  profile?: string;
}

export interface EditProfileResponse {
  id: string;
  name: string;
  email: string;
  profile?: string | null;
}

/**
 * User overview statistics
 */
export interface UserOverview {
  likes: number;
  comments: number;
  reports: number;
  helpfulReports: number;
  followingJournalists: number;
}

/**
 * Following user item
 */
export interface FollowingUser {
  id: string;
  name: string;
  role: string;
  organizationName?: string;
  followersCount: number;
  recentPostsCount: number;
  memberSince: string;
}

/**
 * Report post request
 */
export interface ReportPostRequest {
  reason: string;
}

export interface FollowActionResponse {
  followers: number;
}

export interface ReportPostResponse {
  reports: number;
}

/**
 * User activity item
 */
export interface UserActivity {
  actionType: string;
  target: string;
  timestamp: string;
}
