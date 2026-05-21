import { getAccessToken } from "./auth";
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

  const token = getAccessToken();
  const url = new URL(
    `/ws/stories/${options.storyId}/chapters/${options.chapterId}`,
    appEnv.wsBaseUrl
  );
  if (token) url.searchParams.set("token", token);

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

