import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  StopCircle, Loader2, Users,
  Radio, AlertCircle, MessageSquare, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignalR } from "@/hooks/useSignalR";
import { useWebRTCBroadcaster } from "@/hooks/useWebRTCBroadcaster";
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
      name: payload.name ?? "Journalist",
    };
  } catch {
    return null;
  }
}

// ============================================================================
// LiveBroadcastPage
// ============================================================================

/**
 * LiveBroadcastPage
 *
 * The journalist's broadcasting interface. Responsible for:
 *  1. Opening the camera and microphone (WebRTC)
 *  2. Creating and sending the SDP offer to viewers via SignalR
 *  3. Handling incoming SDP answers and ICE candidates from viewers
 *  4. Showing live chat sent by viewers
 *  5. Ending the live session
 *
 * ROUTING:
 *   Navigate here from LivePage after startLive() succeeds:
 *   navigate("/live/broadcast", { state: { liveId } })
 *
 *   Route definition:
 *   <Route path="/live/broadcast" element={<LiveBroadcastPage />} />
 */
const LiveBroadcastPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAuthUser();

  // liveId is passed from LivePage via router state
  const liveId = (location.state as { liveId?: string } | null)?.liveId ?? "";

  // Chat
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);

  // UI
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

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

  // --------------------------------------------------------------------------
  // SignalR — receive WebRTC signals from viewers + chat
  // --------------------------------------------------------------------------

  const { isConnected, sendOffer, sendAnswer, sendIceCandidate, sendComment, followJournalist } =
    useSignalR({
      /**
       * "ReceiveAnswer" — a viewer sent their SDP answer.
       * Pass it to the WebRTC broadcaster to complete the handshake.
       */
      onReceiveAnswer: useCallback(
        (answer: string) => {
          handleAnswer(answer);
        },
        // handleAnswer is defined below — we use a ref trick to avoid circular deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
      ),

      /**
       * "ReceiveIceCandidate" — a viewer sent an ICE candidate.
       */
      onReceiveIceCandidate: useCallback((candidate: string) => {
        handleRemoteIceCandidate(candidate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []),

      /**
       * "ReceiveComment" — a viewer sent a chat message.
       */
      onReceiveComment: useCallback((senderName: string, text: string) => {
        appendUniqueMessage(senderName, text);
      }, [appendUniqueMessage]),

      /**
       * "ViewerJoined" — a viewer opened the watch page after we already went live.
       * Re-send offer so they can complete WebRTC handshake.
       */
      onViewerJoined: useCallback(
        (joinedLiveId: string) => {
          if (joinedLiveId !== liveId) return;
          resendOffer().catch((err) => {
            console.error("[LiveBroadcast] Failed to resend offer:", err);
          });
        },
        // resendOffer is declared below; callback executes later after render
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [liveId]
      ),

      onViewerCountUpdated: useCallback((updatedLiveId: string, count: number) => {
        if (updatedLiveId !== liveId) return;
        setViewerCount(count);
      }, [liveId]),
    });

  // --------------------------------------------------------------------------
  // WebRTC — broadcaster side
  // --------------------------------------------------------------------------

  const {
    webRTCState,
    isCameraMuted,
    isMicMuted,
    localVideoRef,
    startBroadcast,
    stopBroadcast,
    handleAnswer,
    handleRemoteIceCandidate,
    resendOffer,
    toggleCamera,
    toggleMic,
  } = useWebRTCBroadcaster({
    liveId,
    sendOffer,
    sendIceCandidate,
  });

  // --------------------------------------------------------------------------
  // Auto-start on mount
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!liveId) {
      // If no liveId in router state, go back to live page
      navigate("/live");
      return;
    }

    // Join our own SignalR group so we receive viewer signals
    const initBroadcast = async () => {
      try {
        if (user?.userId) {
          await followJournalist(user.userId);
        }

        await startBroadcast();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not access camera or microphone."
        );
      }
    };

    initBroadcast();

    // Cleanup: stop broadcast if the component unmounts (e.g., navigate away)
    return () => {
      stopBroadcast();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  // --------------------------------------------------------------------------
  // End live
  // --------------------------------------------------------------------------

  const handleEndLive = async () => {
    setIsEnding(true);
    try {
      stopBroadcast();
      await liveService.endLive(liveId);
      navigate("/live");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to end live session.");
      setIsEnding(false);
    }
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

  const isLive = webRTCState === "connected";
  const isConnecting = webRTCState === "connecting";

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Live/connecting badge */}
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
              {isConnecting && <Loader2 className="h-3.5 w-3.5 text-white/60 animate-spin" />}
              <span className="text-sm text-white/60">
                {isConnecting ? "Starting…" : "Offline"}
              </span>
            </div>
          )}

          {/* SignalR indicator */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-yellow-500"
          )} title={isConnected ? "Connected" : "Reconnecting…"} />
        </div>

        {/* Viewer count */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Users className="h-4 w-4" />
          <span>{viewerCount} watching</span>
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
                <Button
                  variant="outline"
                  onClick={() => setError(null)}
                  className="text-white border-white/20"
                >
                  Dismiss
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera muted placeholder */}
          {isCameraMuted && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-900">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/40 text-sm">Camera is off</p>
              </div>
            </div>
          )}

          {/* Local video — journalist's own camera preview */}
          <video
            ref={localVideoRef}
            autoPlay
            muted   // muted so the journalist doesn't hear their own echo
            playsInline
            className="w-full max-w-4xl aspect-video rounded-2xl object-cover bg-zinc-900 border border-white/10"
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
                    No messages yet
                  </p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-semibold text-accent">
                        {msg.senderName}
                      </p>
                      <p className="text-sm text-white/80 leading-snug">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="px-3 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  placeholder="Say something…"
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

      {/* ── Bottom controls ───────────────────────────────────────────────────── */}
      <div className="px-6 py-5 bg-zinc-950 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            className={cn(
              "w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isMicMuted
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={isMicMuted ? "Unmute" : "Mute"}
          >
            {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* End live */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndLive}
            disabled={isEnding}
            className="px-8 gap-2 rounded-full"
          >
            {isEnding
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <StopCircle className="h-5 w-5" />}
            End Live
          </Button>

          {/* Camera toggle */}
          <button
            onClick={toggleCamera}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isCameraMuted
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={isCameraMuted ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>

          {/* Chat toggle */}
          <button
            onClick={() => setIsChatOpen((v) => !v)}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isChatOpen
                ? "bg-accent/20 text-accent"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
            title="Toggle chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>

        {isLive && (
          <p className="text-center text-xs text-white/30 mt-3 flex items-center justify-center gap-2">
            <Radio className="h-3 w-3" />
            Broadcasting live to your followers
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveBroadcastPage;