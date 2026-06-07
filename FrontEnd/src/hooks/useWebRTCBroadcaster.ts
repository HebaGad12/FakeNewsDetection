import { useRef, useState, useCallback } from "react";
import { STUN_SERVERS } from "@/lib/constants";
import type { WebRTCState } from "@/services/types";

// ============================================================================
// Types
// ============================================================================

interface UseWebRTCBroadcasterOptions {
  /** liveId used as the channel identifier for signaling */
  liveId: string;
  /**
   * Send a WebRTC offer to a specific viewer via SignalR.
   * viewerConnectionId identifies the target viewer's SignalR connection.
   */
  sendOffer: (liveId: string, offer: string, viewerConnectionId: string) => Promise<void>;
  /**
   * Send an ICE candidate to a specific viewer via SignalR.
   * targetConnectionId routes the candidate to the correct peer.
   */
  sendIceCandidate: (liveId: string, candidate: string, targetConnectionId?: string) => Promise<void>;
}

interface UseWebRTCBroadcasterReturn {
  webRTCState: WebRTCState;
  isCameraMuted: boolean;
  isMicMuted: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  startBroadcast: () => Promise<void>;
  stopBroadcast: () => void;
  /**
   * Create a new dedicated RTCPeerConnection for the given viewer and send them an offer.
   * Called by LiveBroadcastPage when ViewerJoined fires.
   */
  handleViewerJoined: (viewerConnectionId: string) => Promise<void>;
  /**
   * Handle the SDP answer from a specific viewer.
   * viewerConnectionId identifies which peer connection to update.
   */
  handleAnswer: (answer: string, viewerConnectionId: string) => Promise<void>;
  /**
   * Handle an ICE candidate from a specific viewer.
   * viewerConnectionId identifies which peer connection to add it to.
   */
  handleRemoteIceCandidate: (candidate: string, viewerConnectionId: string) => Promise<void>;
  /**
   * Clean up the peer connection for a viewer who has left.
   */
  handleViewerLeft: (viewerConnectionId: string) => void;
  toggleCamera: () => void;
  toggleMic: () => void;
}

// ============================================================================
// Hook — Journalist (Broadcaster) side
// ============================================================================

/**
 * useWebRTCBroadcaster
 *
 * Multi-viewer architecture:
 *  - One RTCPeerConnection per viewer, stored in peerConnectionsRef (Map<viewerConnId, pc>)
 *  - When a viewer joins (handleViewerJoined): create new PC, add tracks, send targeted offer
 *  - When viewer answers (handleAnswer): set remote description on that viewer's PC
 *  - When viewer ICE candidate arrives (handleRemoteIceCandidate): add to that viewer's PC
 *  - When viewer leaves (handleViewerLeft): close and remove that PC
 *
 * WebRTC flow per viewer:
 *   handleViewerJoined(viewerConnectionId)
 *     → new RTCPeerConnection
 *     → addTrack (video + audio from local stream)
 *     → createOffer → setLocalDescription
 *     → sendOffer(liveId, offer, viewerConnectionId)
 *   handleAnswer(answer, viewerConnectionId)
 *     → peerConnectionsRef.get(viewerConnectionId).setRemoteDescription
 *   handleRemoteIceCandidate(candidate, viewerConnectionId)
 *     → peerConnectionsRef.get(viewerConnectionId).addIceCandidate
 */
export function useWebRTCBroadcaster({
  liveId,
  sendOffer,
  sendIceCandidate,
}: UseWebRTCBroadcasterOptions): UseWebRTCBroadcasterReturn {
  const [webRTCState, setWebRTCState] = useState<WebRTCState>("idle");
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Map: viewerConnectionId → RTCPeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // --------------------------------------------------------------------------
  // Create a peer connection for one viewer and send them an offer
  // --------------------------------------------------------------------------

  const createPeerForViewer = useCallback(async (viewerConnectionId: string) => {
    const stream = localStreamRef.current;
    if (!stream) {
      console.warn("[WebRTC Broadcaster] No local stream yet, cannot create peer for", viewerConnectionId);
      return;
    }

    // Clean up any stale connection for this viewer
    const existing = peerConnectionsRef.current.get(viewerConnectionId);
    if (existing) {
      existing.close();
      peerConnectionsRef.current.delete(viewerConnectionId);
    }

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peerConnectionsRef.current.set(viewerConnectionId, pc);

    // Add all local tracks to this viewer's peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // ICE candidates for this viewer are sent ONLY to them
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await sendIceCandidate(
            liveId,
            JSON.stringify(event.candidate.toJSON()),
            viewerConnectionId  // ← targeted: only this viewer gets this candidate
          );
        } catch (err) {
          console.error(`[WebRTC Broadcaster] ICE send to ${viewerConnectionId} failed:`, err);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC Broadcaster] Peer ${viewerConnectionId}: ${state}`);
      if (state === "failed" || state === "closed") {
        // Clean up this viewer's PC but keep the broadcaster LIVE
        peerConnectionsRef.current.delete(viewerConnectionId);
      }
    };

    // Create and send the targeted offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendOffer(liveId, JSON.stringify(offer), viewerConnectionId);
  }, [liveId, sendOffer, sendIceCandidate]);

  // --------------------------------------------------------------------------
  // Start broadcast — get media, show preview
  // --------------------------------------------------------------------------

  const startBroadcast = useCallback(async () => {
    setWebRTCState("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Mark as "connected" (i.e. LIVE) as soon as we have media access.
      // Viewer peer connections are created on-demand when viewers join.
      setWebRTCState("connected");
      console.log("[WebRTC Broadcaster] Media acquired. Broadcast is LIVE.");
    } catch (err) {
      console.error("[WebRTC Broadcaster] startBroadcast failed:", err);
      setWebRTCState("error");
      throw err;
    }
  }, []);

  // --------------------------------------------------------------------------
  // Public: called when ViewerJoined fires
  // --------------------------------------------------------------------------

  const handleViewerJoined = useCallback(async (viewerConnectionId: string) => {
    console.log("[WebRTC Broadcaster] Viewer joined:", viewerConnectionId);
    try {
      await createPeerForViewer(viewerConnectionId);
    } catch (err) {
      console.error("[WebRTC Broadcaster] handleViewerJoined failed:", err);
    }
  }, [createPeerForViewer]);

  // --------------------------------------------------------------------------
  // Handle SDP answer from a specific viewer
  // --------------------------------------------------------------------------

  const handleAnswer = useCallback(async (answer: string, viewerConnectionId: string) => {
    const pc = peerConnectionsRef.current.get(viewerConnectionId);
    if (!pc) {
      console.warn("[WebRTC Broadcaster] No peer connection for viewer:", viewerConnectionId);
      return;
    }

    try {
      const answerDesc = new RTCSessionDescription(JSON.parse(answer));
      await pc.setRemoteDescription(answerDesc);
    } catch (err) {
      console.error(`[WebRTC Broadcaster] handleAnswer for ${viewerConnectionId} failed:`, err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Handle ICE candidate from a specific viewer
  // --------------------------------------------------------------------------

  const handleRemoteIceCandidate = useCallback(async (candidate: string, viewerConnectionId: string) => {
    const pc = peerConnectionsRef.current.get(viewerConnectionId);
    if (!pc) return;

    try {
      const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
      await pc.addIceCandidate(iceCandidate);
    } catch (err) {
      console.error(`[WebRTC Broadcaster] ICE candidate for ${viewerConnectionId} failed:`, err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Handle viewer leaving — clean up their peer connection
  // --------------------------------------------------------------------------

  const handleViewerLeft = useCallback((viewerConnectionId: string) => {
    const pc = peerConnectionsRef.current.get(viewerConnectionId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(viewerConnectionId);
      console.log("[WebRTC Broadcaster] Cleaned up peer for:", viewerConnectionId);
    }
    // Broadcaster stays LIVE regardless of viewer count
  }, []);

  // --------------------------------------------------------------------------
  // Stop broadcast — close all peer connections
  // --------------------------------------------------------------------------

  const stopBroadcast = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setWebRTCState("idle");
    setIsCameraMuted(false);
    setIsMicMuted(false);
  }, []);

  // --------------------------------------------------------------------------
  // Camera / Mic toggles
  // --------------------------------------------------------------------------

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraMuted((prev) => !prev);
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMicMuted((prev) => !prev);
  }, []);

  return {
    webRTCState,
    isCameraMuted,
    isMicMuted,
    localVideoRef,
    startBroadcast,
    stopBroadcast,
    handleViewerJoined,
    handleAnswer,
    handleRemoteIceCandidate,
    handleViewerLeft,
    toggleCamera,
    toggleMic,
  };
}