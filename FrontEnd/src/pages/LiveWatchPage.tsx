import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertCircle,
  Radio, Users, MessageSquare, Send, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignalR } from "@/hooks/useSignalR";
import { useWebRTCViewer } from "@/hooks/useWebRTCViewer";
import { liveService } from "@/services/liveService";
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
      name: payload.name ?? "Viewer",
    };
  } catch {
    return null;
  }
}

// ============================================================================
// LiveWatchPage
// ============================================================================

/**
 * LiveWatchPage
 *
 * The viewer's watch interface. Responsible for:
 *  1. Joining the journalist's SignalR group (FollowJournalist)
 *  2. Receiving the SDP offer from the journalist via SignalR
 *  3. Creating and sending the SDP answer back via SignalR
 *  4. Exchanging ICE candidates
 *  5. Rendering the incoming live video stream
 *  6. Sending and receiving chat messages
 *
 * ROUTING:
 *   Navigate here from LivePage when a viewer clicks "Watch":
 *   navigate(`/live/watch/${journalistId}`, { state: { liveId } })
 *
 *   Route definition:
 *   <Route path="/live/watch/:journalistId" element={<LiveWatchPage />} />
 */
const LiveWatchPage = () => {
  const navigate = useNavigate();
  const { journalistId } = useParams<{ journalistId: string }>();
  const location = useLocation();
  const user = getAuthUser();

  // liveId can come from router state (passed by LivePage) or be fetched fresh
  const [liveId, setLiveId] = useState<string>(
    (location.state as { liveId?: string } | null)?.liveId ?? ""
  );

  // Chat
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const appendUniqueMessage = useCallback((senderName: string, text: string) => {
    setChatMessages((prev) => {
      const last = prev[prev.length - 1];
      const isDuplicate =
        !!last
        && last.senderName === senderName
        && last.text === text
        && Date.now() - new Date(last.timestamp).getTime() < 1500;

      if (isDuplicate) return prev;
      return [...prev, { senderName, text, timestamp: new Date() }];
    });
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --------------------------------------------------------------------------
  // SignalR — receive WebRTC signals from journalist + chat
  // --------------------------------------------------------------------------

  const {
    isConnected,
    followJournalist,
    sendAnswer,
    sendIceCandidate,
    sendComment,
  } = useSignalR({
    /**
     * "ReceiveOffer" — the journalist sent their SDP offer.
     * Pass it to the WebRTC viewer hook to start the handshake.
     */
    onReceiveOffer: useCallback((offer: string) => {
      handleOffer(offer).catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to connect to the stream."
        );
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),

    /**
     * "ReceiveIceCandidate" — the journalist sent an ICE candidate.
     */
    onReceiveIceCandidate: useCallback((candidate: string) => {
      handleRemoteIceCandidate(candidate);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),

    /**
     * "ReceiveComment" — another viewer or the journalist sent a chat message.
     */
    onReceiveComment: useCallback((senderName: string, text: string) => {
      appendUniqueMessage(senderName, text);
    }, [appendUniqueMessage]),

    /**
     * "LiveEnded" — journalist ended the session while we're watching.
     */
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
  // WebRTC — viewer side
  // --------------------------------------------------------------------------

  const currentLiveId = liveId;

  const { webRTCState, remoteVideoRef, handleOffer, handleRemoteIceCandidate, stopWatching } =
    useWebRTCViewer({
      liveId: currentLiveId,
      sendAnswer,
      sendIceCandidate,
    });

  // --------------------------------------------------------------------------
  // On mount: verify session + join SignalR group
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!journalistId) {
      navigate("/live");
      return;
    }

    const init = async () => {
      try {
        // If we don't have the liveId yet, fetch it from the backend
        let resolvedLiveId = liveId;
        if (!resolvedLiveId) {
          const res = await liveService.joinLive(journalistId);
          resolvedLiveId = res.liveId;
          setLiveId(resolvedLiveId);
        }

        // Join the journalist's SignalR group to receive their offer
        await followJournalist(journalistId);
      } catch {
        setError("No active live session found for this journalist.");
      }
    };

    init();

    return () => {
      stopWatching();
    };
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
  // Send chat message
  // --------------------------------------------------------------------------

  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !liveId) return;

    await sendComment(liveId, text);
    setChatInput("");
  };

  const isConnecting = webRTCState === "connecting" || webRTCState === "idle";
  const isWatching = webRTCState === "connected";

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-white/10 flex-shrink-0">
        {/* Back and Viewer Info */}
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
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Viewer</span>
            <span className="text-sm text-white/90 font-medium">
              {user?.name || "Anonymous Viewer"}
            </span>
          </div>
        </div>

        {/* Live badge & Journalist Info */}
        <div className="flex flex-col items-center">
          {isWatching ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive mb-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white tracking-widest">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-1">
              {isConnecting && <Loader2 className="h-3.5 w-3.5 text-white/60 animate-spin" />}
              <span className="text-sm text-white/60">
                {isConnecting ? "Connecting…" : "Waiting…"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-white/80">
            <User className="h-3.5 w-3.5 text-accent" />
            <span className="text-sm font-medium">
              Broadcaster: {location.state?.journalistName || journalistId || "Unknown Journalist"}
            </span>
          </div>
        </div>

        {/* Chat toggle + connection dot */}
        <div className="flex items-center gap-3">
          <div
            className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-yellow-500")}
            title={isConnected ? "SignalR connected" : "Reconnecting…"}
          />
          <button
            onClick={() => setIsChatOpen((v) => !v)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              isChatOpen ? "bg-accent/20 text-accent" : "bg-white/10 text-white/60"
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-black">
          {/* Error overlay */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 px-6 text-center bg-black/90"
              >
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-white text-sm max-w-sm">{error}</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setError(null); handleLeave(); }}
                    className="text-white border-white/20"
                  >
                    Go Back
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waiting for stream */}
          {isConnecting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Radio className="h-8 w-8 text-white/40 animate-pulse" />
              </div>
              <p className="text-white/50 text-sm">Waiting for the live stream…</p>
              <p className="text-white/30 text-xs">
                The video will appear automatically when the journalist broadcasts
              </p>
            </div>
          )}

          {/**
           * Remote video element.
           * The WebRTC viewer hook attaches the journalist's stream here
           * via: remoteVideoRef.current.srcObject = event.streams[0]
           * This happens automatically when the peer connection's ontrack fires.
           */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full max-w-5xl aspect-video rounded-2xl object-cover bg-zinc-900 border border-white/10"
          />
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col bg-zinc-950 border-l border-white/10 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                <p className="text-sm font-medium text-white">Live Chat</p>
                <p className="text-xs text-white/40">{chatMessages.length} messages</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-xs text-white/30 mt-8">
                    Be the first to say something
                  </p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-semibold text-accent">
                        {msg.senderName}
                      </p>
                      <p className="text-sm text-white/80 leading-snug">{msg.text}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
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