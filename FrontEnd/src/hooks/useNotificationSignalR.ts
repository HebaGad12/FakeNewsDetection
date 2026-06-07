import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "@/lib/constants";
import { getAuthToken } from "@/lib/authStorage";
import { NotificationDto } from "@/services/notificationsService";

const SIGNALR_NOTIFICATION_HUB_URL = `${API_BASE_URL.replace("/api", "")}/notificationhub`;

interface UseNotificationSignalROptions {
  onReceiveNotification?: (notification: NotificationDto) => void;
}

interface UseNotificationSignalRReturn {
  isConnected: boolean;
}

export function useNotificationSignalR(options: UseNotificationSignalROptions = {}): UseNotificationSignalRReturn {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    let isDisposed = false;
    const token = getAuthToken();
    if (!token) return; // Only connect if authenticated

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_NOTIFICATION_HUB_URL, {
        accessTokenFactory: () => getAuthToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = conn;

    conn.on("ReceiveNotification", (notification: NotificationDto) => {
      optionsRef.current.onReceiveNotification?.(notification);
    });

    conn.onreconnected(() => setIsConnected(true));
    conn.onreconnecting(() => setIsConnected(false));
    conn.onclose(() => setIsConnected(false));

    const startWithRetry = async () => {
      try {
        await conn.start();
        if (isDisposed) {
          await conn.stop();
          return;
        }
        setIsConnected(true);
      } catch (err) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        const isDisposedDuringStart = isDisposed || (typeof err === "object" && err !== null && "message" in err && String((err as { message?: string }).message).includes("stopped during negotiation"));
        if (!isAbort && !isDisposedDuringStart) {
          console.warn("[NotificationSignalR] Connection failed:", err);
        }
      }
    };

    startWithRetry();

    return () => {
      isDisposed = true;
      connectionRef.current = null;
      conn.stop().catch(() => {});
    };
  }, []); 

  return {
    isConnected,
  };
}
