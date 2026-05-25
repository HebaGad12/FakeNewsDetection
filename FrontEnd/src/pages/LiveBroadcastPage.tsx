import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  StopCircle, Loader2, Users,
  Radio, AlertCircle, MessageSquare, Send, Maximize,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
    appendUniqueMessage(user?.name || "Journalist", text);
    setChatInput("");
  };

  const isLive = webRTCState === "connected";
  const isConnecting = webRTCState === "connecting";

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Header />

      <main className="flex-grow flex flex-col w-full">
        {/* Error banner */}
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 flex items-center justify-between px-4 py-3 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
                <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 uppercase text-[10px] tracking-widest font-bold">Close</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full flex-grow flex flex-col">
          {/* Global Controls / Status */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
              <h1 className="font-display text-3xl font-bold text-foreground">Editorial Intelligence</h1>
              <div className="flex items-center gap-4">
                <span className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 px-3 py-1 rounded-sm border", isConnected ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
                  {isConnected ? "Network Connected" : "Connecting..."}
                </span>
                
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={handleEndLive} disabled={isEnding} className="h-8 text-xs uppercase tracking-widest font-bold">
                    {isEnding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <StopCircle className="h-3.5 w-3.5 mr-1.5" />}
                    End Broadcast
                  </Button>
                </div>
              </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            {/* Left Column: Video */}
            <div className="flex-grow lg:w-2/3 xl:w-[70%] flex flex-col">
              <section className="relative bg-zinc-950 rounded-2xl overflow-hidden shadow-xl border border-border flex-shrink-0 z-10 w-full" style={{minHeight: "50vh"}}>
                <div className="group/video aspect-video w-full flex items-center justify-center relative bg-black/50">
                  
                  {/* Camera muted placeholder & button */}
                  {isCameraMuted && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-zinc-900 pointer-events-auto">
                      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                        <VideoOff className="h-8 w-8 text-white/40" />
                      </div>
                      <p className="text-white/40 text-sm mb-6">Camera is currently turned off</p>
                      <Button onClick={toggleCamera} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                        <Video className="w-4 h-4 mr-2" />
                        Re-open Camera
                      </Button>
                    </div>
                  )}

                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn("w-full h-full object-cover transition-opacity duration-500", isLive ? "opacity-100" : "opacity-0")}
                  />
                  
                  {/* Fullscreen Button */}
                  <div className="absolute top-4 right-4 z-30 pointer-events-auto opacity-0 hover:opacity-100 group-hover/video:opacity-100 transition-opacity">
                    <button 
                      onClick={() => localVideoRef.current?.requestFullscreen()}
                      className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>

                  {!isLive && !isCameraMuted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                      <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                              <Radio className="h-8 w-8 text-white/40 animate-pulse" />
                          </div>
                          <p className="text-white/50 text-sm font-sans tracking-wide">Starting broadcast…</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none">
                    <div className="flex justify-between items-start pointer-events-auto">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cn("text-white px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1.5", isLive ? "bg-destructive/90 backdrop-blur" : "bg-white/20 backdrop-blur")}>
                          {isLive && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-slow"></span>}
                          {isLive ? "LIVE" : "STARTING"}
                        </span>
                        
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-2 py-1 rounded-md backdrop-blur-sm ml-2">
                          <Users className="w-3.5 h-3.5 text-white/70" />
                          <span className="text-[10px] text-white/90 font-bold">{viewerCount} watching</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pointer-events-auto mt-auto flex items-end justify-between w-full">
                      <div>
                        <h1 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight filter drop-shadow-md">
                            Your Live Broadcast
                        </h1>
                      </div>
                      
                      {/* Broadcaster controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={toggleMic}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            isMicMuted
                              ? "bg-destructive text-white hover:bg-destructive/90"
                              : "bg-white/20 text-white hover:bg-white/30 backdrop-blur"
                          )}
                          title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={toggleCamera}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            isCameraMuted
                              ? "bg-destructive text-white hover:bg-destructive/90"
                              : "bg-white/20 text-white hover:bg-white/30 backdrop-blur"
                          )}
                          title={isCameraMuted ? "Turn on Camera" : "Turn off Camera"}
                        >
                          {isCameraMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Chat Box */}
            <aside className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col h-[600px] lg:h-auto bg-card rounded-2xl border border-border shadow-lg overflow-hidden relative">
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
                  <div>
                      <h3 className="font-sans font-bold text-foreground flex items-center gap-2 text-xs">
                          <MessageSquare className="w-4 h-4 text-primary"/> Live Chat
                      </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background px-2.5 py-1.5 rounded-md border border-border shadow-sm">
                      <span className="text-[10px] font-bold font-mono text-foreground">{chatMessages.length} msgs</span>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background/30 scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                        <MessageSquare className="w-10 h-10"/>
                        <p className="text-[10px] uppercase tracking-widest font-bold">No messages yet.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <motion.div key={i} className="group" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
                        <div className="flex items-start gap-3">
                          <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`}
                              alt={msg.senderName}
                              className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center flex-shrink-0 object-cover"
                          />
                          <div className="flex-1 bg-muted/40 p-3 rounded-2xl rounded-tl-sm border border-border/50">
                              <div className="flex justify-between items-center mb-1">
                                  <p className="text-[10px] font-bold text-foreground tracking-wide">
                                      {msg.senderName}
                                  </p>
                                  <span className="font-mono text-muted-foreground font-normal text-[9px]">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </div>
                              <p className="text-sm text-foreground/90 leading-snug">
                                  {msg.text}
                              </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
              </div>

              <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2 relative">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                        placeholder="Transmit message..."
                        disabled={!isConnected}
                        className="flex-1 bg-background border border-border rounded-full pl-4 pr-12 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!chatInput.trim() || !isConnected}
                        className="absolute right-1 top-1 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-3.5 w-3.5 text-primary-foreground -ml-0.5" />
                      </button>
                  </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LiveBroadcastPage;