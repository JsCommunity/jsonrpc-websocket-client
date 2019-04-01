import { resolve as resolveUrl } from "url";

// ===================================================================

const PROTOCOL_RE = /^(?:(?:http|ws)(s)?:\/\/)?(.+)$/;

export default url => {
  // Resolve the URL against the current URL if any.
  if (typeof window !== "undefined") {
    const base = String(window.location);
    url = url ? resolveUrl(base, url) : base;
  } else if (!url) {
    throw new Error("cannot get current URL");
  }

  // Prepends the protocol if missing and replace HTTP by WS if
  // necessary.
  const [, isSecure, rest] = PROTOCOL_RE.exec(url);
  return ["ws", isSecure || "", "://", rest].join("");
};
