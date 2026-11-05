const channelName = "blog-auth-session";
let documentId: string | undefined;
function sender() { return documentId ??= crypto.randomUUID(); }

export function notifySessionChange() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage({ type: "session-changed", sender: sender() });
  channel.close();
}

export function onSessionChange(callback: () => void) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const id = sender();
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (data && typeof data === "object" && "type" in data && data.type === "session-changed" &&
        "sender" in data && typeof data.sender === "string" && data.sender !== id) callback();
  };
  return () => channel.close();
}
