/**
 * Type definitions for API requests and responses.
 * These match the backend DTOs and SignalR event payloads.
 */

// ============================================================================
// Common
// ============================================================================

export enum Role {
  Regular = 0,
  Journalist = 1,
  Organization = 2,
  Admin = 3,
}

// ============================================================================
// Auth
// ============================================================================

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  organizationLicense?: string;
  journalistId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// User
// ============================================================================

export interface UserProfileExtended {
  id: string;
  name: string;
  email: string;
  role: string;
  followersCount: number;
  followingCount: number;
}

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

export interface UserOverview {
  likes: number;
  comments: number;
  reports: number;
  helpfulReports: number;
  followingJournalists: number;
}

export interface FollowingUser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  avatar: any;
  id: string;
  name: string;
  role: string;
  organizationName?: string;
  followersCount: number;
  recentPostsCount: number;
  memberSince: string;
}

export interface ReportPostRequest {
  reason: string;
}

export interface FollowActionResponse {
  followers: number;
}

export interface ReportPostResponse {
  reports: number;
}

export interface UserActivity {
  postId: string;
  actionType: string;
  target: string;
  timestamp: string;
}

// ============================================================================
// Live — REST API types
// ============================================================================

/**
 * Response from POST /api/Live/start-live
 */
export interface StartLiveResponse {
  message: string;
  liveId: string;
}

/**
 * Response from GET /api/Live/join-live/{journalistId}
 */
export interface JoinLiveResponse {
  liveId: string;
  journalistId: string;
}

/**
 * Response from POST /api/Live/end-live/{liveId}
 */
export interface EndLiveResponse {
  message: string;
}

// ============================================================================
// Live — UI display type
// ============================================================================

/**
 * A live session card shown in the sessions list grid.
 * journalistName / journalistAvatar come from the journalist's profile
 * (fetched separately) or are enriched by the backend in the future.
 */
export interface LiveCard {
  /** Live session GUID — used as the WebRTC / SignalR group channel name */
  liveId: string;
  /** Journalist's user GUID */
  journalistId: string;
  /** Display name */
  journalistName: string;
  /** Avatar URL or placeholder */
  journalistAvatar: string;
  /** UTC ISO when the session started */
  startedAt: string;
}

// ============================================================================
// Live — SignalR event payloads
// ============================================================================

/**
 * Fired by the backend (LiveController) when a journalist starts a session.
 * SignalR event name: "LiveStarted"
 * Payload: liveId (Guid → string)
 */
export interface LiveStartedEvent {
  liveId: string;
}

/**
 * Fired by the backend (LiveController) when a journalist ends a session.
 * SignalR event name: "LiveEnded"
 * Payload: liveId (Guid → string)
 */
export interface LiveEndedEvent {
  liveId: string;
}

// ============================================================================
// Live — WebRTC state
// ============================================================================

/**
 * Possible states of the WebRTC peer connection.
 */
export type WebRTCState =
  | "idle"          // No connection attempted yet
  | "connecting"    // Setting up the peer connection
  | "connected"     // Media is flowing
  | "disconnected"  // Connection dropped
  | "error";        // Unrecoverable error

/**
 * A chat message received during a live session.
 * Sent via SignalR hub method SendComment / event ReceiveComment.
 */
export interface LiveChatMessage {
  /** Unique message ID used for deduplication */
  messageId: string;
  /** User GUID of the sender — present for own messages; absent for incoming SignalR messages (backend doesn't send it) */
  senderId?: string;
  /** Display name of the sender */
  senderName: string;
  /** Message text */
  text: string;
  /** Client-side timestamp */
  timestamp: Date;
}