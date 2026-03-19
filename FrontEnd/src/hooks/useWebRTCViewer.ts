import { useRef, useState, useCallback } from "react";
import { STUN_SERVERS } from "@/lib/constants";
import type { WebRTCState } from "@/services/types";

// ============================================================================
// Types
// ============================================================================

interface UseWebRTCViewerOptions {
  /** liveId used as the channel identifier for signaling */
  liveId: string;
  /** Send a WebRTC answer via SignalR */
  sendAnswer: (liveId: string, answer: string) => Promise<void>;
  /** Send an ICE candidate via SignalR */
  sendIceCandidate: (liveId: string, candidate: string) => Promise<void>;
}

interface UseWebRTCViewerReturn {
  /** Current WebRTC connection state */
  webRTCState: WebRTCState;
  /** Ref to attach to the remote <video> element */
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  /**
   * Handle the SDP offer received from the journalist via SignalR.
   * Creates peer connection, sends answer, starts receiving media.
   */
  handleOffer: (offer: string) => Promise<void>;
  /** Handle an ICE candidate received from the journalist via SignalR */
  handleRemoteIceCandidate: (candidate: string) => Promise<void>;
  /** Close the peer connection and stop receiving media */
  stopWatching: () => void;
}

// ============================================================================
// Hook — Viewer side
// ============================================================================

/**
 * useWebRTCViewer
 *
 * Manages the viewer's side of the WebRTC connection:
 *  1. Receives SDP offer from the journalist via SignalR
 *  2. Creates RTCPeerConnection with STUN servers
 *  3. Sets remote description (the offer)
 *  4. Creates SDP answer and sends it back via SignalR
 *  5. Exchanges ICE candidates
 *  6. Renders the incoming video/audio stream
 *
 * WebRTC flow (viewer side):
 *   handleOffer(offer)
 *     → new RTCPeerConnection
 *     → setRemoteDescription (offer)
 *     → createAnswer → setLocalDescription
 *     → sendAnswer via SignalR
 *     → ontrack fires → attach stream to <video>
 *   handleRemoteIceCandidate(candidate)
 *     → addIceCandidate
 */
export function useWebRTCViewer({
  liveId,
  sendAnswer,
  sendIceCandidate,
}: UseWebRTCViewerOptions): UseWebRTCViewerReturn {
  const [webRTCState, setWebRTCState] = useState<WebRTCState>("idle");

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // --------------------------------------------------------------------------
  // Handle offer from journalist
  // --------------------------------------------------------------------------

  /**
   * Called when SignalR fires "ReceiveOffer" with the journalist's SDP offer.
   * This is the entry point for the viewer's WebRTC handshake.
   */
  const handleOffer = useCallback(
    async (offer: string) => {
      setWebRTCState("connecting");

      try {
        // Replace any stale peer connection before processing a new offer.
        peerConnectionRef.current?.close();

        // Step 1: Create peer connection
        const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        peerConnectionRef.current = pc;

        // Step 2: When we receive remote tracks (video/audio), attach to <video>
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Step 3: Send our ICE candidates to the journalist via SignalR
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

        // Step 4: Set the journalist's offer as remote description
        const offerDesc = new RTCSessionDescription(JSON.parse(offer));
        await pc.setRemoteDescription(offerDesc);

        // Step 5: Create answer and set as local description
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Step 6: Send the answer back to the journalist via SignalR
        await sendAnswer(liveId, JSON.stringify(answer));

        setWebRTCState("connected");
      } catch (err) {
        console.error("[WebRTC Viewer] handleOffer failed:", err);
        setWebRTCState("error");
        throw err;
      }
    },
    [liveId, sendAnswer, sendIceCandidate]
  );

  // --------------------------------------------------------------------------
  // Handle ICE candidate from journalist
  // --------------------------------------------------------------------------

  const handleRemoteIceCandidate = useCallback(async (candidate: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
      await pc.addIceCandidate(iceCandidate);
    } catch (err) {
      console.error("[WebRTC Viewer] handleRemoteIceCandidate failed:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Stop watching
  // --------------------------------------------------------------------------

  const stopWatching = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setWebRTCState("idle");
  }, []);

  return {
    webRTCState,
    remoteVideoRef,
    handleOffer,
    handleRemoteIceCandidate,
    stopWatching,
  };
}