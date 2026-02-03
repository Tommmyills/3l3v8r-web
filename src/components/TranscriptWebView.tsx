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
    // Wait for YouTube to load
    const checkForCaptions = () => {
      // Look for captionTracks in ytInitialPlayerResponse
      const scripts = document.querySelectorAll('script');
      let captionTracks = null;

      for (const script of scripts) {
        const content = script.textContent || '';
        const match = content.match(/"captionTracks":\\s*(\\[[^\\]]*\\])/);
        if (match) {
          try {
            captionTracks = JSON.parse(match[1]);
            break;
          } catch (e) {}
        }
      }

      // Also try window.ytInitialPlayerResponse
      if (!captionTracks && window.ytInitialPlayerResponse) {
        const captions = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captions) {
          captionTracks = captions;
        }
      }

      if (captionTracks && captionTracks.length > 0) {
        // Find English track or first available
        const track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];

        if (track && track.baseUrl) {
          // Fetch the caption track
          fetch(track.baseUrl)
            .then(response => response.text())
            .then(xml => {
              // Parse XML captions
              const segments = [];
              const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\\/text>/g;
              let match;

              while ((match = regex.exec(xml)) !== null) {
                const text = match[3]
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&nbsp;/g, ' ')
                  .trim();

                if (text.length > 0) {
                  segments.push({
                    text: text,
                    start: parseFloat(match[1]),
                    duration: parseFloat(match[2])
                  });
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
              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'Could not parse caption XML'
                }));
              }
            })
            .catch(err => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Failed to fetch captions: ' + err.message
              }));
            });
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'No caption URL found'
          }));
        }
      } else {
        // Retry after a short delay
        if (window._captionRetries < 5) {
          window._captionRetries = (window._captionRetries || 0) + 1;
          setTimeout(checkForCaptions, 1000);
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'No captions found after retries'
          }));
        }
      }
    };

    window._captionRetries = 0;

    // Start checking after page load
    if (document.readyState === 'complete') {
      checkForCaptions();
    } else {
      window.addEventListener('load', checkForCaptions);
    }

    // Also try immediately
    setTimeout(checkForCaptions, 500);

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
    <View style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}>
      <WebView
        ref={webViewRef}
        source={{ uri: `https://www.youtube.com/watch?v=${videoId}` }}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
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
