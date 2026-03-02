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
