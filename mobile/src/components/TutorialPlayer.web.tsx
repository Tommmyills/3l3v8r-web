import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { PLAYER_STATES, YoutubeIframeProps, YoutubeIframeRef } from "react-native-youtube-iframe";

interface Player {
  setVolume(value: number): void;
  mute(): void;
  unMute(): void;
  playVideo(): void;
  pauseVideo(): void;
  setPlaybackRate(value: number): void;
  getDuration(): number;
  getVideoUrl(): string;
  getCurrentTime(): number;
  isMuted(): boolean;
  getVolume(): number;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
type YouTubeAPI = { Player: new (element: HTMLElement, options: {
  videoId?: string;
  width: string;
  height: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady(event: { target: Player }): void;
    onStateChange(event: { data: number }): void;
    onError(event: { data: number }): void;
  };
}) => Player };

let apiPromise: Promise<YouTubeAPI> | undefined;
function loadAPI() {
  const host = window as typeof window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
      const previous = host.onYouTubeIframeAPIReady;
      host.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (host.YT) resolve(host.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        apiPromise = undefined;
        script.remove();
        reject(new Error("YouTube API could not load"));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

const states: Record<number, string> = {
  [-1]: "unstarted", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "video cued",
};

// One API object owns the visible iframe. Prop changes never recreate that iframe.
const TutorialPlayer = forwardRef<YoutubeIframeRef, YoutubeIframeProps>((props, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const { videoId } = props;

  useImperativeHandle(ref, () => ({
    getDuration: async () => player.current?.getDuration() ?? 0,
    getVideoUrl: async () => player.current?.getVideoUrl() ?? "",
    getCurrentTime: async () => player.current?.getCurrentTime() ?? 0,
    isMuted: async () => player.current?.isMuted() ?? false,
    getVolume: async () => player.current?.getVolume() ?? 0,
    getPlaybackRate: async () => player.current?.getPlaybackRate() ?? 1,
    getAvailablePlaybackRates: async () => player.current?.getAvailablePlaybackRates() ?? [1],
    seekTo: (seconds, allowSeekAhead) => player.current?.seekTo(seconds, allowSeekAhead),
  }), []);

  useEffect(() => {
    let disposed = false;
    let instance: Player | undefined;
    const root = container.current!;
    loadAPI().then((api) => {
      if (disposed) return;
      const mount = document.createElement("div");
      root.appendChild(mount);
      instance = new api.Player(mount, {
        videoId, width: "100%", height: "100%",
        playerVars: { playsinline: 1, controls: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (disposed) return;
            player.current = target;
            target.setVolume(latest.current.volume ?? 100);
            if (latest.current.mute) target.mute();
            else target.unMute();
            target.setPlaybackRate(latest.current.playbackRate ?? 1);
            if (latest.current.play) target.playVideo();
            latest.current.onReady?.();
          },
          onStateChange: ({ data }) => {
            if (!disposed && states[data]) latest.current.onChangeState?.(states[data] as PLAYER_STATES);
          },
          onError: ({ data }) => {
            if (!disposed) latest.current.onError?.(`YouTube error ${data}`);
          },
        },
      });
    }).catch(() => {
      if (!disposed) latest.current.onError?.("YouTube API could not load");
    });
    return () => {
      disposed = true;
      player.current = null;
      instance?.destroy();
      root.replaceChildren();
    };
  }, [videoId]);

  useEffect(() => { player.current?.setVolume(props.volume ?? 100); }, [props.volume]);
  useEffect(() => {
    if (props.mute) player.current?.mute();
    else player.current?.unMute();
  }, [props.mute]);
  useEffect(() => {
    if (props.play) player.current?.playVideo();
    else player.current?.pauseVideo();
  }, [props.play]);
  useEffect(() => { player.current?.setPlaybackRate(props.playbackRate ?? 1); }, [props.playbackRate]);

  return <div ref={container} style={{ height: props.height, width: props.width ?? "100%" }} />;
});
TutorialPlayer.displayName = "TutorialPlayer";
export default TutorialPlayer;
