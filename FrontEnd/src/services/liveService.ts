import apiClient from "./apiClient";
import type { StartLiveResponse, JoinLiveResponse, EndLiveResponse, LiveCard } from "@/services/types";

// ============================================================================
// Live Service — REST API calls only
// ============================================================================

// Shape of what GET /api/Live/active-sessions returns from the backend
interface ActiveSessionRaw {
  liveId: string;
  journalistId: string;
  journalistName: string;
  startedAt: string;
}

class LiveService {
  /**
   * Start a new live session.
   * Matches: POST /api/Live/start-live
   */
  async startLive(): Promise<StartLiveResponse> {
    return apiClient.post<StartLiveResponse>("/Live/start-live");
  }

  /**
   * Verify that a journalist has an active live session and get its ID.
   * Matches: GET /api/Live/join-live/{journalistId}
   *
   * @param journalistId - GUID of the journalist
   * @throws 404 if no active session exists
   */
  async joinLive(journalistId: string): Promise<JoinLiveResponse> {
    return apiClient.get<JoinLiveResponse>(`/Live/join-live/${journalistId}`);
  }

  /**
   * End the journalist's active live session.
   * Matches: POST /api/Live/end-live/{liveId}
   *
   * @param liveId - GUID of the live session to end
   */
  async endLive(liveId: string): Promise<EndLiveResponse> {
    return apiClient.post<EndLiveResponse>(`/Live/end-live/${liveId}`);
  }

  /**
   * Fetch all currently active live sessions.
   *
   * This solves the problem of users who open LivePage AFTER a session
   * has already started — SignalR only delivers new events, so without
   * this call the page would appear empty even when sessions are running.
   *
   * Matches: GET /api/Live/active-sessions
   */
  async getActiveSessions(): Promise<LiveCard[]> {
    const raw = await apiClient.get<ActiveSessionRaw[]>("/Live/active-sessions");
    return raw.map((s) => ({
      liveId: s.liveId,
      journalistId: s.journalistId,
      journalistName: s.journalistName,
      // Generate avatar from journalist name initials as placeholder
      journalistAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.journalistName)}`,
      startedAt: s.startedAt,
    }));
  }
}

export const liveService = new LiveService();
export default liveService;