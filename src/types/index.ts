export interface MediaObject {
  type: 'movie' | 'show';
  title: string;
  releaseYear: number;
  tmdbId: string;
  season?: {
    number: number;
  };
  episode?: {
    number: number;
  };
}

export interface StreamSource {
  embedId: string;
  streamId: string;
  quality: string;
  type: string;
  playlistUrl?: string;
  playlistFilename?: string;
  playlistPathname?: string;
  playlistFetched?: boolean;
  playlistError?: string;
  playlistSize?: number;
  storageType?: 'vercel_blob' | 'local' | 'direct_content';
  fromCache?: boolean;
  m3u8Content?: string;
}

export interface ProviderOutput {
  stream?: {
    id: string;
    type: string;
    playlist?: string;
    file?: string;
    qualities?: Record<string, any>;
  };
  embeds?: Array<{
    embedId: string;
  }>;
}

export interface PlaylistFetchResult {
  success: boolean;
  content?: string;
  size?: number;
  error?: string;
}

export interface BlobUploadResult {
  success: boolean;
  filename: string;
  url: string;
  pathname: string;
  size: number;
}

export interface ExistingFileResult {
  exists: boolean;
  url?: string;
  filename?: string;
  pathname?: string;
  path?: string;
}

export interface ApiResponse {
  tmdbId: string;
  type: 'movie' | 'show';
  title: string;
  year: number;
  season?: string;
  episode?: string;
  sources: StreamSource[];
  embeds: any[];
  cached: boolean;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
