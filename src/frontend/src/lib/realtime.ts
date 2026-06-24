import { appEnv } from "./env";

type DraftSocketOptions = {
  storyId: string;
  chapterId: string;
  onOpen?: () => void;
  onMessage?: (message: unknown) => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
};

export function createDraftSocket(options: DraftSocketOptions) {
  if (typeof window === "undefined") return null;

  const url = new URL(
    `/ws/stories/${options.storyId}/chapters/${options.chapterId}`,
    appEnv.wsBaseUrl
  );

  const socket = new WebSocket(url);
  socket.addEventListener("open", () => options.onOpen?.());
  socket.addEventListener("message", (event) => {
    try {
      options.onMessage?.(JSON.parse(event.data));
    } catch {
      options.onMessage?.(event.data);
    }
  });
  socket.addEventListener("close", () => options.onClose?.());
  socket.addEventListener("error", (event) => options.onError?.(event));

  return {
    sendDraftPatch(payload: { title?: string; content?: string; cursor?: number }) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "draft.patch", payload }));
      }
    },
    close() {
      socket.close();
    },
    socket,
  };
}

type NotificationSocketOptions = {
  userId: string;
  onOpen?: () => void;
  onMessage?: (message: unknown) => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
};

export function createNotificationSocket(options: NotificationSocketOptions) {
  if (typeof window === "undefined") return null;

  let socket: WebSocket | null = null;
  let reconnectTimer: NodeJS.Timeout;
  let reconnectAttempts = 0;

  function connect() {
    const url = new URL(
      `/ws/notifications/${options.userId}`,
      appEnv.wsBaseUrl
    );

    const token = storage()?.getItem("yag.accessToken");
    if (token) {
      url.searchParams.set("token", token);
    }

    socket = new WebSocket(url);
    
    socket.addEventListener("open", () => {
      reconnectAttempts = 0;
      options.onOpen?.();
    });
    
    socket.addEventListener("message", (event) => {
      try {
        options.onMessage?.(JSON.parse(event.data));
      } catch {
        options.onMessage?.(event.data);
      }
    });
    
    socket.addEventListener("close", () => {
      options.onClose?.();
      scheduleReconnect();
    });
    
    socket.addEventListener("error", (event) => {
      options.onError?.(event);
      socket?.close();
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    if (reconnectAttempts > 5) return;
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectTimer = setTimeout(connect, delay);
  }

  function storage() {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  connect();

  return {
    close() {
      clearTimeout(reconnectTimer);
      reconnectAttempts = 99; // Prevent reconnect
      socket?.close();
    },
    get socket() {
      return socket;
    }
  };
}


