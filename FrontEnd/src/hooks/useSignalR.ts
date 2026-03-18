import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { AUTH_TOKEN_KEY, SIGNALR_HUB_URL } from "@/lib/constants";
import type { LiveCard } from "@/services/types";

// ============================================================================
// Types
// ============================================================================

interface UseSignalROptions {
  /** Called when the backend fires "LiveStarted" */
  onLiveStarted?: (liveId: string) => void;
  /** Called when the backend fires "LiveEnded" */
  onLiveEnded?: (liveId: string) => void;
  /** Called when the hub broadcasts "ReceiveOffer" (viewer side) */
  onReceiveOffer?: (offer: string) => void;
  /** Called when the hub broadcasts "ReceiveAnswer" (journalist side) */
  onReceiveAnswer?: (answer: string) => void;
  /** Called when the hub broadcasts "ReceiveIceCandidate" */
  onReceiveIceCandidate?: (candidate: string) => void;
  /** Called when a chat comment arrives */
  onReceiveComment?: (senderName: string, text: string) => void;
}

interface UseSignalRReturn {
  /** Whether the SignalR connection is active */
  isConnected: boolean;
  /**
   * Join the SignalR group for a journalist so we receive their events.
   * Calls hub method: FollowJournalist(journalistId)
   */
  followJournalist: (journalistId: string) => Promise<void>;
  /**
   * Send a WebRTC offer to all members of the liveId group.
   * Calls hub method: SendOffer(liveId, offer)
   */
  sendOffer: (liveId: string, offer: string) => Promise<void>;
  /**
   * Send a WebRTC answer back to the journalist.
   * Calls hub method: SendAnswer(liveId, answer)
   */
  sendAnswer: (liveId: string, answer: string) => Promise<void>;
  /**
   * Send an ICE candidate to the other peer.
   * Calls hub method: SendIceCandidate(liveId, candidate)
   */
  sendIceCandidate: (liveId: string, candidate: string) => Promise<void>;
  /**
   * Send a chat comment to everyone watching the live session.
   * Calls hub method: SendComment(liveId, comment)
   */
  sendComment: (liveId: string, comment: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useSignalR
 *
 * Manages a single persistent SignalR connection to /livehub.
 * Exposes methods to invoke hub methods and fires callbacks for received events.
 *
 * Hub URL: /livehub  (mapped in Program.cs: app.MapHub<LiveHub>("/livehub"))
 */
export function useSignalR(options: UseSignalROptions = {}): UseSignalRReturn {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Keep callbacks in refs so they never cause the effect to re-run
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // --------------------------------------------------------------------------
  // Connection lifecycle
  // --------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        // Pass JWT so the hub can identify the caller
        accessTokenFactory: () => token ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // ── Incoming events from the backend ─────────────────────────────────────

    /**
     * "LiveStarted" — fired by LiveController when a journalist starts.
     * Payload: liveId (Guid serialized as string)
     */
    conn.on("LiveStarted", (liveId: string) => {
      optionsRef.current.onLiveStarted?.(liveId);
    });

    /**
     * "LiveEnded" — fired by LiveController when a journalist ends.
     * Payload: liveId (Guid serialized as string)
     */
    conn.on("LiveEnded", (liveId: string) => {
      optionsRef.current.onLiveEnded?.(liveId);
    });

    /**
     * "ReceiveOffer" — fired by LiveHub.SendOffer().
     * The journalist sends their WebRTC SDP offer; viewers receive it here.
     */
    conn.on("ReceiveOffer", (offer: string) => {
      optionsRef.current.onReceiveOffer?.(offer);
    });

    /**
     * "ReceiveAnswer" — fired by LiveHub.SendAnswer().
     * A viewer sends their SDP answer; the journalist receives it here.
     */
    conn.on("ReceiveAnswer", (answer: string) => {
      optionsRef.current.onReceiveAnswer?.(answer);
    });

    /**
     * "ReceiveIceCandidate" — fired by LiveHub.SendIceCandidate().
     * Both sides exchange ICE candidates for NAT traversal.
     */
    conn.on("ReceiveIceCandidate", (candidate: string) => {
      optionsRef.current.onReceiveIceCandidate?.(candidate);
    });

    /**
     * "ReceiveComment" — fired by LiveHub.SendComment().
     * Chat messages sent during a live session.
     */
    conn.on("ReceiveComment", (senderName: string, text: string) => {
      optionsRef.current.onReceiveComment?.(senderName, text);
    });

    // ── Connection state handlers ─────────────────────────────────────────────

    conn.onreconnected(() => setIsConnected(true));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onclose(() => setIsConnected(false));

    conn
      .start()
      .then(() => {
        setIsConnected(true);
        connectionRef.current = conn;
      })
      .catch((err) => {
        console.error("[SignalR] Connection failed:", err);
        setIsConnected(false);
      });

    return () => {
      conn.stop();
    };
  }, []); // Run once on mount

  // --------------------------------------------------------------------------
  // Outgoing hub method invokers
  // --------------------------------------------------------------------------

  const followJournalist = useCallback(async (journalistId: string) => {
    await connectionRef.current?.invoke("FollowJournalist", journalistId);
  }, []);

  const sendOffer = useCallback(async (liveId: string, offer: string) => {
    await connectionRef.current?.invoke("SendOffer", liveId, offer);
  }, []);

  const sendAnswer = useCallback(async (liveId: string, answer: string) => {
    await connectionRef.current?.invoke("SendAnswer", liveId, answer);
  }, []);

  const sendIceCandidate = useCallback(
    async (liveId: string, candidate: string) => {
      await connectionRef.current?.invoke("SendIceCandidate", liveId, candidate);
    },
    []
  );

  const sendComment = useCallback(async (liveId: string, comment: string) => {
    await connectionRef.current?.invoke("SendComment", liveId, comment);
  }, []);

  return {
    isConnected,
    followJournalist,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendComment,
  };
}