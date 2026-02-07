/**
 * Browser-based YouTube Transcript Fetcher
 * Uses multiple CORS proxies for reliability
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

// Multiple CORS proxies for fallback
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

/**
 * Fetch with CORS proxy fallback
 */
async function fetchWithProxy(url: string): Promise<string | null> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url)
      console.log('Trying proxy:', proxyUrl.substring(0, 50) + '...')

      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (response.ok) {
        const text = await response.text()
        if (text && text.length > 100) {
          return text
        }
      }
    } catch (e) {
      console.log('Proxy failed, trying next...')
    }
  }
  return null
}

/**
 * Fetch transcript for a YouTube video
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  console.log('📝 Fetching transcript for:', videoId)

  try {
    // Method 1: Try via video page to get caption tracks
    const result = await fetchViaVideoPage(videoId)
    if (result && result.segments.length > 0) {
      console.log('✅ Got transcript:', result.segments.length, 'segments')
      return result
    }

    // Method 2: Try Tactiq API (public transcript service)
    const tactiqResult = await fetchViaTactiq(videoId)
    if (tactiqResult && tactiqResult.segments.length > 0) {
      console.log('✅ Got transcript via Tactiq:', tactiqResult.segments.length, 'segments')
      return tactiqResult
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
 * Fetch via YouTube video page
 */
async function fetchViaVideoPage(videoId: string): Promise<TranscriptResult | null> {
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`
    const html = await fetchWithProxy(videoPageUrl)

    if (!html) {
      console.log('Failed to fetch video page')
      return null
    }

    // Find caption tracks in the page
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[[^\]]*\])/)
    if (!captionTracksMatch) {
      console.log('No captionTracks found in page')
      return null
    }

    let captionTracks
    try {
      captionTracks = JSON.parse(captionTracksMatch[1])
    } catch {
      console.log('Failed to parse caption tracks')
      return null
    }

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

    // Fetch the caption track
    const captionText = await fetchWithProxy(track.baseUrl)
    if (!captionText) {
      console.log('Failed to fetch captions')
      return null
    }

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
    console.error('Video page fetch error:', error)
    return null
  }
}

/**
 * Fetch via Tactiq public API
 */
async function fetchViaTactiq(videoId: string): Promise<TranscriptResult | null> {
  try {
    const url = `https://tactiq-apps-prod.tactiq.io/transcript?videoId=${videoId}&langCode=en`

    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.captions && Array.isArray(data.captions)) {
      const segments: TranscriptSegment[] = data.captions.map((item: { text?: string; start?: number; startMs?: number; duration?: number; durationMs?: number }) => ({
        text: item.text || '',
        start: (item.start || item.startMs || 0) / 1000,
        duration: (item.duration || item.durationMs || 2000) / 1000,
      })).filter((s: TranscriptSegment) => s.text.length > 0)

      if (segments.length > 0) {
        return {
          segments,
          fullText: segments.map((s) => s.text).join(' '),
          language: 'en',
          videoId,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Tactiq fetch error:', error)
    return null
  }
}

/**
 * Parse XML format captions
 */
function parseXMLCaptions(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []

  // Try multiple regex patterns
  const patterns = [
    /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g,
    /<text start='([^']+)' dur='([^']+)'[^>]*>([^<]*)<\/text>/g,
    /<text t="([^"]+)" d="([^"]+)"[^>]*>([^<]*)<\/text>/g,
  ]

  for (const regex of patterns) {
    let match
    while ((match = regex.exec(xml)) !== null) {
      const start = parseFloat(match[1])
      const duration = parseFloat(match[2])
      const text = decodeHTMLEntities(match[3])

      if (text.length > 0) {
        segments.push({ text, start, duration })
      }
    }
    if (segments.length > 0) break
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

/**
 * Translate text using Google Translate
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Translation failed')
    }

    const data = await response.json()

    // Google Translate returns nested array
    if (data && data[0]) {
      return data[0].map((item: [string]) => item[0]).join('')
    }

    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text
  }
}

/**
 * Format timestamp in seconds to MM:SS or HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
