/**
 * TranscriptWebView - Fetches YouTube transcripts using a hidden WebView
 * Uses YouTube's own player to display captions, then scrapes them from the DOM
 */

import React, { useRef, useState, useCallback } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { TranscriptResult } from "../api/youtube-transcript";

interface TranscriptWebViewProps {
  videoId: string;
  onTranscriptFetched: (transcript: TranscriptResult | null) => void;
  onError: (error: string) => void;
}

// Script to extract transcript from YouTube's transcript panel (not the timedtext API)
const FETCH_TRANSCRIPT_JS = `
(function() {
  try {
    window._transcriptAttempted = false;
    window._foundSegments = [];

    const decodeHtmlEntities = (text) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    };

    // Method 1: Try to open the transcript panel and scrape it
    const tryTranscriptPanel = async () => {
      // Look for "More actions" or "..." button
      const moreButton = document.querySelector('button[aria-label="More actions"]') ||
                         document.querySelector('ytd-menu-renderer button') ||
                         document.querySelector('#menu button');

      if (moreButton) {
        moreButton.click();
        await new Promise(r => setTimeout(r, 500));

        // Look for "Show transcript" option
        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
        for (const item of menuItems) {
          if (item.textContent && item.textContent.toLowerCase().includes('transcript')) {
            item.click();
            await new Promise(r => setTimeout(r, 1500));

            // Now scrape the transcript panel
            const transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer');
            if (transcriptItems.length > 0) {
              const segments = [];
              transcriptItems.forEach((item, idx) => {
                const timeEl = item.querySelector('.segment-timestamp, [class*="timestamp"]');
                const textEl = item.querySelector('.segment-text, [class*="text"]');
                if (textEl) {
                  const timeText = timeEl ? timeEl.textContent.trim() : '0:00';
                  const parts = timeText.split(':').map(Number);
                  let seconds = 0;
                  if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];

                  segments.push({
                    text: decodeHtmlEntities(textEl.textContent.trim()),
                    start: seconds,
                    duration: 5
                  });
                }
              });

              if (segments.length > 0) {
                return segments;
              }
            }
            break;
          }
        }
      }
      return null;
    };

    // Method 2: Parse captions from ytInitialPlayerResponse and use XMLHttpRequest
    const tryDirectFetch = async () => {
      let captionTracks = null;

      // Try window.ytInitialPlayerResponse
      if (window.ytInitialPlayerResponse) {
        const captions = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captions) captionTracks = captions;
      }

      // Search in script tags if not found
      if (!captionTracks) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const match = content.match(/"captionTracks":\\s*(\\[[^\\]]+\\])/);
          if (match) {
            try {
              captionTracks = JSON.parse(match[1]);
              break;
            } catch (e) {}
          }
        }
      }

      if (!captionTracks || captionTracks.length === 0) {
        return null;
      }

      const track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];
      if (!track || !track.baseUrl) return null;

      // Try with XMLHttpRequest (different request handling than fetch)
      const tryXHR = (url) => {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.withCredentials = true;
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200 && xhr.responseText.length > 100) {
                resolve(xhr.responseText);
              } else {
                resolve(null);
              }
            }
          };
          xhr.onerror = () => resolve(null);
          xhr.send();
        });
      };

      // Try various URL formats
      const urls = [
        track.baseUrl,
        track.baseUrl + '&fmt=json3',
        track.baseUrl.replace(/&fmt=[^&]+/, '') + '&fmt=json3',
        track.baseUrl.replace(/&fmt=[^&]+/, '')
      ];

      for (const url of urls) {
        const text = await tryXHR(url);
        if (text) {
          // Parse JSON format
          try {
            const json = JSON.parse(text);
            if (json.events) {
              const segments = json.events
                .filter(e => e.segs && e.segs.length > 0)
                .map(e => ({
                  text: e.segs.map(s => s.utf8 || '').join('').trim(),
                  start: (e.tStartMs || 0) / 1000,
                  duration: (e.dDurationMs || 0) / 1000
                }))
                .filter(s => s.text.length > 0);

              if (segments.length > 0) return segments;
            }
          } catch (e) {}

          // Parse XML format
          const xmlRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\\s\\S]*?)<\\/text>/g;
          const segments = [];
          let match;
          while ((match = xmlRegex.exec(text)) !== null) {
            const segText = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '')).trim();
            if (segText.length > 0) {
              segments.push({
                text: segText,
                start: parseFloat(match[1]),
                duration: parseFloat(match[2])
              });
            }
          }
          if (segments.length > 0) return segments;
        }
      }

      return null;
    };

    // Method 3: Use YouTube's internal API with proper headers
    const tryInnertubeAPI = async () => {
      const videoId = window.location.href.match(/[?&]v=([^&]+)/)?.[1];
      if (!videoId) return null;

      try {
        const response = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20240101.00.00'
              }
            },
            params: btoa('\\n\\x0b' + videoId)
          })
        });

        if (response.ok) {
          const data = await response.json();
          const cues = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups;
          if (cues && cues.length > 0) {
            const segments = cues.map(cue => {
              const c = cue.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer;
              return {
                text: c?.cue?.simpleText || '',
                start: parseInt(c?.startOffsetMs || 0) / 1000,
                duration: parseInt(c?.durationMs || 0) / 1000
              };
            }).filter(s => s.text.length > 0);

            if (segments.length > 0) return segments;
          }
        }
      } catch (e) {
        console.log('Innertube API error:', e);
      }

      return null;
    };

    const attemptAllMethods = async () => {
      if (window._transcriptAttempted) return;
      window._transcriptAttempted = true;

      // Try direct fetch first (fastest)
      let segments = await tryDirectFetch();

      // If that fails, try Innertube API
      if (!segments || segments.length === 0) {
        segments = await tryInnertubeAPI();
      }

      // If that fails, try transcript panel
      if (!segments || segments.length === 0) {
        segments = await tryTranscriptPanel();
      }

      if (segments && segments.length > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'transcript',
          data: {
            segments: segments,
            fullText: segments.map(s => s.text).join(' '),
            language: 'en',
            source: 'webview'
          }
        }));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: 'Could not fetch transcript from any source'
        }));
      }
    };

    // Wait for page to fully load
    const waitAndAttempt = () => {
      if (document.readyState === 'complete' && (window.ytInitialPlayerResponse || document.querySelector('video'))) {
        setTimeout(attemptAllMethods, 2000);
      } else {
        setTimeout(waitAndAttempt, 500);
      }
    };

    waitAndAttempt();

  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'error',
      message: 'Script error: ' + e.message
    }));
  }
})();
true;
`;

export const TranscriptWebView: React.FC<TranscriptWebViewProps> = ({
  videoId,
  onTranscriptFetched,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [hasResult, setHasResult] = useState(false);

  const handleMessage = useCallback((event: any) => {
    if (hasResult) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "transcript" && data.data) {
        setHasResult(true);
        console.log("WebView transcript success:", data.data.segments?.length, "segments");

        const result: TranscriptResult = {
          segments: data.data.segments,
          fullText: data.data.fullText,
          language: data.data.language || "en",
          videoId: videoId,
          source: "innertube",
        };

        onTranscriptFetched(result);
      } else if (data.type === "error") {
        setHasResult(true);
        console.log("WebView transcript error:", data.message);
        onError(data.message);
      }
    } catch (e) {
      console.log("WebView message parse error:", e);
    }
  }, [videoId, onTranscriptFetched, onError, hasResult]);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}>
      <WebView
        ref={webViewRef}
        source={{ uri: youtubeUrl }}
        injectedJavaScript={FETCH_TRANSCRIPT_JS}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        incognito={false}
        cacheEnabled={true}
        mediaPlaybackRequiresUserAction={true}
        allowsInlineMediaPlayback={false}
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        originWhitelist={["*"]}
        mixedContentMode="always"
        onError={(e) => {
          console.log("WebView load error:", e.nativeEvent.description);
          if (!hasResult) {
            setHasResult(true);
            onError("WebView failed to load YouTube");
          }
        }}
        onHttpError={(e) => {
          console.log("WebView HTTP error:", e.nativeEvent.statusCode);
          if (e.nativeEvent.statusCode >= 400 && !hasResult) {
            setHasResult(true);
            onError(`HTTP error: ${e.nativeEvent.statusCode}`);
          }
        }}
      />
    </View>
  );
};

export default TranscriptWebView;
