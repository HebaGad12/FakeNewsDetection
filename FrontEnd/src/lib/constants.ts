// App Configuration
export const APP_NAME = "TruthTrack";
export const APP_DESCRIPTION = "AI-Powered News Verification Platform";
export const APP_URL = "https://truthtrack.com";

// API Configuration (placeholder for future backend)
export const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:3000/api";
export const API_TIMEOUT = 30000; // 30 seconds

// Auth Configuration
export const AUTH_TOKEN_KEY = "truthtrack_auth_token";
export const AUTH_USER_KEY = "truthtrack_user";

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// Credibility Levels
export const CREDIBILITY_LEVELS = {
  VERIFIED: { min: 70, label: "Verified", color: "verified" },
  QUESTIONABLE: { min: 40, label: "Questionable", color: "questionable" },
  FAKE: { min: 0, label: "Fake", color: "fake" },
} as const;

// Article Categories
export const ARTICLE_CATEGORIES = [
  "Politics",
  "Technology",
  "Science",
  "Health",
  "Environment",
  "Economy",
  "Sports",
  "Entertainment",
] as const;

// User Roles
export const USER_ROLES = {
  VIEWER: "viewer",
  JOURNALIST: "journalist",
  ORGANIZATION: "organization",
  ADMIN: "admin",
} as const;

// File Upload Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

// Social Media Links (placeholder)
export const SOCIAL_LINKS = {
  twitter: "https://twitter.com/truthtrack",
  facebook: "https://facebook.com/truthtrack",
  linkedin: "https://linkedin.com/company/truthtrack",
  github: "https://github.com/truthtrack",
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_LIVE_STREAMS: true,
  ENABLE_COMMUNITIES: true,
  ENABLE_DONATIONS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
} as const;

// Toast Configuration
export const TOAST_DURATION = 3000; // 3 seconds
export const TOAST_ERROR_DURATION = 5000; // 5 seconds

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
