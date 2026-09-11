import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { soundCloudWidgetHTML } from "../utils/soundCloudWidget";

export interface SoundCloudPlayerRef {
  toggle(): void;
  next(): void;
  previous(): void;
  skip(index: number): void;
}
interface Props {
  url: string;
  volume: number;
  onPlayingChange(playing: boolean): void;
}

export const SoundCloudPlayer = forwardRef<SoundCloudPlayerRef, Props>(({ url, volume, onPlayingChange }, ref) => {
  const webView = useRef<WebView>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState(false);
  const latest = useRef({ volume, onPlayingChange });
  latest.current = { volume, onPlayingChange };
  const source = useMemo(() => ({ html: soundCloudWidgetHTML(url) }), [url]);

  const send = useCallback((type: string, value?: number) => {
    const command = { source: "elevator-music-control", type, value };
    if (Platform.OS === "web") frame.current?.contentWindow?.postMessage(command, "*");
    else webView.current?.injectJavaScript(`window.musicCommand && window.musicCommand(${JSON.stringify(command)}); true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    toggle: () => send("toggle"),
    next: () => send("next"),
    previous: () => send("previous"),
    skip: (index: number) => send("skip", index),
  }), [send]);
  useEffect(() => { send("volume", volume); }, [volume, send]);

  const receive = useCallback((raw: string) => {
    try {
      const data = JSON.parse(raw);
      if (data.source !== "elevator-soundcloud") return;
      if (data.type === "ready") send("volume", latest.current.volume);
      if (data.type === "playing") {
        send("volume", latest.current.volume);
        latest.current.onPlayingChange(true);
      }
      if (data.type === "paused") latest.current.onPlayingChange(false);
      if (data.type === "error") {
        setError(true);
        latest.current.onPlayingChange(false);
      }
    } catch { /* Ignore unrelated widget messages. */ }
  }, [send]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && typeof event.data === "string") receive(event.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [receive]);

  return <View style={{ flex: 1 }}>
    {Platform.OS === "web" ? (
      <iframe ref={frame} title="SoundCloud player" srcDoc={source.html} allow="autoplay" style={{ width: "100%", height: "100%", border: 0 }} />
    ) : (
      <WebView ref={webView} source={source} originWhitelist={["*"]} allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false} javaScriptEnabled
        onMessage={(event) => receive(event.nativeEvent.data)}
        onError={() => setError(true)} style={{ flex: 1 }} />
    )}
    {error && <Text accessibilityRole="alert" style={{ color: "#FF9A5A", padding: 8 }}>SoundCloud could not load. For a private playlist, use its full secret link or Share → Embed code. You can keep it private.</Text>}
  </View>;
});
SoundCloudPlayer.displayName = "SoundCloudPlayer";
