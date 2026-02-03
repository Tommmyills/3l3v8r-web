/**
 * TranscriptWebView - Fetches YouTube transcripts using a hidden WebView
 * This works because WebView has full browser capabilities including cookies
 * which allows it to access YouTube's caption API like a Chrome extension would
 */

import React, { useRef, useState, useCallback } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { TranscriptResult, TranscriptSegment } from "../api/youtube-transcript";

interface TranscriptWebViewProps {
  videoId: string;
  onTranscriptFetched: (transcript: TranscriptResult | null) => void;
  onError: (error: string) => void;
}

// JavaScript to inject into the YouTube page to extract captions
const INJECTED_JAVASCRIPT = `
(function() {
  try {
    const checkForCaptions = () => {
      let captionTracks = null;
      let transcriptData = null;

      // Method 1: Try to get transcript from ytInitialPlayerResponse (embedded in page)
      if (window.ytInitialPlayerResponse) {
        const captions = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captions) {
          captionTracks = captions;
        }
      }

      // Method 2: Search in script tags
      if (!captionTracks) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';

          // Try to find captionTracks
          const match = content.match(/"captionTracks":\\s*(\\[[^\\]]*\\])/);
          if (match) {
            try {
              captionTracks = JSON.parse(match[1]);
              break;
            } catch (e) {}
          }
        }
      }

      if (captionTracks && captionTracks.length > 0) {
        // Find English track or first available
        const track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];

        if (track && track.baseUrl) {
          // Try multiple fetch approaches
          const tryFetch = async () => {
            const urls = [
              track.baseUrl + '&fmt=json3',
              track.baseUrl,
              track.baseUrl.replace('&fmt=srv3', '') + '&fmt=json3',
            ];

            for (const url of urls) {
              try {
                const response = await fetch(url, {
                  credentials: 'include',
                  headers: {
                    'Accept': '*/*',
                  }
                });

                if (response.ok) {
                  const data = await response.text();

                  if (data.length > 100) {
                    // Try to parse
                    let segments = [];

                    // Try JSON
                    try {
                      const json = JSON.parse(data);
                      if (json.events) {
                        segments = json.events
                          .filter(e => e.segs && e.segs.length > 0)
                          .map(e => ({
                            text: e.segs.map(s => s.utf8 || '').join('').trim(),
                            start: (e.tStartMs || 0) / 1000,
                            duration: (e.dDurationMs || 0) / 1000
                          }))
                          .filter(s => s.text.length > 0);
                      }
                    } catch (e) {}

                    // Try XML if JSON didn't work
                    if (segments.length === 0) {
                      const patterns = [
                        /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\\s\\S]*?)<\\/text>/g,
                        /<text start='([^']+)' dur='([^']+)'[^>]*>([\\s\\S]*?)<\\/text>/g,
                      ];

                      for (const pattern of patterns) {
                        let match;
                        while ((match = pattern.exec(data)) !== null) {
                          const text = match[3]
                            .replace(/<[^>]+>/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&#(\\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
                            .trim();

                          if (text.length > 0) {
                            segments.push({
                              text: text,
                              start: parseFloat(match[1]),
                              duration: parseFloat(match[2])
                            });
                          }
                        }
                        if (segments.length > 0) break;
                      }
                    }

                    if (segments.length > 0) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'transcript',
                        data: {
                          segments: segments,
                          fullText: segments.map(s => s.text).join(' '),
                          language: track.languageCode || 'en',
                          source: 'webview'
                        }
                      }));
                      return;
                    }
                  }
                }
              } catch (e) {
                // Try next URL
              }
            }

            // All URLs failed
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Could not fetch captions from any URL'
            }));
          };

          tryFetch();
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'No caption URL found in track'
          }));
        }
      } else {
        // Retry after a short delay
        if (window._captionRetries < 10) {
          window._captionRetries = (window._captionRetries || 0) + 1;
          setTimeout(checkForCaptions, 500);
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'No captions found after retries'
          }));
        }
      }
    };

    window._captionRetries = 0;

    // Wait for page to be ready
    if (document.readyState === 'complete') {
      setTimeout(checkForCaptions, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(checkForCaptions, 1000));
    }

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
    if (hasResult) return; // Only process first result

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

  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}>
      <WebView
        ref={webViewRef}
        source={{ uri: `https://www.youtube.com/watch?v=${videoId}` }}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        incognito={false}
        cacheEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        onError={(e) => {
          console.log("WebView error:", e.nativeEvent.description);
          onError("WebView failed to load");
        }}
        onHttpError={(e) => {
          console.log("WebView HTTP error:", e.nativeEvent.statusCode);
        }}
      />
    </View>
  );
};

export default TranscriptWebView;
