/**
 * TranscriptWebView - Fetches YouTube transcripts using a hidden WebView
 * Uses YouTube's mobile site and multiple extraction methods
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { TranscriptResult } from "../api/youtube-transcript";

interface TranscriptWebViewProps {
  videoId: string;
  onTranscriptFetched: (transcript: TranscriptResult | null) => void;
  onError: (error: string) => void;
}

// Script to extract transcript - tries multiple methods
const FETCH_TRANSCRIPT_JS = `
(function() {
  try {
    if (window._transcriptStarted) return;
    window._transcriptStarted = true;

    const log = (msg) => {
      console.log('[TranscriptWebView] ' + msg);
    };

    const decodeHtmlEntities = (text) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    };

    const parseXMLCaptions = (xmlText) => {
      const segments = [];
      // Try multiple regex patterns
      const patterns = [
        /<text start="([\\d.]+)" dur="([\\d.]+)"[^>]*>([\\s\\S]*?)<\\/text>/gi,
        /<text start='([\\d.]+)' dur='([\\d.]+)'[^>]*>([\\s\\S]*?)<\\/text>/gi,
      ];

      for (const regex of patterns) {
        let match;
        while ((match = regex.exec(xmlText)) !== null) {
          const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '')).trim();
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
      return segments;
    };

    const parseJSONCaptions = (text) => {
      try {
        const json = JSON.parse(text);
        if (json.events) {
          return json.events
            .filter(e => e.segs && e.segs.length > 0)
            .map(e => ({
              text: e.segs.map(s => s.utf8 || '').join('').trim(),
              start: (e.tStartMs || 0) / 1000,
              duration: (e.dDurationMs || 0) / 1000
            }))
            .filter(s => s.text.length > 0);
        }
      } catch (e) {}
      return [];
    };

    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    };

    // Method 1: Extract caption URL from page and fetch
    const tryDirectCaptionFetch = async () => {
      log('Trying direct caption fetch...');

      let captionTracks = null;

      // Look in ytInitialPlayerResponse
      if (window.ytInitialPlayerResponse) {
        captionTracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        log('Found ytInitialPlayerResponse, captionTracks: ' + (captionTracks ? captionTracks.length : 'none'));
      }

      // Search in page source
      if (!captionTracks) {
        const pageSource = document.documentElement.innerHTML;
        const match = pageSource.match(/"captionTracks":\\s*(\\[[^\\]]+\\])/);
        if (match) {
          try {
            captionTracks = JSON.parse(match[1]);
            log('Found captionTracks in page source: ' + captionTracks.length);
          } catch (e) {
            log('Failed to parse captionTracks: ' + e.message);
          }
        }
      }

      if (!captionTracks || captionTracks.length === 0) {
        log('No caption tracks found');
        return null;
      }

      // Find English track or use first available
      const track = captionTracks.find(t =>
        t.languageCode === 'en' ||
        t.languageCode?.startsWith('en-')
      ) || captionTracks[0];

      if (!track?.baseUrl) {
        log('No valid track URL');
        return null;
      }

      log('Found caption track: ' + track.languageCode + ', URL length: ' + track.baseUrl.length);

      // Try fetching the captions
      const urlVariants = [
        track.baseUrl + '&fmt=json3',
        track.baseUrl,
        track.baseUrl.replace(/&fmt=[^&]+/g, '') + '&fmt=json3',
        track.baseUrl.replace(/&fmt=[^&]+/g, ''),
      ];

      for (const url of urlVariants) {
        try {
          log('Fetching: ' + url.substring(0, 100) + '...');
          const response = await fetchWithTimeout(url, {
            credentials: 'include',
            headers: {
              'Accept': '*/*',
            }
          });

          if (response.ok) {
            const text = await response.text();
            log('Response length: ' + text.length);

            if (text.length > 50) {
              // Try JSON first
              let segments = parseJSONCaptions(text);
              if (segments.length === 0) {
                segments = parseXMLCaptions(text);
              }

              if (segments.length > 0) {
                log('Successfully parsed ' + segments.length + ' segments');
                return segments;
              }
            }
          } else {
            log('Fetch failed with status: ' + response.status);
          }
        } catch (e) {
          log('Fetch error: ' + e.message);
        }
      }

      return null;
    };

    // Method 2: Try YouTube's get_transcript API
    const tryTranscriptAPI = async () => {
      log('Trying transcript API...');

      const videoId = window.location.href.match(/[?&]v=([^&]+)/)?.[1];
      if (!videoId) {
        log('Could not extract video ID');
        return null;
      }

      try {
        // Encode video ID for transcript API
        const params = btoa(String.fromCharCode(10, 11) + videoId);

        const response = await fetchWithTimeout(
          'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20250101.00.00',
                }
              },
              params: params
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          log('Transcript API response received');

          // Parse transcript from response
          const actions = data?.actions || [];
          for (const action of actions) {
            const cueGroups = action?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups;
            if (cueGroups && cueGroups.length > 0) {
              const segments = cueGroups
                .map(group => {
                  const cue = group?.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer;
                  if (!cue) return null;
                  return {
                    text: cue?.cue?.simpleText || '',
                    start: parseInt(cue?.startOffsetMs || '0') / 1000,
                    duration: parseInt(cue?.durationMs || '0') / 1000
                  };
                })
                .filter(s => s && s.text.length > 0);

              if (segments.length > 0) {
                log('Transcript API returned ' + segments.length + ' segments');
                return segments;
              }
            }
          }
        } else {
          log('Transcript API failed: ' + response.status);
        }
      } catch (e) {
        log('Transcript API error: ' + e.message);
      }

      return null;
    };

    // Method 3: Look for captions in player config
    const tryPlayerConfig = async () => {
      log('Trying player config...');

      const pageSource = document.documentElement.innerHTML;

      // Look for timedtext URL pattern
      const timedTextMatch = pageSource.match(/timedtext[^"']*v=([^"'&]+)[^"']*/i);
      if (timedTextMatch) {
        log('Found timedtext pattern');
        try {
          const url = 'https://www.youtube.com/api/timedtext?' + timedTextMatch[0].split('?')[1];
          const response = await fetchWithTimeout(url, { credentials: 'include' });
          if (response.ok) {
            const text = await response.text();
            const segments = parseXMLCaptions(text);
            if (segments.length > 0) {
              return segments;
            }
          }
        } catch (e) {
          log('Timedtext fetch error: ' + e.message);
        }
      }

      return null;
    };

    const attemptAllMethods = async () => {
      log('Starting transcript extraction...');

      // Try direct fetch first
      let segments = await tryDirectCaptionFetch();

      // Then try transcript API
      if (!segments || segments.length < 3) {
        segments = await tryTranscriptAPI();
      }

      // Finally try player config
      if (!segments || segments.length < 3) {
        segments = await tryPlayerConfig();
      }

      if (segments && segments.length >= 3) {
        log('Success! Sending ' + segments.length + ' segments');
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
        log('All methods failed');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: 'Could not extract transcript from YouTube'
        }));
      }
    };

    // Wait for page to be ready
    const checkAndStart = () => {
      if (document.readyState === 'complete') {
        log('Page loaded, waiting 2s for player data...');
        setTimeout(attemptAllMethods, 2000);
      } else {
        log('Waiting for page load...');
        setTimeout(checkAndStart, 500);
      }
    };

    checkAndStart();

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set a timeout to fail if WebView takes too long
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!hasResult) {
        console.log("WebView timeout - no response after 20s");
        setHasResult(true);
        onError("Transcript fetch timed out");
      }
    }, 20000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hasResult, onError]);

  const handleMessage = useCallback((event: any) => {
    if (hasResult) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("WebView message:", data.type);

      if (data.type === "transcript" && data.data) {
        setHasResult(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        console.log("WebView transcript error:", data.message);
        onError(data.message);
      }
    } catch (e) {
      console.log("WebView message parse error:", e);
    }
  }, [videoId, onTranscriptFetched, onError, hasResult]);

  // Use desktop YouTube for better compatibility
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
        originWhitelist={["*"]}
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        onError={(e) => {
          console.log("WebView load error:", e.nativeEvent.description);
          if (!hasResult) {
            setHasResult(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            onError("Failed to load YouTube page");
          }
        }}
        onHttpError={(e) => {
          console.log("WebView HTTP error:", e.nativeEvent.statusCode);
          if (e.nativeEvent.statusCode >= 400 && !hasResult) {
            setHasResult(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            onError(`YouTube returned error ${e.nativeEvent.statusCode}`);
          }
        }}
      />
    </View>
  );
};

export default TranscriptWebView;
