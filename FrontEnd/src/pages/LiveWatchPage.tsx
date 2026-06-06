import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertCircle,
  Radio, MessageSquare, Send, User, Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignalR } from "@/hooks/useSignalR";
import { useWebRTCViewer } from "@/hooks/useWebRTCViewer";
import { liveService } from "@/services/liveService";
import { userService } from "@/services/userService";
import { getAuthToken } from "@/lib/authStorage";
import type { LiveChatMessage } from "@/services/types";

// ============================================================================
// Helpers
// ============================================================================

function getAuthUser(): { userId: string; name: string } | null {
  try {
    const token = getAuthToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      userId: payload.sub ?? payload.nameid ?? "",
      // Use the real name from the token — NEVER substitute "Viewer"
      name: payload.name ?? payload.unique_name ?? "",
    };
  } catch {
    return null;
  }
}

/** Module-level picture cache: userId → blob URL (or "" for no picture). */
const pictureCache = new Map<string, string>();

async function fetchUserPicture(userId: string): Promise<string> {
  if (!userId) return "";
  if (pictureCache.has(userId)) return pictureCache.get(userId)!;
  try {
    const url = await userService.fetchPictureBlobUrl(userId);
    const result = url ?? "";
    pictureCache.set(userId, result);
    return result;
  } catch {
    pictureCache.set(userId, "");
    return "";
  }
}

function makeId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ============================================================================
// UserAvatar — real picture (if userId known) or dicebear initials fallback
// ============================================================================
interface AvatarProps { userId?: string; senderName: string; className?: string; }

function UserAvatar({ userId, senderName, className }: AvatarProps) {
  const [picUrl, setPicUrl] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (userId) {
      fetchUserPicture(userId).then((url) => { if (mounted.current) setPicUrl(url); });
    }
    return () => { mounted.current = false; };
  }, [userId]);

  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName || "?")}`;
  return (
    <img
      src={picUrl || fallback}
      alt={senderName}
      className={className}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
    />
  );
}

// ============================================================================
// LiveWatchPage
// ============================================================================
/**
 * FIXES:
 *  Issue 1 — Profile pictures: own messages use JWT userId for real picture.
 *             Incoming messages from others use dicebear (backend sends no userId).
 *  Issue 2 — Real name: JWT `name` claim used directly; no "Viewer" label.
 *             Own optimistic insert uses the real JWT name.
 *             SignalR echo from others delivers the backend-resolved real name.
 */
const LiveWatchPage = () => {
  const navigate = useNavigate();
  const { journalistId } = useParams<{ journalistId: string }>();
  const location = useLocation();
  const user = getAuthUser();

  const [liveId, setLiveId] = useState<string>(
    (location.state as { liveId?: string } | null)?.liveId ?? ""
  );

  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const appendMessage = useCallback(
    (senderName: string, text: string, senderId?: string, messageId?: string) => {
      const id = messageId ?? makeId();
      setChatMessages((prev) => {
        if (prev.some((m) => m.messageId === id)) return prev;
        const now = Date.now();
        const isDup = prev.some(
          (m) =>
            m.senderName === senderName &&
            m.text === text &&
            now - new Date(m.timestamp).getTime() < 2000
        );
        if (isDup) return prev;
        return [...prev, { messageId: id, senderId, senderName, text, timestamp: new Date() }];
      });
    },
    []
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --------------------------------------------------------------------------
  // SignalR
  // --------------------------------------------------------------------------
  const { isConnected, followJournalist, sendAnswer, sendIceCandidate, sendComment } =
    useSignalR({
      onReceiveOffer: useCallback((offer: string) => {
        handleOffer(offer).catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to connect to the stream.");
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []),

      onReceiveIceCandidate: useCallback((candidate: string) => {
        handleRemoteIceCandidate(candidate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []),

      // Backend resolves the real senderName from the JWT claim or DB.
      // No senderId in payload — use dicebear for incoming messages.
      onReceiveComment: useCallback(
        (senderName: string, text: string) => {
          appendMessage(senderName, text, undefined, makeId());
        },
        [appendMessage]
      ),

      onLiveEnded: useCallback(
        (endedLiveId: string) => {
          if (endedLiveId === liveId) {
            setError("The journalist has ended this live session.");
          }
        },
        [liveId]
      ),
    });

  // --------------------------------------------------------------------------
  // WebRTC
  // --------------------------------------------------------------------------
  const { webRTCState, remoteVideoRef, handleOffer, handleRemoteIceCandidate, stopWatching } =
    useWebRTCViewer({ liveId, sendAnswer, sendIceCandidate });

  // --------------------------------------------------------------------------
  // Mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!journalistId) { navigate("/live"); return; }

    const init = async () => {
      try {
        let resolvedLiveId = liveId;
        if (!resolvedLiveId) {
          const res = await liveService.joinLive(journalistId);
          resolvedLiveId = res.liveId;
          setLiveId(resolvedLiveId);
        }
        await followJournalist(journalistId);
      } catch {
        setError("No active live session found for this journalist.");
      }
    };

    init();
    return () => { stopWatching(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalistId]);

  // --------------------------------------------------------------------------
  // Leave
  // --------------------------------------------------------------------------
  const handleLeave = async () => {
    setIsLeaving(true);
    stopWatching();
    navigate("/live");
  };

  // --------------------------------------------------------------------------
  // Send chat
  // FIX Issue 2: Optimistic insert uses real JWT name (no "Viewer" label).
  //              Backend resolves real name via ClaimTypes.Name and echoes to others.
  // FIX Issue 1: Own messages carry userId for real profile picture.
  // --------------------------------------------------------------------------
  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !liveId) return;

    const msgId = makeId();
    const senderName = user?.name || "";
    const senderId = user?.userId;

    // Optimistic local insert for the viewer's own message
    appendMessage(senderName, text, senderId, msgId);
    setChatInput("");

    try {
      await sendComment(liveId, text);
    } catch (err) {
      console.error("[LiveWatch] Failed to send comment:", err);
    }
  };

  const isConnecting = webRTCState === "connecting" || webRTCState === "idle";
  const isWatching = webRTCState === "connected";

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeave}
            disabled={isLeaving}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors bg-white/5 px-3 py-1.5 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Leave
          </button>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Watching as</span>
            <span className="text-sm text-white/90 font-medium">{user?.name || "Anonymous"}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {isWatching ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive mb-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white tracking-widest">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-1">
              {isConnecting && <Loader2 className="h-3.5 w-3.5 text-white/60 animate-spin" />}
              <span className="text-sm text-white/60">{isConnecting ? "Connecting…" : "Waiting…"}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/80">
            <User className="h-3.5 w-3.5 text-accent" />
            <span className="text-sm font-medium">
              Broadcaster: {location.state?.journalistName || journalistId || "Unknown Journalist"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-yellow-500")}
            title={isConnected ? "SignalR connected" : "Reconnecting…"}
          />
          <button
            onClick={() => setIsChatOpen((v) => !v)}
            className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", isChatOpen ? "bg-accent/20 text-accent" : "bg-white/10 text-white/60")}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-black">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 px-6 text-center bg-black/90"
              >
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-white text-sm max-w-sm">{error}</p>
                <Button variant="outline" onClick={() => { setError(null); handleLeave(); }} className="text-white border-white/20">
                  Go Back
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {isConnecting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Radio className="h-8 w-8 text-white/40 animate-pulse" />
              </div>
              <p className="text-white/50 text-sm">Waiting for the live stream…</p>
              <p className="text-white/30 text-xs">The video will appear automatically when the journalist broadcasts</p>
            </div>
          )}

          <div className="relative w-full max-w-5xl aspect-video group/video">
            <video ref={remoteVideoRef} autoPlay playsInline
              className="w-full h-full rounded-2xl object-cover bg-zinc-900 border border-white/10" />
            <div className="absolute top-4 right-4 z-30 pointer-events-auto opacity-0 group-hover/video:opacity-100 transition-opacity">
              <button onClick={() => remoteVideoRef.current?.requestFullscreen()}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors" title="Fullscreen">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col bg-zinc-950 border-l border-white/10 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                <p className="text-sm font-medium text-white">Live Chat</p>
                <p className="text-xs text-white/40">{chatMessages.length} messages</p>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-xs text-white/30 mt-8">Be the first to say something</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.messageId} className="flex items-start gap-2">
                      <UserAvatar
                        userId={msg.senderId}
                        senderName={msg.senderName}
                        className="w-6 h-6 rounded-full border border-white/10 object-cover mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-accent">{msg.senderName}</p>
                        <p className="text-sm text-white/80 leading-snug">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="px-3 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  placeholder="Send a message…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent/50"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="h-4 w-4 text-accent-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveWatchPage;