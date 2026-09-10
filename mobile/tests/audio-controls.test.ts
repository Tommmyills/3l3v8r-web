import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { useAppStore } from "../src/state/appStore";
import { normalizeSoundCloudUrl, soundCloudWidgetHTML } from "../src/utils/soundCloudWidget";

test("tutorial volume and mute leave music state untouched", () => {
  const before = useAppStore.getState().musicVideo;
  useAppStore.getState().setMainVideoVolume(0);
  useAppStore.getState().setMainVideoMuted(true);
  assert.equal(useAppStore.getState().musicVideo, before);
  useAppStore.getState().setMainVideoMuted(false);
});

test("music volume leaves tutorial state untouched and clamps the range", () => {
  const before = useAppStore.getState().mainVideo;
  useAppStore.getState().setMusicVideoVolume(1000);
  assert.equal(useAppStore.getState().musicVideo.volume, 100);
  assert.equal(useAppStore.getState().mainVideo, before);
  useAppStore.getState().setMusicVideoVolume(-10);
  assert.equal(useAppStore.getState().musicVideo.volume, 0);
});

test("changing or clearing a video preserves channel volumes", () => {
  useAppStore.getState().setMainVideoVolume(23);
  useAppStore.getState().setMusicVideoVolume(81);
  useAppStore.getState().setMainVideoUrl("https://youtube.com/watch?v=M7lc1UVf-VE", "M7lc1UVf-VE");
  useAppStore.getState().clearMainVideo();
  useAppStore.getState().clearMusicVideo();
  assert.equal(useAppStore.getState().mainVideo.volume, 23);
  assert.equal(useAppStore.getState().musicVideo.volume, 81);
});

test("SoundCloud accepts only full HTTPS SoundCloud content links", () => {
  assert.equal(normalizeSoundCloudUrl(" https://soundcloud.com/artist/track "), "https://soundcloud.com/artist/track");
  assert.ok(normalizeSoundCloudUrl("https://soundcloud.com/artist/sets/playlist"));
  for (const url of ["javascript:alert(1)", "https://soundcloud.com.evil.test/a/b", "http://soundcloud.com/a/b", "https://soundcloud.com/", "https://soundcloud.com/artist"]) {
    assert.equal(normalizeSoundCloudUrl(url), null);
  }
});

function widgetHarness(native = false) {
  const html = soundCloudWidgetHTML("https://soundcloud.com/artist/track");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const calls: number[] = [];
  const events: Record<string, () => void> = {};
  const messages: string[] = [];
  const iframe = {};
  let toggles = 0;
  let messageHandler: (event: { source: unknown; data: unknown }) => void = () => {};
  const widget = { setVolume: (volume: number) => calls.push(volume), toggle: () => toggles++, bind: (name: string, fn: () => void) => { events[name] = fn; } };
  const Widget = Object.assign((element: unknown) => { assert.equal(element, iframe); return widget; }, { Events: { READY: "ready", PLAY: "play", PAUSE: "pause", FINISH: "finish", ERROR: "error" } });
  const parent = { postMessage: (raw: string) => messages.push(raw) };
  const window = {
    parent, ReactNativeWebView: native ? { postMessage: (raw: string) => messages.push(raw) } : undefined,
    addEventListener: (_: string, listener: typeof messageHandler) => { messageHandler = listener; },
  };
  const context = vm.createContext({ window, SC: { Widget }, document: { getElementById: (id: string) => { assert.equal(id, "music"); return iframe; } } });
  vm.runInContext(script, context);
  vm.runInContext("initialize()", context);
  return { calls, events, messages, parent, send: (source: unknown, type: string, value?: number) => messageHandler({ source, data: { source: "elevator-music-control", type, value } }), toggles: () => toggles, html, context };
}

test("widget waits for readiness, targets its iframe and clamps volume", () => {
  const h = widgetHarness();
  h.send(h.parent, "volume", 42);
  assert.deepEqual(h.calls, []);
  h.events.ready();
  h.send(h.parent, "volume", 42);
  h.send(h.parent, "volume", 200);
  h.send(h.parent, "volume", -1);
  h.send(h.parent, "volume", NaN);
  assert.deepEqual(h.calls, [42, 100, 0]);
  assert.equal(JSON.parse(h.messages[0]).type, "ready");
});

test("unrelated iframe messages cannot change music volume or playback", () => {
  const h = widgetHarness();
  h.events.ready();
  h.send({}, "volume", 99);
  h.send({}, "toggle");
  assert.deepEqual(h.calls, []);
  assert.equal(h.toggles(), 0);
  h.send(h.parent, "toggle");
  assert.equal(h.toggles(), 1);
});

test("native bridge reports playback and accepts direct widget commands", () => {
  const h = widgetHarness(true);
  h.events.ready();
  vm.runInContext('window.musicCommand({ type: "volume", value: 17 })', h.context);
  h.events.play();
  h.events.pause();
  assert.deepEqual(h.calls, [17]);
  assert.deepEqual(h.messages.map(raw => JSON.parse(raw).type), ["ready", "playing", "paused"]);
});

test("widget embeds official API, disables single-active behavior, and escapes input", () => {
  const html = soundCloudWidgetHTML('https://soundcloud.com/artist/track?x="</iframe><script>bad()</script>');
  assert.ok(html.includes("https://w.soundcloud.com/player/api.js"));
  assert.ok(html.includes("single_active=false"));
  assert.equal((html.match(/<iframe /g) ?? []).length, 1);
  assert.ok(!html.includes("<script>bad()"));
});

test("private embed code extracts only the official URL and preserves its token", () => {
  const input = '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F123%3Fsecret_token%3Ds-test-only&amp;auto_play=false"></iframe><script>untrusted()</script>';
  assert.equal(normalizeSoundCloudUrl(input), "https://api.soundcloud.com/playlists/123?secret_token=s-test-only");
  const html = soundCloudWidgetHTML(normalizeSoundCloudUrl(input)!);
  assert.ok(!html.includes("untrusted()"));
  assert.ok(html.includes("secret_token%3Ds-test-only"));
});

test("private embed tokens on the outer widget URL are retained", () => {
  const value = normalizeSoundCloudUrl("https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F123&secret_token=s-test-only");
  assert.equal(value, "https://api.soundcloud.com/playlists/123?secret_token=s-test-only");
});

test("concatenated links, credential URLs and foreign embedded destinations are rejected", () => {
  for (const input of [
    "https://soundcloud.com/a/sets/listhttps://soundcloud.com/a/sets/list/s-test-only",
    "https://name:password@soundcloud.com/a/b",
    "https://w.soundcloud.com/player/?url=https%3A%2F%2Fevil.example%2Ftracks%2F123",
    '<iframe src="https://evil.example/player/"></iframe>',
    "https://api.soundcloud.com/me",
  ]) assert.equal(normalizeSoundCloudUrl(input), null);
});

test("private sharing links resolve through official oEmbed without login cookies", async () => {
  const { resolveSoundCloudInput } = await import("../src/utils/soundCloudWidget");
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://soundcloud.com");
    assert.equal(url.pathname, "/oembed");
    assert.equal(url.searchParams.get("url"), "https://soundcloud.com/a/sets/b/s-test-only");
    assert.equal(init?.credentials, "omit");
    return new Response(JSON.stringify({ html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F123"></iframe>' }));
  }) as typeof fetch;
  try {
    assert.equal(await resolveSoundCloudInput("https://soundcloud.com/a/sets/b/s-test-only"), "https://api.soundcloud.com/playlists/123?secret_token=s-test-only");
  } finally { globalThis.fetch = original; }
});

test("failed private resolution reports next steps without echoing the secret", async () => {
  const { resolveSoundCloudInput } = await import("../src/utils/soundCloudWidget");
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("", { status: 403 })) as typeof fetch;
  try {
    await assert.rejects(resolveSoundCloudInput("https://soundcloud.com/a/sets/b/s-test-only"), (error: Error) => {
      assert.ok(error.message.includes("Share → Embed"));
      assert.ok(!error.message.includes("s-test-only"));
      return true;
    });
  } finally { globalThis.fetch = original; }
});

test("public links and official private embed URLs need no resolver request", async () => {
  const { resolveSoundCloudInput } = await import("../src/utils/soundCloudWidget");
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("Unexpected network request"); }) as typeof fetch;
  try {
    assert.equal(await resolveSoundCloudInput("https://soundcloud.com/a/b"), "https://soundcloud.com/a/b");
    assert.equal(await resolveSoundCloudInput("https://api.soundcloud.com/playlists/123?secret_token=s-test-only"), "https://api.soundcloud.com/playlists/123?secret_token=s-test-only");
  } finally { globalThis.fetch = original; }
});
