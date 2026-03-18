import { useRef, useState, useCallback } from "react";
import { STUN_SERVERS } from "@/lib/constants";
import type { WebRTCState } from "@/services/types";

// ============================================================================
// Types
// ============================================================================

interface UseWebRTCBroadcasterOptions {
  /** liveId used as the channel identifier for signaling */
  liveId: string;
  /** Send a WebRTC offer via SignalR */
  sendOffer: (liveId: string, offer: string) => Promise<void>;
  /** Send an ICE candidate via SignalR */
  sendIceCandidate: (liveId: string, candidate: string) => Promise<void>;
}

interface UseWebRTCBroadcasterReturn {
  /** Current WebRTC connection state */
  webRTCState: WebRTCState;
  /** Whether the local camera is muted */
  isCameraMuted: boolean;
  /** Whether the local microphone is muted */
  isMicMuted: boolean;
  /** Ref to attach to the local <video> element */
  localVideoRef: React.RefObject<HTMLVideoElement>;
  /**
   * Initialize camera/mic, create RTCPeerConnection, and send offer.
   * Call this once after startLive() succeeds.
   */
  startBroadcast: () => Promise<void>;
  /**
   * Stop all tracks and close the peer connection.
   * Call this before or after endLive().
   */
  stopBroadcast: () => void;
  /** Handle the SDP answer received from a viewer via SignalR */
  handleAnswer: (answer: string) => Promise<void>;
  /** Handle an ICE candidate received from a viewer via SignalR */
  handleRemoteIceCandidate: (candidate: string) => Promise<void>;
  /** Toggle camera track on/off */
  toggleCamera: () => void;
  /** Toggle microphone track on/off */
  toggleMic: () => void;
}

// ============================================================================
// Hook — Journalist (Broadcaster) side
// ============================================================================

/**
 * useWebRTCBroadcaster
 *
 * Manages the journalist's side of the WebRTC connection:
 *  1. Opens camera + microphone via getUserMedia
 *  2. Creates RTCPeerConnection with STUN servers
 *  3. Creates and sends SDP offer via SignalR
 *  4. Handles incoming SDP answer from viewers
 *  5. Exchanges ICE candidates
 *
 * WebRTC flow (broadcaster side):
 *   startBroadcast()
 *     → getUserMedia (camera + mic)
 *     → new RTCPeerConnection
 *     → addTrack (video + audio)
 *     → createOffer → setLocalDescription
 *     → sendOffer via SignalR
 *   handleAnswer(answer)
 *     → setRemoteDescription
 *   handleRemoteIceCandidate(candidate)
 *     → addIceCandidate
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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // --------------------------------------------------------------------------
  // Start broadcast
  // --------------------------------------------------------------------------

  const startBroadcast = useCallback(async () => {
    setWebRTCState("connecting");

    try {
      // Step 1: Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      // Step 2: Show local preview in the <video> element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Step 3: Create peer connection with STUN servers for NAT traversal
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerConnectionRef.current = pc;

      // Step 4: Add all local tracks (video + audio) to the peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Step 5: When ICE candidates are found, send them to viewers via SignalR
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendIceCandidate(
            liveId,
            JSON.stringify(event.candidate.toJSON())
          );
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            setWebRTCState("connected");
            break;
          case "disconnected":
          case "closed":
            setWebRTCState("disconnected");
            break;
          case "failed":
            setWebRTCState("error");
            break;
        }
      };

      // Step 6: Create SDP offer and set as local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Step 7: Send the offer to all viewers via SignalR
      await sendOffer(liveId, JSON.stringify(offer));

      setWebRTCState("connected");
    } catch (err) {
      console.error("[WebRTC Broadcaster] startBroadcast failed:", err);
      setWebRTCState("error");
      throw err;
    }
  }, [liveId, sendOffer, sendIceCandidate]);

  // --------------------------------------------------------------------------
  // Stop broadcast
  // --------------------------------------------------------------------------

  const stopBroadcast = useCallback(() => {
    // Stop all media tracks (turns off camera/mic indicator light)
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close the peer connection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    // Clear the local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setWebRTCState("idle");
    setIsCameraMuted(false);
    setIsMicMuted(false);
  }, []);

  // --------------------------------------------------------------------------
  // Handle answer from viewer
  // --------------------------------------------------------------------------

  /**
   * Called when a viewer sends their SDP answer via SignalR "ReceiveAnswer".
   * Sets the remote description on the peer connection.
   */
  const handleAnswer = useCallback(async (answer: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const answerDesc = new RTCSessionDescription(JSON.parse(answer));
      await pc.setRemoteDescription(answerDesc);
    } catch (err) {
      console.error("[WebRTC Broadcaster] handleAnswer failed:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Handle ICE candidate from viewer
  // --------------------------------------------------------------------------

  /**
   * Called when a viewer sends an ICE candidate via SignalR "ReceiveIceCandidate".
   */
  const handleRemoteIceCandidate = useCallback(async (candidate: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
      await pc.addIceCandidate(iceCandidate);
    } catch (err) {
      console.error("[WebRTC Broadcaster] handleRemoteIceCandidate failed:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Camera / Mic toggles
  // --------------------------------------------------------------------------

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraMuted((prev) => !prev);
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMicMuted((prev) => !prev);
  }, []);

  return {
    webRTCState,
    isCameraMuted,
    isMicMuted,
    localVideoRef,
    startBroadcast,
    stopBroadcast,
    handleAnswer,
    handleRemoteIceCandidate,
    toggleCamera,
    toggleMic,
  };
}