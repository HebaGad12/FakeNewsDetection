import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { SIGNALR_HUB_URL } from "@/lib/constants";
import { getAuthToken } from "@/lib/authStorage";

// ============================================================================
// Types
// ============================================================================

interface UseSignalROptions {
  /** Called when the backend fires "LiveStarted" */
  onLiveStarted?: (liveId: string) => void;
  /** Called when the backend fires "LiveEnded" */
  onLiveEnded?: (liveId: string) => void;
  /**
   * Called when the hub broadcasts "ReceiveOffer" (viewer side).
   * The journalist now sends offers targeted per-viewer so only the target viewer
   * receives this event.
   */
  onReceiveOffer?: (offer: string) => void;
  /**
   * Called when the hub broadcasts "ReceiveAnswer" (journalist side).
   * Now includes viewerConnectionId so the broadcaster knows which peer to update.
   */
  onReceiveAnswer?: (answer: string, viewerConnectionId: string) => void;
  /**
   * Called when the hub broadcasts "ReceiveIceCandidate".
   * senderConnectionId is included so the broadcaster can route it to the right peer.
   */
  onReceiveIceCandidate?: (candidate: string, senderConnectionId?: string) => void;
  /** Called when a chat comment arrives — args: senderId, senderName, text */
  onReceiveComment?: (senderId: string, senderName: string, text: string) => void;
  /**
   * Called when a viewer joins an active live session.
   * Now includes viewerConnectionId so the broadcaster creates a dedicated peer connection.
   */
  onViewerJoined?: (liveId: string, viewerConnectionId: string) => void;
  /** Called when live viewer count changes */
  onViewerCountUpdated?: (liveId: string, count: number) => void;
  /**
   * Called when a viewer disconnects.
   * The broadcaster should close and remove the peer connection for this viewer.
   */
  onViewerLeft?: (liveId: string, viewerConnectionId: string) => void;
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
   * Send a WebRTC offer to a specific viewer.
   * Calls hub method: SendOffer(liveId, offer, viewerConnectionId)
   */
  sendOffer: (liveId: string, offer: string, viewerConnectionId: string) => Promise<void>;
  /**
   * Send a WebRTC answer back to the journalist.
   * Calls hub method: SendAnswer(liveId, answer)
   */
  sendAnswer: (liveId: string, answer: string) => Promise<void>;
  /**
   * Send an ICE candidate to a specific target (viewer or broadcaster).
   * Calls hub method: SendIceCandidate(liveId, candidate, targetConnectionId?)
   */
  sendIceCandidate: (liveId: string, candidate: string, targetConnectionId?: string) => Promise<void>;
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
  const startPromiseRef = useRef<Promise<void> | null>(null);

  // Keep callbacks in refs so they never cause the effect to re-run
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // --------------------------------------------------------------------------
  // Connection lifecycle
  // --------------------------------------------------------------------------

  useEffect(() => {
    let isDisposed = false;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        // Pass JWT so the hub can identify the caller
        accessTokenFactory: () => getAuthToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = conn;

    // ── Incoming events from the backend ─────────────────────────────────────

    /**
     * "LiveStarted" — fired by LiveController when a journalist starts.
     */
    conn.on("LiveStarted", (liveId: string) => {
      optionsRef.current.onLiveStarted?.(liveId);
    });

    /**
     * "LiveEnded" — fired by LiveController when a journalist ends.
     */
    conn.on("LiveEnded", (liveId: string) => {
      optionsRef.current.onLiveEnded?.(liveId);
    });

    /**
     * "ReceiveOffer" — fired by LiveHub.SendOffer() to a specific viewer.
     * Only the targeted viewer receives this event.
     */
    conn.on("ReceiveOffer", (offer: string) => {
      optionsRef.current.onReceiveOffer?.(offer);
    });

    /**
     * "ReceiveAnswer" — fired by LiveHub.SendAnswer().
     * Now includes viewerConnectionId so the broadcaster can route to the right peer.
     */
    conn.on("ReceiveAnswer", (answer: string, viewerConnectionId: string) => {
      optionsRef.current.onReceiveAnswer?.(answer, viewerConnectionId);
    });

    /**
     * "ReceiveIceCandidate" — fired by LiveHub.SendIceCandidate().
     * senderConnectionId identifies who sent the candidate (viewer or broadcaster).
     */
    conn.on("ReceiveIceCandidate", (candidate: string, senderConnectionId?: string) => {
      optionsRef.current.onReceiveIceCandidate?.(candidate, senderConnectionId);
    });

    /**
     * "ReceiveComment" — fired by LiveHub.SendComment().
     * Includes senderId, senderName, text.
     */
    conn.on("ReceiveComment", (senderId: string, senderName: string, text: string) => {
      optionsRef.current.onReceiveComment?.(senderId, senderName, text);
    });

    /**
     * "ViewerJoined" — fired when a viewer follows a journalist with an active live.
     * Now includes viewerConnectionId for per-viewer peer connection management.
     */
    conn.on("ViewerJoined", (liveId: string, viewerConnectionId: string) => {
      optionsRef.current.onViewerJoined?.(liveId, viewerConnectionId);
    });

    conn.on("ViewerCountUpdated", (liveId: string, count: number) => {
      optionsRef.current.onViewerCountUpdated?.(liveId, count);
    });

    /**
     * "ViewerLeft" — fired when a viewer disconnects.
     * The broadcaster should close the peer connection for this viewer.
     */
    conn.on("ViewerLeft", (liveId: string, viewerConnectionId: string) => {
      optionsRef.current.onViewerLeft?.(liveId, viewerConnectionId);
    });

    // ── Connection state handlers ─────────────────────────────────────────────

    conn.onreconnected(() => setIsConnected(true));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onclose(() => setIsConnected(false));

    const shouldIgnoreStartupError = (error: unknown): boolean => {
      if (isDisposed) return true;
      const message =
        error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      return message.includes("stopped during negotiation");
    };

    const startWithRetry = async (): Promise<void> => {
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (isDisposed) return;

        try {
          await conn.start();
          if (isDisposed) {
            await conn.stop();
            return;
          }
          setIsConnected(true);
          return;
        } catch (err) {
          if (shouldIgnoreStartupError(err)) {
            setIsConnected(false);
            return;
          }

          if (attempt >= maxAttempts) {
            console.error("[SignalR] Connection failed:", err);
            setIsConnected(false);
            throw err;
          }

          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    };

    const startPromise = startWithRetry();
    startPromiseRef.current = startPromise;

    return () => {
      isDisposed = true;
      startPromiseRef.current = null;
      connectionRef.current = null;
      conn.stop().catch(() => {});
    };
  }, []); // Run once on mount

  // --------------------------------------------------------------------------
  // Outgoing hub method invokers
  // --------------------------------------------------------------------------

  const invokeWhenConnected = useCallback(
    async (methodName: string, ...args: unknown[]) => {
      const conn = connectionRef.current;
      if (!conn) {
        throw new Error("SignalR connection is not initialized yet.");
      }

      if (conn.state !== signalR.HubConnectionState.Connected) {
        if (startPromiseRef.current) {
          await startPromiseRef.current;
        }

        if (conn.state === signalR.HubConnectionState.Disconnected) {
          await conn.start();
          setIsConnected(true);
        }
      }

      if (conn.state !== signalR.HubConnectionState.Connected) {
        throw new Error(`SignalR is not connected. Current state: ${conn.state}`);
      }

      await conn.invoke(methodName, ...args);
    },
    []
  );

  const followJournalist = useCallback(async (journalistId: string) => {
    await invokeWhenConnected("FollowJournalist", journalistId);
  }, [invokeWhenConnected]);

  /** Send offer to a specific viewer's connection ID */
  const sendOffer = useCallback(async (liveId: string, offer: string, viewerConnectionId: string) => {
    await invokeWhenConnected("SendOffer", liveId, offer, viewerConnectionId);
  }, [invokeWhenConnected]);

  const sendAnswer = useCallback(async (liveId: string, answer: string) => {
    await invokeWhenConnected("SendAnswer", liveId, answer);
  }, [invokeWhenConnected]);

  /** Send ICE candidate, optionally targeting a specific connection */
  const sendIceCandidate = useCallback(
    async (liveId: string, candidate: string, targetConnectionId?: string) => {
      await invokeWhenConnected("SendIceCandidate", liveId, candidate, targetConnectionId ?? null);
    },
    [invokeWhenConnected]
  );

  const sendComment = useCallback(async (liveId: string, comment: string) => {
    await invokeWhenConnected("SendComment", liveId, comment);
  }, [invokeWhenConnected]);

  return {
    isConnected,
    followJournalist,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendComment,
  };
}