import { AUTH_TOKEN_KEY } from "@/lib/constants";

/**
 * Auth tokens are stored in sessionStorage so each browser tab can keep
 * an independent authenticated user for testing.
 */
export function getAuthToken(): string | null {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  // One-time migration from old localStorage-based auth.
  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (legacyToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  // Keep storage single-source-of-truth and avoid cross-tab auth leakage.
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
