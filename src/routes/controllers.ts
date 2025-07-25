import { Request, Response } from 'express';
import movieProvider from '../services/movieProvider';
import storageService from '../services/storage';
import { ApiResponse, StreamSource } from '../types';

export const healthCheck = (req: Request, res: Response): void => {
  res.json({
    message: 'Movie API is running!',
    endpoints: {
      search: '/api/search?query=movie_name&type=movie|show',
      scrape: '/api/scrape?tmdbId=123&type=movie|show&season=1&episode=1',
      playlist: '/api/playlist?url=https://example.com/stream.m3u8',
      segment: '/api/segment?url=https://example.com/segment.ts',
      playlists: '/playlists/{filename}.m3u8 - Serve saved M3U8 files',
      test: '/api/test - Test @movie-web/providers functionality'
    },
    usage: {
      hls_example: {
        description: 'HLS streams use predictable filenames and check for existing files before scraping',
        workflow: [
          '1. Call /api/scrape with tmdbId to get stream sources',
          '2. API checks if M3U8 playlist already exists in storage',
          '3. If exists, returns cached URL immediately (fromCache: true)',
          '4. If not exists, fetches M3U8 playlist and uploads to storage',
          '5. Use the playlistUrl (direct CDN link) in your HLS player',
          '6. Falls back to local storage if Vercel Blob is not configured'
        ],
        response_fields: {
          'playlistUrl': 'Direct CDN URL from Vercel Blob (for HLS streams)',
          'playlistFilename': 'Predictable filename: {tmdbId}_movie.m3u8 or {tmdbId}_s{season}e{episode}.m3u8',
          'playlistPathname': 'Blob storage pathname',
          'playlistFetched': 'Boolean indicating if playlist was successfully fetched/found',
          'playlistError': 'Error message if playlist fetch/upload failed',
          'playlistSize': 'Size of the uploaded playlist in bytes (only for new uploads)',
          'storageType': 'Storage method used: vercel_blob, local, or direct_content',
          'fromCache': 'Boolean indicating if the file was retrieved from existing storage'
        }
      },
      vercel_blob_setup: {
        description: 'Setup instructions for Vercel Blob integration',
        steps: [
          '1. Deploy your project to Vercel',
          '2. Go to your Vercel dashboard → Project → Storage',
          '3. Create a Blob store (if not already created)',
          '4. Copy the BLOB_READ_WRITE_TOKEN from the dashboard',
          '5. Set environment variable: BLOB_READ_WRITE_TOKEN',
          '6. Redeploy your project'
        ],
        pricing: {
          free_tier: '5GB storage + 100GB bandwidth/month',
          paid: '$0.15/GB storage + $0.30/GB bandwidth'
        }
      }
    }
  });
};

export const testProvider = (req: Request, res: Response): void => {
  try {
    const result = movieProvider.test();
    res.json(result);
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      error: 'Failed to initialize @movie-web/providers',
      details: (error as Error).message
    });
  }
};

export const searchContent = (req: Request, res: Response): void => {
  const { query, type = 'movie' } = req.query;

  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  res.json({
    message: 'Search functionality would require additional TMDB integration',
    query,
    type,
    note: 'Use /api/scrape with known TMDB IDs to get streaming sources'
  });
};

export const scrapeContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tmdbId, type = 'movie', season, episode, title, year } = req.query;

    if (!tmdbId || typeof tmdbId !== 'string') {
      res.status(400).json({ error: 'tmdbId parameter is required' });
      return;
    }

    // Build media object
    const media = movieProvider.buildMediaObject(
      tmdbId,
      type as 'movie' | 'show',
      title as string || 'Unknown Title',
      year as string,
      season as string || null,
      episode as string || null
    );

    console.log('Scraping media:', media);

    // Check if we already have a stored M3U8 file before scraping
    const existingFile = await storageService.checkExistingFile(
      tmdbId,
      type as 'movie' | 'show',
      season as string,
      episode as string
    );

    if (existingFile?.exists) {
      // Return cached file without scraping
      const source: StreamSource = {
        embedId: 'cached',
        streamId: 'cached',
        quality: 'unknown',
        type: 'hls',
        playlistFetched: true,
        fromCache: true
      };

      if (existingFile.url) {
        source.playlistUrl = existingFile.url;
        source.playlistFilename = existingFile.filename;
        source.playlistPathname = existingFile.pathname;
        source.storageType = 'vercel_blob';
      } else if (existingFile.path) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        source.playlistUrl = baseUrl + existingFile.path;
        source.playlistFilename = existingFile.filename;
        source.storageType = 'local';
      }

      console.log(`Using existing M3U8 file without scraping: ${existingFile.filename}`);

      const response: ApiResponse = {
        tmdbId,
        type: type as 'movie' | 'show',
        title: media.title,
        year: media.releaseYear,
        season: type === 'show' ? season as string : undefined,
        episode: type === 'show' ? episode as string : undefined,
        sources: [source],
        embeds: [],
        cached: true,
        message: 'Returned cached playlist without scraping'
      };

      res.json(response);
      return;
    }

    // If no cached file exists, proceed with scraping
    console.log('No cached file found, proceeding with scraping...');

    const output = await movieProvider.searchSources(media);
    const sources: StreamSource[] = [];

    if (output.stream) {
      const source: StreamSource = {
        embedId: output.embeds?.[0]?.embedId || 'unknown',
        streamId: output.stream.id || 'unknown',
        quality: output.stream.qualities?.['1080'] ? '1080p' : 'unknown',
        type: output.stream.type || 'unknown'
      };

      // If it's an HLS stream, fetch the M3U8 content and upload to storage
      const streamUrl = output.stream.playlist || output.stream.file || null;
      if (source.type === 'hls' && streamUrl) {
        console.log('Fetching M3U8 playlist for HLS stream:', streamUrl);

        const playlistResult = await storageService.fetchM3U8Playlist(streamUrl);

        if (playlistResult.success && playlistResult.content) {
          try {
            const uploadResult = await storageService.saveM3U8(
              playlistResult.content,
              tmdbId,
              type as 'movie' | 'show',
              season as string,
              episode as string
            );

            if (typeof uploadResult === 'string') {
              // Local storage
              const baseUrl = `${req.protocol}://${req.get('host')}`;
              source.playlistUrl = baseUrl + uploadResult;
              source.playlistFetched = true;
              source.playlistSize = playlistResult.size;
              source.storageType = 'local';
              source.fromCache = false;
            } else {
              // Vercel Blob storage
              source.playlistUrl = uploadResult.url;
              source.playlistFilename = uploadResult.filename;
              source.playlistPathname = uploadResult.pathname;
              source.playlistFetched = true;
              source.playlistSize = playlistResult.size;
              source.storageType = 'vercel_blob';
              source.fromCache = false;
            }

            console.log(`Successfully saved M3U8 playlist (${playlistResult.size} bytes)`);
          } catch (uploadError) {
            // If upload fails, include content directly
            source.m3u8Content = playlistResult.content;
            source.playlistFetched = false;
            source.playlistError = (uploadError as Error).message;
            source.storageType = 'direct_content';
            source.fromCache = false;
            console.error('Upload failed, including content directly:', uploadError);
          }
        } else {
          source.playlistFetched = false;
          source.playlistError = playlistResult.error;
          source.fromCache = false;
          console.error('Failed to fetch M3U8 playlist:', playlistResult.error);
        }
      }

      if (streamUrl) {
        sources.push(source);
      }
    }

    const response: ApiResponse = {
      tmdbId,
      type: type as 'movie' | 'show',
      title: media.title,
      year: media.releaseYear,
      season: type === 'show' ? season as string : undefined,
      episode: type === 'show' ? episode as string : undefined,
      sources: sources,
      embeds: output.embeds || [],
      cached: false
    };

    res.json(response);
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({
      error: 'Failed to get streaming sources',
      details: (error as Error).message
    });
  }
};

export const getPlaylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: 'url parameter is required',
        example: '/api/playlist?url=https://example.com/stream.m3u8'
      });
      return;
    }

    if (!url.includes('.m3u8') && !url.includes('playlist')) {
      res.status(400).json({
        error: 'URL must be a valid M3U8 playlist URL',
        provided: url
      });
      return;
    }

    const playlistResult = await storageService.fetchM3U8Playlist(url);

    if (!playlistResult.success) {
      res.status(500).json({
        error: 'Failed to fetch playlist',
        details: playlistResult.error,
        url: url
      });
      return;
    }

    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache',
      'Content-Length': playlistResult.size?.toString() || '0'
    });

    res.send(playlistResult.content);
  } catch (error) {
    console.error('Playlist fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch M3U8 playlist',
      details: (error as Error).message
    });
  }
};

export const getSegment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: 'url parameter is required',
        example: '/api/segment?url=https://example.com/segment.ts'
      });
      return;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Range': req.headers.range || undefined
      }
    });

    if (!response.ok) {
      res.status(response.status).json({
        error: 'Failed to fetch segment',
        status: response.status,
        url: url
      });
      return;
    }

    const contentType = response.headers.get('content-type') || 'video/mp2t';
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');

    res.set({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'public, max-age=3600'
    });

    if (contentLength) res.set('Content-Length', contentLength);
    if (acceptRanges) res.set('Accept-Ranges', acceptRanges);

    const reader = response.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: 'Failed to read response body' });
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (error) {
    console.error('Segment fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch video segment',
      details: (error as Error).message
    });
  }
};

export const deprecatedMovies = (req: Request, res: Response): void => {
  res.json({
    message: 'This endpoint is deprecated. Use /api/search instead.',
    example: '/api/search?query=inception&type=movie'
  });
};
