import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Play, Wifi, WifiOff,
  AlertCircle, Loader2, StopCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignalR } from "@/hooks/useSignalR";
import { liveService } from "@/services/liveService";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import type { LiveCard } from "@/services/types";

// ============================================================================
// Constants
// ============================================================================

const JOURNALIST_ROLE = "Journalist";

// ============================================================================
// Helpers
// ============================================================================

function getAuthUser(): { userId: string; role: string; name: string } | null {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      userId: payload.sub ?? payload.nameid ?? "",
      role:
        payload[
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] ?? payload.role ?? "",
      name: payload.name ?? "",
    };
  } catch {
    return null;
  }
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Just started";
  if (min < 60) return `Live for ${min}m`;
  return `Live for ${Math.floor(min / 60)}h ${min % 60}m`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface LiveCardProps {
  card: LiveCard;
  onWatch: (card: LiveCard) => void;
}

const LiveStreamCard = ({ card, onWatch }: LiveCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all"
  >
    {/* Thumbnail */}
    <div className="relative aspect-video bg-muted flex items-center justify-center">
      <Radio className="h-12 w-12 text-muted-foreground/30" />

      {/* LIVE badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-semibold text-white tracking-wide">LIVE</span>
      </div>

      {/* Hover play overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 cursor-pointer"
        onClick={() => onWatch(card)}
      >
        <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center">
          <Play className="h-7 w-7 text-accent-foreground ml-0.5" />
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground">{formatDuration(card.startedAt)}</p>
      <div className="flex items-center gap-3">
        <img
          src={card.journalistAvatar}
          alt={card.journalistName}
          className="w-9 h-9 rounded-full object-cover border border-border"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {card.journalistName}
          </p>
          <p className="text-xs text-muted-foreground">Journalist</p>
        </div>
        <Button size="sm" onClick={() => onWatch(card)}>
          Watch
        </Button>
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// Main Page
// ============================================================================

/**
 * LivePage — /live
 *
 * On mount: fetches all currently active sessions via GET /api/Live/active-sessions
 * so users who open the page mid-session see the existing streams.
 *
 * After mount: SignalR keeps the list up to date in real-time
 * by adding/removing cards when "LiveStarted" / "LiveEnded" events arrive.
 */
const LivePage = () => {
  const navigate = useNavigate();
  const user = getAuthUser();
  const isJournalist = user?.role === JOURNALIST_ROLE;

  const [liveSessions, setLiveSessions] = useState<LiveCard[]>([]);
  const [myLiveId, setMyLiveId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Load existing sessions on mount
  // --------------------------------------------------------------------------

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const sessions = await liveService.getActiveSessions();
        setLiveSessions(sessions);
      } catch {
        // Not a critical error — SignalR will still deliver new sessions
        console.warn("Could not load active sessions on mount.");
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadSessions();
  }, []);

  // --------------------------------------------------------------------------
  // SignalR — real-time updates
  // --------------------------------------------------------------------------

  const { isConnected } = useSignalR({
    /**
     * "LiveStarted" — a journalist started a new session.
     * Add it to the list if not already present.
     */
    onLiveStarted: useCallback((liveId: string) => {
      setLiveSessions((prev) => {
        if (prev.some((s) => s.liveId === liveId)) return prev;
        return [
          {
            liveId,
            journalistId: "",
            journalistName: "Journalist",
            journalistAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${liveId}`,
            startedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    }, []),

    /**
     * "LiveEnded" — a journalist ended their session.
     * Remove the card from the list.
     */
    onLiveEnded: useCallback((liveId: string) => {
      setLiveSessions((prev) => prev.filter((s) => s.liveId !== liveId));
      setMyLiveId((prev) => (prev === liveId ? null : prev));
    }, []),
  });

  // --------------------------------------------------------------------------
  // Journalist: Start live
  // --------------------------------------------------------------------------

  const handleStartLive = async () => {
    setIsTogglingLive(true);
    setError(null);
    try {
      const { liveId } = await liveService.startLive();
      setMyLiveId(liveId);
      // Navigate to broadcast page, pass liveId via router state
      navigate("/live/broadcast", { state: { liveId } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start live.");
    } finally {
      setIsTogglingLive(false);
    }
  };

  // --------------------------------------------------------------------------
  // Journalist: End live
  // --------------------------------------------------------------------------

  const handleEndLive = async () => {
    if (!myLiveId) return;
    setIsTogglingLive(true);
    setError(null);
    try {
      await liveService.endLive(myLiveId);
      setMyLiveId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to end live.");
    } finally {
      setIsTogglingLive(false);
    }
  };

  // --------------------------------------------------------------------------
  // Viewer: Watch live
  // --------------------------------------------------------------------------

  const handleWatch = async (card: LiveCard) => {
    setError(null);
    try {
      // Verify the session is still active before navigating
      const res = await liveService.joinLive(card.journalistId || card.liveId);
      navigate(`/live/watch/${res.journalistId}`, {
        state: { liveId: res.liveId },
      });
    } catch {
      setError("This live session is no longer available.");
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium text-destructive">LIVE</span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">
                  Live Streams
                </h1>
              </div>
              <p className="text-muted-foreground">
                Watch verified journalists report news in real-time
              </p>
            </div>

            {/* SignalR connection status */}
            <div
              className={cn(
                "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border",
                isConnected
                  ? "border-green-500/30 text-green-600 bg-green-500/10"
                  : "border-muted text-muted-foreground"
              )}
            >
              {isConnected
                ? <><Wifi className="h-3.5 w-3.5" /> Connected</>
                : <><WifiOff className="h-3.5 w-3.5" /> Connecting…</>}
            </div>
          </div>

          {/* Journalist controls */}
          {isJournalist && (
            <div className="mt-6 p-4 rounded-xl border border-border bg-card flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {myLiveId ? "You are currently live" : "Start a live session"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {myLiveId
                    ? "End the session when you're done."
                    : "Go live so your followers can watch in real-time."}
                </p>
              </div>

              {myLiveId ? (
                <Button
                  variant="destructive"
                  onClick={handleEndLive}
                  disabled={isTogglingLive}
                  className="gap-2"
                >
                  {isTogglingLive
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <StopCircle className="h-4 w-4" />}
                  End Live
                </Button>
              ) : (
                <Button
                  onClick={handleStartLive}
                  disabled={isTogglingLive}
                  className="gap-2"
                >
                  {isTogglingLive
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Radio className="h-4 w-4" />}
                  Go Live
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sessions grid */}
        {isLoadingSessions ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="h-2 w-20 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : liveSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Radio className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No live sessions right now
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Sessions appear automatically when journalists go live.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {liveSessions.map((card) => (
                <LiveStreamCard key={card.liveId} card={card} onWatch={handleWatch} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LivePage;