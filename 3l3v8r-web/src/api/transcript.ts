/**
 * Browser-based YouTube Transcript Fetcher
 * This runs in the browser and can access YouTube's caption data more reliably
 */

export interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

export interface TranscriptResult {
  segments: TranscriptSegment[]
  fullText: string
  language: string
  videoId: string
}

/**
 * Fetch transcript for a YouTube video
 * Uses browser-based fetching which works better than server-side
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  console.log('📝 Fetching transcript for:', videoId)

  try {
    // Method 1: Try to get captions via YouTube's timedtext API
    const result = await fetchViaTimedText(videoId)
    if (result && result.segments.length > 0) {
      console.log('✅ Got transcript via timedtext:', result.segments.length, 'segments')
      return result
    }

    // Method 2: Try to scrape from video page
    const pageResult = await fetchViaVideoPage(videoId)
    if (pageResult && pageResult.segments.length > 0) {
      console.log('✅ Got transcript via video page:', pageResult.segments.length, 'segments')
      return pageResult
    }

    console.log('❌ No transcript found')
    return {
      segments: [],
      fullText: '',
      language: 'en',
      videoId,
    }
  } catch (error) {
    console.error('Transcript fetch error:', error)
    return {
      segments: [],
      fullText: '',
      language: 'en',
      videoId,
    }
  }
}

/**
 * Fetch via YouTube's timedtext API
 */
async function fetchViaTimedText(videoId: string): Promise<TranscriptResult | null> {
  try {
    // First, get the video page to find caption track info
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Use a CORS proxy for browser-based fetching
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(videoPageUrl)}`

    const response = await fetch(proxyUrl)
    if (!response.ok) {
      console.log('Failed to fetch video page:', response.status)
      return null
    }

    const html = await response.text()

    // Find caption tracks in the page
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[[^\]]*\])/)
    if (!captionTracksMatch) {
      console.log('No captionTracks found in page')
      return null
    }

    const captionTracks = JSON.parse(captionTracksMatch[1])
    if (!captionTracks || captionTracks.length === 0) {
      console.log('Empty caption tracks')
      return null
    }

    // Find English track or first available
    const track = captionTracks.find(
      (t: { languageCode?: string; vssId?: string }) =>
        t.languageCode === 'en' ||
        t.languageCode?.startsWith('en') ||
        t.vssId?.includes('.en')
    ) || captionTracks[0]

    if (!track?.baseUrl) {
      console.log('No baseUrl in track')
      return null
    }

    // Fetch the caption track via proxy
    const captionProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(track.baseUrl)}`
    const captionResponse = await fetch(captionProxyUrl)

    if (!captionResponse.ok) {
      console.log('Caption fetch failed:', captionResponse.status)
      return null
    }

    const captionText = await captionResponse.text()
    const segments = parseXMLCaptions(captionText)

    if (segments.length > 0) {
      return {
        segments,
        fullText: segments.map((s) => s.text).join(' '),
        language: track.languageCode || 'en',
        videoId,
      }
    }

    return null
  } catch (error) {
    console.error('TimedText fetch error:', error)
    return null
  }
}

/**
 * Fetch via video page scraping
 */
async function fetchViaVideoPage(_videoId: string): Promise<TranscriptResult | null> {
  // This is a fallback - in production you might use additional methods
  return null
}

/**
 * Parse XML format captions
 */
function parseXMLCaptions(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []

  // Match <text> elements with start and dur attributes
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g
  let match

  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1])
    const duration = parseFloat(match[2])
    const text = decodeHTMLEntities(match[3])

    if (text.length > 0) {
      segments.push({ text, start, duration })
    }
  }

  return segments
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\n/g, ' ')
    .trim()
}
