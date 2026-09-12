// Extract only a validated SoundCloud URL. Pasted embed HTML is never executed.
export function normalizeSoundCloudUrl(input: string): string | null {
  try {
    let value = input.trim();
    if (value.startsWith("<")) {
      const iframe = value.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
      if (!iframe) return null;
      value = iframe[2].replace(/&amp;/gi, "&").replace(/&#0*38;/g, "&");
    }
    if (/\s|[<>]/.test(value)) return null;
    let url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "w.soundcloud.com" && url.pathname === "/player/") {
      const content = url.searchParams.get("url");
      if (!content) return null;
      const token = url.searchParams.get("secret_token");
      url = new URL(content);
      if (token && !url.searchParams.has("secret_token")) url.searchParams.set("secret_token", token);
    }
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "api.soundcloud.com") {
      if (!/^\/(tracks|playlists)\/\d+\/?$/.test(url.pathname)) return null;
    } else {
      if (!["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(url.hostname)) return null;
      if (url.pathname.split("/").filter(Boolean).length < 2) return null;
      // Catch the accidental old-link + newly-pasted-link concatenation.
      if (/https?:/i.test(decodeURIComponent(url.pathname))) return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export async function resolveSoundCloudInput(input: string, signal?: AbortSignal): Promise<string> {
  const url = normalizeSoundCloudUrl(input);
  if (!url) throw new Error("Paste one full SoundCloud link or the code from Share → Embed, replacing the previous text.");
  const parsed = new URL(url);
  const isPrivateLink = /\/s-[^/]+\/?$/.test(parsed.pathname) || parsed.searchParams.has("secret_token");
  // Official embeds already identify the playlist and carry its private token.
  if (parsed.hostname === "api.soundcloud.com" || !isPrivateLink) return url;
  try {
    const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      signal, credentials: "omit", referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    const resolved = typeof data.html === "string" ? normalizeSoundCloudUrl(data.html) : null;
    if (!resolved) throw new Error("unavailable");
    const originalToken = parsed.searchParams.get("secret_token") ?? parsed.pathname.match(/\/(s-[^/]+)\/?$/)?.[1];
    const target = new URL(resolved);
    if (originalToken && !target.searchParams.has("secret_token")) target.searchParams.set("secret_token", originalToken);
    return target.href;
  } catch {
    if (signal?.aborted) throw new Error("Loading cancelled.");
    throw new Error("SoundCloud could not resolve this private link. Keep the playlist private: copy its Share → Embed code and paste it here instead.");
  }
}

// This document owns only the official widget, never the SoundCloud website.
export function soundCloudWidgetHTML(url: string): string {
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&single_active=false`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#0a0a0a}</style></head><body>
<iframe id="music" title="SoundCloud music" allow="autoplay" src="${src}"></iframe>
<script>
var widget, ready = false;
function report(type, value) {
  var payload = { source: "elevator-soundcloud", type: type };
  if (typeof value !== "undefined") payload.value = value;
  var data = JSON.stringify(payload);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else window.parent.postMessage(data, "*");
}
window.musicCommand = function(command) {
  if (!ready) return;
  if (command.type === "volume" && Number.isFinite(command.value)) {
    var requestedVolume = Math.max(0, Math.min(100, command.value));
    widget.setVolume(requestedVolume);
    if (typeof widget.getVolume === "function") {
      widget.getVolume(function(actualVolume) {
        report("volume", actualVolume);
      });
    }
  }
  if (command.type === "toggle") widget.toggle();
  if (command.type === "next") widget.next();
  if (command.type === "previous") widget.prev();
  if (command.type === "skip" && Number.isInteger(command.value)) widget.skip(command.value);
};
window.addEventListener("message", function(event) {
  if (event.source !== window.parent || !event.data || event.data.source !== "elevator-music-control") return;
  window.musicCommand(event.data);
});
function initialize() {
  widget = SC.Widget(document.getElementById("music"));
  widget.bind(SC.Widget.Events.READY, function() { ready = true; report("ready"); });
  widget.bind(SC.Widget.Events.PLAY, function() { report("playing"); });
  widget.bind(SC.Widget.Events.PAUSE, function() { report("paused"); });
  widget.bind(SC.Widget.Events.FINISH, function() { report("paused"); });
  widget.bind(SC.Widget.Events.ERROR, function() { report("error"); });
}
</script><script src="https://w.soundcloud.com/player/api.js" onload="initialize()" onerror="report('error')"></script></body></html>`;
}
