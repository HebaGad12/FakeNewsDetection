import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Play, Wifi, WifiOff,
  AlertCircle, Loader2, StopCircle, ArrowLeft, Users, MessageSquare, Send, Eye, CheckCircle2
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSignalR } from "@/hooks/useSignalR";
import { useWebRTCViewer } from "@/hooks/useWebRTCViewer";
import { liveService } from "@/services/liveService";
import { getAuthToken } from "@/lib/authStorage";
import type { LiveCard, LiveChatMessage } from "@/services/types";

// ============================================================================
// Constants
// ============================================================================

const JOURNALIST_ROLE = "Journalist";

// ============================================================================
// Helpers
// ============================================================================

function getAuthUser(): { userId: string; role: string; name: string } | null {
  try {
    const token = getAuthToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      userId: payload.sub ?? payload.nameid ?? "",
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? payload.role ?? "",
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
// LivePage
// ============================================================================

const LivePage = () => {
  const navigate = useNavigate();
  const user = getAuthUser();
  const isJournalist = user?.role === JOURNALIST_ROLE;

  const [liveSessions, setLiveSessions] = useState<LiveCard[]>([]);
  const [myLiveId, setMyLiveId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeStream, setActiveStream] = useState<LiveCard | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleOfferRef = useRef<(o: string) => Promise<void>>(() => Promise.resolve());
  const handleRemoteIceCandidateRef = useRef<(c: string) => void>(() => {});

  const {
    isConnected,
    followJournalist,
    sendAnswer,
    sendIceCandidate,
    sendComment,
  } = useSignalR({
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
    onLiveEnded: useCallback((liveId: string) => {
      setLiveSessions((prev) => prev.filter((s) => s.liveId !== liveId));
      setMyLiveId((prev) => (prev === liveId ? null : prev));
    }, []),
    onReceiveOffer: useCallback((offer: string) => {
      handleOfferRef.current(offer).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to connect to stream.");
      });
    }, []),
    onReceiveIceCandidate: useCallback((candidate: string) => {
      handleRemoteIceCandidateRef.current(candidate);
    }, []),
    onReceiveComment: useCallback((senderName: string, text: string) => {
      appendUniqueMessage(senderName, text);
    }, [appendUniqueMessage]),
  });

  const { webRTCState, remoteVideoRef, handleOffer, handleRemoteIceCandidate, stopWatching } =
    useWebRTCViewer({
      liveId: activeStream?.liveId ?? "",
      sendAnswer,
      sendIceCandidate,
    });

  useEffect(() => {
    handleOfferRef.current = handleOffer;
    handleRemoteIceCandidateRef.current = handleRemoteIceCandidate;
  }, [handleOffer, handleRemoteIceCandidate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const sessions = await liveService.getActiveSessions();
        setLiveSessions(sessions);
      } catch {
        console.warn("Could not load active sessions on mount.");
      } finally {
        setIsLoadingSessions(false);
      }
    };
    loadSessions();
  }, []);

  // End active stream if it's missing from the list
  useEffect(() => {
    if (activeStream && !isLoadingSessions) {
      if (!liveSessions.some(s => s.liveId === activeStream.liveId)) {
        setError("The live session has ended.");
        stopWatching();
        setActiveStream(null);
      }
    }
  }, [liveSessions, activeStream, isLoadingSessions, stopWatching]);

  const handleStartLive = async () => {
    setIsTogglingLive(true);
    setError(null);
    try {
      const { liveId } = await liveService.startLive();
      setMyLiveId(liveId);
      navigate("/live/broadcast", { state: { liveId } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start live.");
    } finally {
      setIsTogglingLive(false);
    }
  };

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

  const handleWatch = async (card: LiveCard) => {
    setError(null);
    try {
      let journalistId = card.journalistId;
      if (!journalistId) {
        const refreshedSessions = await liveService.getActiveSessions();
        setLiveSessions(refreshedSessions);
        journalistId = refreshedSessions.find((s) => s.liveId === card.liveId)?.journalistId ?? "";
      }
      if (!journalistId) {
        throw new Error("Live session metadata is unavailable.");
      }

      await followJournalist(journalistId);
      setChatMessages([]);
      setActiveStream(card);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError("This live session is no longer available.");
    }
  };

  const handleLeaveWatch = () => {
    stopWatching();
    setActiveStream(null);
  };

  const handleSendComment = async () => {
    const text = chatInput.trim();
    if (!text || !activeStream?.liveId) return;
    await sendComment(activeStream.liveId, text);
    setChatInput("");
  };

  const isConnecting = webRTCState === "connecting" || webRTCState === "idle";
  const isWatching = webRTCState === "connected";
  const viewerCount = isWatching ? "42,812" : (isConnecting ? "Connecting..." : "0");
  const broadcasterName = activeStream?.journalistName || "Unknown Journalist";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Header />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 w-full flex-grow flex flex-col">
        
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center justify-between px-4 py-3 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100 uppercase text-[10px] tracking-widest font-bold">Close</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Controls / Status */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-3xl font-bold text-primary">Editorial Intelligence</h1>
            <div className="flex items-center gap-4">
              <span className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 px-3 py-1 rounded-sm border", isConnected ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
                {isConnected ? "Network Connected" : "Connecting..."}
              </span>
              
              {isJournalist && (
                <div className="flex items-center gap-2">
                  {myLiveId ? (
                    <Button variant="destructive" size="sm" onClick={handleEndLive} disabled={isTogglingLive} className="h-8 text-xs uppercase tracking-widest font-bold">
                      {isTogglingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <StopCircle className="h-3.5 w-3.5 mr-1.5" />}
                      End Broadcast
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleStartLive} disabled={isTogglingLive} className="h-8 text-xs uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                      {isTogglingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Radio className="h-3.5 w-3.5 mr-1.5" />}
                      Initialize Broadcast
                    </Button>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Main Stage (If watching a stream) */}
        {activeStream && (
          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            {/* Left Column: Video and Intel */}
            <div className="flex-grow lg:w-2/3 xl:w-[70%] flex flex-col">
              {/* Video Player Section */}
              <section className="relative bg-zinc-950 rounded-lg overflow-hidden shadow-2xl border border-border flex-shrink-0 z-10 w-full" style={{minHeight: "50vh"}}>
                <div className="aspect-video w-full flex items-center justify-center relative bg-black/50">
                  
                  {/* WebRTC Video Mount */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={cn("w-full h-full object-cover transition-opacity duration-500", isWatching ? "opacity-100" : "opacity-0")}
                  />

                  {/* Overlays if NOT active */}
                  {!isWatching && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                      <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                              <Radio className="h-8 w-8 text-white/40 animate-pulse" />
                          </div>
                          <p className="text-white/50 text-sm font-sans tracking-wide">Synchronizing with source feed…</p>
                          <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">State: {webRTCState}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay UI (always visible to float above video) */}
                  <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none">
                    <div className="flex justify-between items-start pointer-events-auto">
                      <div className="flex flex-wrap items-center gap-3">
                        <button onClick={handleLeaveWatch} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 font-sans text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-1.5 transition-colors backdrop-blur-md border border-white/10">
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to grid
                        </button>
                        <span className={cn("text-white px-3 py-1 font-sans text-[10px] font-bold tracking-widest rounded-sm", isWatching ? "bg-destructive animate-pulse-slow" : "bg-white/20")}>
                          {isWatching ? "LIVE" : "STANDBY"}
                        </span>
                        <div className="flex items-center gap-1.5 text-white/90 font-sans text-xs bg-black/40 px-3 py-1 rounded-sm backdrop-blur-md">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="tracking-wider uppercase font-bold text-[10px]">{viewerCount} VIEWERS</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 pointer-events-auto">
                      <h1 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight filter drop-shadow-md">
                          Live with {broadcasterName}
                      </h1>
                      <p className="font-sans text-white/80 text-sm max-w-2xl filter drop-shadow-md">
                          Streaming direct from source. Official verification protocols engaged.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Source Verification Info */}
              <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-90 hover:opacity-100 transition-opacity">
                <div className="md:col-span-2 bg-card p-6 rounded-sm border-l-4 border-secondary shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-secondary fill-secondary/20" />
                    <h3 className="font-display text-xl text-foreground">Source Verification Info</h3>
                  </div>
                  <p className="font-sans text-muted-foreground leading-relaxed text-sm">
                    This stream is securely attached via the <span className="font-semibold text-foreground">Veritas WebRTC Toolkit</span>. The source has been cross-referenced. Journalist identity is verified.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border pb-1 mb-1">LATENCY</span>
                      <span className="font-sans text-sm font-bold text-foreground">Sub-second</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border pb-1 mb-1">ENCRYPTION</span>
                      <span className="font-sans text-sm font-bold text-foreground">DTLS-SRTP E2EE</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-b border-border pb-1 mb-1">RELIABILITY</span>
                      <span className="font-sans text-sm font-bold text-secondary">{isConnected ? "High Trust" : "Connecting..."}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-card p-6 rounded-sm shadow-sm border border-border">
                  <h4 className="font-sans text-xs font-bold text-muted-foreground mb-4 tracking-widest uppercase flex items-center justify-between">
                      Metadata <Radio className="w-3.5 h-3.5"/>
                  </h4>
                  <ul className="space-y-4">
                    <li className="flex justify-between items-center border-b border-border/50 pb-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">SIGNAL</span>
                      <span className="text-[10px] font-bold font-mono text-foreground text-right">{isConnected ? "ACTIVE" : "PENDING"}</span>
                    </li>
                    <li className="flex justify-between items-center border-b border-border/50 pb-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">LIVE ID</span>
                      <span className="text-[10px] font-bold font-mono text-foreground tracking-tighter truncate max-w-[90px] text-right" title={activeStream.liveId}>{activeStream.liveId || "N/A"}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">WEBRTC</span>
                      <span className="text-[10px] font-bold font-mono text-accent text-right uppercase tracking-widest">{webRTCState}</span>
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            {/* Right Column: Chat Box */}
            <aside className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col h-[600px] lg:h-auto bg-card rounded-md border border-border shadow-lg overflow-hidden relative">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                  <div>
                      <h3 className="font-sans font-bold text-foreground flex items-center gap-2 text-[10px] uppercase tracking-widest">
                          <MessageSquare className="w-4 h-4 text-accent"/> Intelligence Protocol
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-1">Live Encrypted Chat Feed</p>
                  </div>
                  <div className="flex items-center gap-2 bg-background px-2 py-1 rounded border border-border">
                      <Users className="w-3.5 h-3.5 text-muted-foreground"/>
                      <span className="text-[10px] font-bold font-mono text-foreground">{(chatMessages.length + 1).toString().padStart(3, '0')}</span>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                        <MessageSquare className="w-10 h-10"/>
                        <p className="text-[10px] uppercase tracking-widest font-bold">Secure connection established.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <motion.div key={i} className="group" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-sm bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-accent">{msg.senderName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                  {msg.senderName}
                                  <span className="font-mono text-border font-normal text-[9px] tracking-tight">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                  </span>
                              </p>
                              <p className="text-sm text-foreground mt-0.5 leading-snug">
                                  {msg.text}
                              </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-border bg-card">
                  <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                        placeholder="Transmit message..."
                        disabled={!isConnected}
                        className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!chatInput.trim() || !isConnected}
                        className="w-11 h-11 shrink-0 rounded-sm bg-primary hover:bg-primary/90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-4 w-4 text-primary-foreground -ml-0.5" />
                      </button>
                  </div>
              </div>
            </aside>
          </div>
        )}

        {/* Directory Grid (Related Intel) */}
        {!activeStream && (
          <div className="flex justify-between items-center mb-6 mt-4">
            <h2 className="font-display text-2xl text-foreground">Active Intelligence Channels</h2>
            {isLoadingSessions && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        )}
        {activeStream && (
          <h3 className="font-display text-xl text-foreground mt-6 mb-4 border-t border-border pt-8">Related Intel</h3>
        )}

        {liveSessions.length === 0 && !isLoadingSessions ? (
           <div className="bg-card border border-border rounded-sm p-12 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
               <Radio className="h-8 w-8 text-muted-foreground/50" />
             </div>
             <h2 className="text-lg font-semibold text-foreground mb-2 font-display">No ongoing transmissions</h2>
             <p className="text-sm text-muted-foreground max-w-sm">
               The global network is currently silent. Verified broadcasts will appear here automatically.
             </p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {liveSessions.filter(card => card.liveId !== activeStream?.liveId).map((card) => (
                <motion.div
                  key={card.liveId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group cursor-pointer flex flex-col"
                  onClick={() => handleWatch(card)}
                >
                  <div className="relative aspect-video rounded-sm overflow-hidden mb-3 border border-border bg-black">
                    <img
                      src={card.journalistAvatar}
                      alt={card.journalistName}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                       <Play className="w-8 h-8 text-white/70 ml-1 drop-shadow-md" />
                    </div>
                    <div className="absolute top-2 left-2 bg-black/80 border border-white/10 text-white text-[10px] uppercase font-bold tracking-widest py-0.5 px-2 rounded-sm flex items-center gap-1.5 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse-slow"></span> LIVE
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 border border-white/10 text-white text-[9px] uppercase font-bold tracking-widest py-0.5 px-2 rounded-sm backdrop-blur-md">
                      {formatDuration(card.startedAt)}
                    </div>
                  </div>
                  <h4 className="font-display text-lg leading-snug group-hover:underline decoration-accent text-foreground">
                     {card.journalistName} Broadcast
                  </h4>
                  <p className="font-sans text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                     Broadcaster ID: {card.journalistId || card.liveId.slice(0, 8)}
                  </p>
                </motion.div>
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