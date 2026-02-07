/*
YouTube Search API Integration
Uses Google's YouTube Data API v3 to search for videos
*/

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
}

export const searchYouTube = async (
  query: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> => {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      // Get detailed error information
      const errorData = await response.json().catch(() => null);

      // Return empty array silently - API may not be configured
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      description: item.snippet.description,
    }));
  } catch (error) {
    // Return empty array silently
    return [];
  }
};
