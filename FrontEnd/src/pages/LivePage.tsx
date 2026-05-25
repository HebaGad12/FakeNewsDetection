import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Play, Wifi, WifiOff, Maximize,
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
    appendUniqueMessage(user?.name || "Viewer", text);
    setChatInput("");
  };

  const isConnecting = webRTCState === "connecting" || webRTCState === "idle";
  const isWatching = webRTCState === "connected";
  const viewerCount = isWatching ? "42,812" : (isConnecting ? "Connecting..." : "0");
  const broadcasterName = activeStream?.journalistName || "Unknown Journalist";

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

        {!activeStream ? (
          <>
            {/* Page Header styled from live-hub */}
            <section className="border-b border-border bg-secondary/30">
              <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
                <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-sm">
                      <span className="w-2 h-2 bg-destructive rounded-full animate-pulse-slow" />
                      Now streaming · {liveSessions.length} live
                    </div>
                    <h1 className="font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
                      Live News &<br />
                      <span className="italic text-foreground/80">Investigations</span>
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                      Join live investigations, exclusive interviews, and breaking news
                      streams from our reporters around the world — in real time.
                    </p>
                  </div>

                  {/* Move Global Controls here when not watching */}
                  <div className="flex flex-col items-start md:items-end gap-4">
                    <span className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 px-3 py-1 rounded-sm border", isConnected ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
                      {isConnected ? "Network Connected" : "Connecting..."}
                    </span>
                    
                    {isJournalist && (
                      <div className="flex items-center gap-2">
                        {myLiveId ? (
                          <Button variant="destructive" size="sm" onClick={handleEndLive} disabled={isTogglingLive} className="h-9 px-4 text-xs uppercase tracking-widest font-bold">
                            {isTogglingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <StopCircle className="h-3.5 w-3.5 mr-1.5" />}
                            End Broadcast
                          </Button>
                        ) : (
                          <Button size="sm" onClick={handleStartLive} disabled={isTogglingLive} className="h-9 px-4 text-xs uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                            {isTogglingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Radio className="h-3.5 w-3.5 mr-1.5" />}
                            Initialize Broadcast
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Grid Content */}
            <div className="mx-auto max-w-[1440px] w-full px-4 py-10 sm:px-6 lg:px-8">
              {isLoadingSessions ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className="aspect-video w-full bg-muted/60 animate-pulse" />
                      <div className="space-y-3 p-5">
                        <div className="h-6 w-3/4 rounded bg-muted/60 animate-pulse" />
                        <div className="h-4 w-1/2 rounded bg-muted/60 animate-pulse" />
                        <div className="flex items-center gap-3 pt-3 mt-4 border-t border-border mt-auto">
                          <div className="h-9 w-9 rounded-full bg-muted/60 animate-pulse" />
                          <div className="h-4 w-1/3 rounded bg-muted/60 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : liveSessions.length === 0 ? (
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center sm:py-24 shadow-sm mt-4">
                  <div className="relative mx-auto flex max-w-md flex-col items-center">
                    <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                      <Radio className="h-9 w-9 text-muted-foreground" />
                    </div>
                    <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                      No Live Sessions Right Now
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                      Live investigations, exclusive interviews, and breaking news streams
                      from our reporters will appear here the moment they go on air.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence>
                    {liveSessions.map((card, i) => (
                      <motion.div
                        key={card.liveId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
                        onClick={() => handleWatch(card)}
                      >
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          <img
                            src={card.journalistAvatar}
                            alt={card.journalistName}
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div
                            aria-hidden
                            className="absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-90"
                          />
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-md bg-black/60 border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur shadow-sm">
                              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse-slow"></span>
                              LIVE
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 text-xs font-semibold text-white/90 drop-shadow-md">
                            {formatDuration(card.startedAt)}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <div className="bg-primary/90 rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                               <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-4 p-5">
                          <div className="space-y-1">
                            <h3 className="font-display text-xl leading-snug text-foreground transition-colors group-hover:text-primary">
                              {card.journalistName} Broadcast
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground uppercase tracking-widest text-[10px] font-semibold">
                              ID: {card.journalistId || card.liveId.slice(0, 8)}
                            </p>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={card.journalistAvatar}
                                alt={card.journalistName}
                                className="h-8 w-8 rounded-full border border-border object-cover"
                              />
                              <span className="font-semibold text-foreground text-sm">
                                {card.journalistName}
                              </span>
                            </div>
                            <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                              Join <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full flex-grow flex flex-col">
            {/* Global Controls / Status for Active Stream Mode */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
                <h1 className="font-display text-3xl font-bold text-foreground">Editorial Intelligence</h1>
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

            <div className="flex flex-col lg:flex-row gap-8 mb-12">
              {/* Left Column: Video and Intel */}
              <div className="flex-grow lg:w-2/3 xl:w-[70%] flex flex-col">
                {/* Video Player Section */}
                <section className="relative bg-zinc-950 rounded-2xl overflow-hidden shadow-xl border border-border flex-shrink-0 z-10 w-full" style={{minHeight: "50vh"}}>
                  <div className="group/video aspect-video w-full flex items-center justify-center relative bg-black/50">
                    
                    {/* WebRTC Video Mount */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className={cn("w-full h-full object-cover transition-opacity duration-500", isWatching ? "opacity-100" : "opacity-0")}
                    />
                    
                    {/* Fullscreen Button */}
                    <div className="absolute top-4 right-4 z-30 pointer-events-auto opacity-0 hover:opacity-100 group-hover/video:opacity-100 transition-opacity">
                      <button 
                        onClick={() => remoteVideoRef.current?.requestFullscreen()}
                        className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                        title="Fullscreen"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>

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
                          <button onClick={handleLeaveWatch} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 font-sans text-xs font-bold tracking-wide rounded-md flex items-center gap-1.5 transition-colors backdrop-blur-md border border-white/10">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to directory
                          </button>
                          <span className={cn("text-white px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1.5", isWatching ? "bg-destructive/90 backdrop-blur" : "bg-white/20 backdrop-blur")}>
                            {isWatching && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-slow"></span>}
                            {isWatching ? "LIVE" : "STANDBY"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 pointer-events-auto mt-auto flex items-end justify-between">
                        <div>
                          <h1 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight filter drop-shadow-md">
                              Live with {broadcasterName}
                          </h1>
                          <p className="font-sans text-white/80 text-sm max-w-2xl filter drop-shadow-md mt-1">
                              Streaming direct from source. Official verification protocols engaged.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Related Intel Grid right under the post if any exist */}
                {liveSessions.length > 1 && (
                  <div className="mt-12 pt-8 border-t border-border">
                    <h3 className="font-display text-2xl text-foreground mb-6">More Live Sessions</h3>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {liveSessions.filter(card => card.liveId !== activeStream.liveId).map((card) => (
                        <div
                          key={card.liveId}
                          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer"
                          onClick={() => handleWatch(card)}
                        >
                          <div className="relative aspect-video overflow-hidden bg-muted">
                            <img
                              src={card.journalistAvatar}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            <div className="absolute left-2 top-2">
                              <span className="rounded bg-destructive/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive-foreground">LIVE</span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="font-display text-lg leading-snug">{card.journalistName}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Chat Box */}
              <aside className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col h-[600px] lg:h-auto bg-card rounded-2xl border border-border shadow-lg overflow-hidden relative">
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
                    <div>
                        <h3 className="font-sans font-bold text-foreground flex items-center gap-2 text-xs">
                            <MessageSquare className="w-4 h-4 text-primary"/> Intelligence Protocol
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Encrypted Feed</p>
                    </div>
                    <div className="flex items-center gap-2 bg-background px-2.5 py-1.5 rounded-md border border-border shadow-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground"/>
                        <span className="text-[10px] font-bold font-mono text-foreground">{(chatMessages.length + 1).toString().padStart(3, '0')}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background/30 scrollbar-thin">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                          <MessageSquare className="w-10 h-10"/>
                          <p className="text-[10px] uppercase tracking-widest font-bold">Secure connection established.</p>
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
                    <div ref={chatEndRef} />
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
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LivePage;
