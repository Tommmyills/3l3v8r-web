/**
 * WebView-based YouTube Transcript Fetcher
 * This is used as a fallback when all other methods fail
 * It uses a hidden WebView to fetch transcripts with full browser capabilities
 */

import { TranscriptResult } from "./youtube-transcript";

// Store for pending transcript requests
type TranscriptCallback = {
  resolve: (result: TranscriptResult | null) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingRequests = new Map<string, TranscriptCallback>();

/**
 * Register a transcript result from the WebView
 */
export function registerWebViewTranscriptResult(videoId: string, result: TranscriptResult | null): void {
  const pending = pendingRequests.get(videoId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(videoId);
    pending.resolve(result);
  }
}

/**
 * Register a transcript error from the WebView
 */
export function registerWebViewTranscriptError(videoId: string, error: string): void {
  const pending = pendingRequests.get(videoId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(videoId);
    pending.reject(new Error(error));
  }
}

/**
 * Request a transcript via WebView
 * This should be called when other methods fail
 * Returns a promise that will be resolved when the WebView sends the result
 */
export function requestWebViewTranscript(videoId: string, timeoutMs: number = 30000): Promise<TranscriptResult | null> {
  return new Promise((resolve, reject) => {
    // Clear any existing request for this video
    const existing = pendingRequests.get(videoId);
    if (existing) {
      clearTimeout(existing.timeout);
      existing.reject(new Error("Request superseded"));
    }

    // Set up timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(videoId);
      reject(new Error("WebView transcript request timed out"));
    }, timeoutMs);

    // Store the pending request
    pendingRequests.set(videoId, { resolve, reject, timeout });
  });
}

/**
 * Check if there's a pending request for a video
 */
export function hasPendingRequest(videoId: string): boolean {
  return pendingRequests.has(videoId);
}

/**
 * Cancel a pending request
 */
export function cancelPendingRequest(videoId: string): void {
  const pending = pendingRequests.get(videoId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(videoId);
  }
}
