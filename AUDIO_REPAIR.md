# 3L3V8R audio repair — 10 September 2026

Local repair branch: `codex/restore-independent-audio`, based on `4acb212`.
No commits pushed, production files replaced, or deployments performed. The selected workspace was initially empty; it now contains the repository and its 162-commit history.

## Before-edit diagnosis

The review covered the source tree, mobile/backend entry points and configuration, all playback references, store wiring, tracked web exports/assets/archive inventory, and git history including the pre-`mobile/` paths. Generated bundles and ZIPs are build artifacts, not the source to repair. No audio playback is implemented in the backend.

| Area | Files and original wiring |
| --- | --- |
| Tutorial | `mobile/src/screens/MixwaveScreen.tsx`: one mounted `react-native-youtube-iframe` player, `mainPlayerRef`, `volume={mainVideo.isMuted ? 0 : channelAGain}`. |
| Other YouTube surfaces | `mobile/src/screens/YouTubeViewScreen.tsx` is not imported by the app. `mobile/src/components/TranscriptWebView.tsx` is mounted by the lesson-breakdown fallback; it requires a user gesture for media playback. No second tutorial player was found in the main playback path. |
| MP3 | `MixwaveScreen.tsx`: DocumentPicker → `Audio.Sound.createAsync()` → `audioRef`; local playback, seek, clear, and volume all live here. |
| SoundCloud | `MixwaveScreen.tsx`: source selector + `getMusicSourceUrl()` loaded the raw homepage in a native WebView; web displayed an unavailable message. No widget API or volume bridge existed. |
| Slider A | `MixwaveScreen.tsx`: local `channelAGain` plus `setMainVideoVolume()` → `mobile/src/state/appStore.ts` → YouTube volume prop. |
| Slider B | Same screen: local `channelBGain` plus `setMusicVideoVolume()` → `appStore.ts`. Two effects wrote plain volume and `audioMixer.getChannelBGain()` to the same sound. The slider was hidden for SoundCloud. |
| Polling | `mobile/src/utils/youtubeVolumeController.ts` contained a 100ms timer and retries but had no consumers. The active screen also polled simulated speech/duck state every 100ms. |

### Historical findings

- `8885abc` (initial commit, 30 December 2025) already contains competing MP3 volume effects, simulated ducking, and numeric iOS interruption mode `2`. There is no earlier working implementation in the available git history.
- `4dfce6b` (8 February 2026): best **pre-SoundCloud comparison**, immediately before SoundCloud was added. It preserves the original YouTube-plus-Expo-AV architecture, but is **not a verified last-known-good commit**.
- `1d66bd0`: adds SoundCloud as a homepage URL and selector; it does not replace or rewrite the tutorial player or MP3 volume logic.
- `62b2c70`: expands picker types and adds Spotify, again without restoring web player control.
- `2653895`: the “it worked!” message explicitly continues with MP3 load failure and unsupported WebViews. The commit changes only `changelog.txt`; it is evidence of splash success, not working audio mixing. The changelog itself contains timestamp entries.
- `4acb212`: the latest “Fix: Web platform handling for music sources and MP3 player” disables the web MP3 picker and replaces web external music players with an iOS-only message.
- `8801593`: manually changes generated HTML scripts to `type="module"`. A fresh export loses this workaround, explaining a separate blank-page failure during verification.

### Causes supported by source and testing

1. `react-native-youtube-iframe@2.4.1` imports `react-native-web-webview@1.0.2` on web. Its volume/getter paths call `injectJavaScript()`, which that adapter does not implement. The visible iframe can play while its control bridge fails.
2. The extra `webViewProps.ref` is redundant: the native wrapper assigns its internal ref after spreading those props. It does **not** override the internal ref. Its memoized source also does not recreate on each slider render. The screen's key changes only with video ID.
3. MP3 volume has competing writers. Simulated speech-driven duck state can make the second writer apply a stale gain, undoing the slider. Local and store volume state are also duplicated.
4. Expo AV's `InterruptionModeIOS.MixWithOthers` is `0`; the previous `2`, despite its “mix” comment, is `DuckOthers`. The audio mode was changed again during each file selection.
5. Web MP3 is explicitly blocked; switching music sources previously did not dispose of a loaded MP3.
6. SoundCloud has no volume integration at all.
7. Runtime browser verification found the installed web slider calling `ReactDOM.findDOMNode`, removed by React 19.
8. Fresh baseline exports include Zustand's `import.meta` in a classic script. Export completion alone did not establish a runnable build.

The user's report of successful volume getters without an audible change cannot be attributed to SoundCloud or duplicate players from this history alone. API acknowledgements are not proof of acoustic attenuation.

## Repair

- Retain Expo SDK 53, existing dependencies, native YouTube wrapper, Expo AV, and the existing screen layout.
- Restore web file selection with object URLs and release those URLs during disposal. Reject late file loads after source disposal.
- Use store volume as the single selected value for each channel and one MP3 volume effect. Initialize new sounds with the latest effective music level.
- Configure native mixing once with named Expo enums. No audio-session change occurs when a slider moves.
- Default optional auto-duck to off; keep its existing control using event-driven playback-state ducking.
- Give the web tutorial one official `YT.Player` instance tied to the visible iframe; update its volume/play/mute/rate without remounting. Destroy it on cleanup. Native keeps the existing wrapper.
- Embed the official SoundCloud widget with `single_active=false`; send `setVolume()` only to that widget and synchronize on readiness/play. No injection into the raw SoundCloud website, stream extraction, or downloads.
- Retain native sliders and replace only their broken web implementation with range inputs in the existing controls.
- Remove the orphaned YouTube reinjection controller and active 100ms duck polling.
- Enable Expo's bundled `unstable_transformImportMeta` Babel option so fresh builds load without editing generated HTML.

## Verification

| Check | Result |
| --- | --- |
| Baseline mobile typecheck | Pass |
| Baseline mobile lint | 0 errors, 42 existing warnings |
| Baseline web export | Export passed; browser failed with `import.meta` syntax error |
| Repaired mobile typecheck | Pass |
| Backend typecheck | Pass using the unchanged backend and its locked dependencies |
| Repaired mobile lint | 0 errors, 42 warnings |
| `bun test mobile/tests/audio-controls.test.ts` | 14 passed, 0 failed |
| Expo web export | Pass; browser renders the app |
| Expo iOS + Android exports | Pass; JavaScript/assets export, **not device installation or native binary testing** |
| `git diff --check` | Pass |

Web build: `mobile/web-build/audio-fix/`. Native verification output: `mobile/web-build/native-check/`. These are ignored local outputs. Root production assets, `mobile/dist`, Vercel configuration, manifests, and lockfiles were not replaced.

Browser observations:

- The official YouTube sample `M7lc1UVf-VE` loads and advances in the visible player.
- A locally generated MP3 loads and enters the playing state while the tutorial remains mounted.
- A=0/B=70, A=100/B=0, and A=0/B=100 were observed through separate slider interactions.
- The tutorial iframe retains the same ID (`widget2`) through those interactions and the switch to SoundCloud.
- SoundCloud's official example `https://soundcloud.com/forss/flickermood` loads; its Play control changes to Pause, its events reach the app, and its music slider changes independently.
- There is one tutorial iframe. SoundCloud has an outer bridge document containing one official widget iframe, not duplicate music players.

### Remaining verification before production

**The user confirmed working YouTube + SoundCloud playback/volume and then confirmed both YouTube + MP3 volume controls worked perfectly by ear on the local web build. No physical iOS/Android device was available.** The repair is not certified for production based solely on API values or build success.

On the intended browser/device, play a tutorial and local MP3 together, leave auto-duck off, and test each slider at 100/50/0 while the other stays fixed. Confirm actual audible attenuation and continued playback, not merely displayed numbers. Repeat with SoundCloud, reload/replace tracks, and clear each channel separately. Then test opt-in auto-duck. Native mixing and iOS WebView volume behavior especially require this listening check; archived Apple documentation describes iOS HTML-media volume restrictions, so do not infer iPhone support from desktop results.

## Every changed file

1. `mobile/babel.config.js` — reproducible Expo export transform.
2. `mobile/src/screens/MixwaveScreen.tsx` — restore file playback, isolate volumes/lifecycles, wire SoundCloud and platform adapters.
3. `mobile/src/components/TutorialPlayer.tsx` — native wrapper re-export (new).
4. `mobile/src/components/TutorialPlayer.web.tsx` — official web YouTube API adapter (new).
5. `mobile/src/components/PlaybackSlider.tsx` — native slider re-export (new).
6. `mobile/src/components/PlaybackSlider.web.tsx` — React 19-compatible web slider (new).
7. `mobile/src/components/SoundCloudPlayer.tsx` — stable web/native widget host and event bridge (new).
8. `mobile/src/utils/soundCloudWidget.ts` — URL validation and official widget document (new).
9. `mobile/src/utils/youtubeVolumeController.ts` — unused reinjection helper (deleted).
10. `mobile/tests/audio-controls.test.ts` — channel isolation and widget bridge regression tests (new).
11. `mobile/README.md` — correct outdated audio architecture description.
12. `AUDIO_REPAIR.md` — this diagnosis and verification record (new).
13. `mobile/src/components/AudioVisualizer.web.tsx` — restore the visible height of the existing MP3 visualizer bars on web.

## References

- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [Installed YouTube wrapper version's source](https://github.com/LonelyCpp/react-native-youtube-iframe/blob/v2.4.1/src/YoutubeIframe.js)
- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget)
- [SoundCloud's official sample track](https://developers.soundcloud.com/docs/oembed)
- [Archived Apple iOS media considerations](https://developer-mdn.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)

Separate repository observation: committed environment files and some old commit messages contain credential-like values. They were not validated or used for this repair. Avoid republishing them; credential rotation/history cleanup is outside this audio patch.

## Private SoundCloud playlist follow-up

The existing input now accepts official Share → Embed code as well as links. Only the validated SoundCloud iframe URL is extracted; supplied HTML is never rendered. Private tokens are preserved. Private permalinks are resolved using SoundCloud’s official oEmbed endpoint, without account cookies; failures suggest the official embed code. Loading is bounded and cancelled when the music source changes. The accepted input is cleared to prevent accidental link concatenation.

This adds private-link/embed support, not SoundCloud account login or a playlist library. OAuth requires a registered SoundCloud application and server-side credentials. No privacy setting was changed. Anyone possessing a private code may listen; paste it directly into the local app rather than sharing it in chat.

Follow-up changes: `MixwaveScreen.tsx`, `SoundCloudPlayer.tsx`, `soundCloudWidget.ts`, `audio-controls.test.ts`, and the two documentation files. All 14 tests, mobile typecheck, web export, iOS/Android JS exports and diff whitespace check passed; lint retained 42 warnings and no errors. The user confirmed that the private playlist, YouTube + SoundCloud mixing, and YouTube + MP3 mixing work by ear in the local web build. No commit or deployment was made.

## MP3 visualizer follow-up

The existing web visualizer rendered all 24 animated bars, but a `flex: 1` declaration on each bar made its auto-height wrapper collapse to zero pixels. Removing that conflicting flex declaration restores the original digital bar display without changing the player layout. The rebuilt browser reports the bars at their intended idle height instead of zero, and the existing playback keyframes animate their height when the MP3 plays. All 14 audio tests, typecheck, web export and diff whitespace checks pass; lint has zero errors and the same 42 pre-existing warnings.

Official references: [Embedding tracks/playlists](https://help.soundcloud.com/hc/en-us/articles/115003453587-Embedding-a-track-or-playlist), [oEmbed](https://developers.soundcloud.com/docs/oembed), [OAuth guide](https://developers.soundcloud.com/docs/api/guide).
