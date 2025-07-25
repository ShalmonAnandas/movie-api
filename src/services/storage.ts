import * as fs from 'fs';
import * as path from 'path';
import { put, del, list } from '@vercel/blob';
import config from '../config';
import { BlobUploadResult, ExistingFileResult, PlaylistFetchResult } from '../types';

class StorageService {
  private playlistsDir: string;

  constructor() {
    this.playlistsDir = config.paths.playlists;
    
    // Ensure playlists directory exists for local development
    if (!config.blob.isEnabled && !fs.existsSync(this.playlistsDir)) {
      fs.mkdirSync(this.playlistsDir, { recursive: true });
    }

    // Start cleanup interval if Vercel Blob is enabled
    if (config.blob.isEnabled) {
      setInterval(() => {
        this.cleanupOldBlobFiles();
      }, config.cleanup.intervalDays * 24 * 60 * 60 * 1000);
    }
  }

  private generateFilename(tmdbId: string, type: 'movie' | 'show', season?: string, episode?: string): string {
    if (type === 'show' && season && episode) {
      return `${tmdbId}_s${season}e${episode}.m3u8`;
    }
    return `${tmdbId}_movie.m3u8`;
  }

  async checkExistingFile(
    tmdbId: string,
    type: 'movie' | 'show',
    season?: string,
    episode?: string
  ): Promise<ExistingFileResult | null> {
    const filename = this.generateFilename(tmdbId, type, season, episode);

    if (config.blob.isEnabled) {
      return this.checkExistingM3U8InVercelBlob(filename);
    } else {
      return this.checkExistingM3U8Locally(filename);
    }
  }

  private async checkExistingM3U8InVercelBlob(filename: string): Promise<ExistingFileResult | null> {
    if (!config.blob.isEnabled) {
      return null;
    }

    try {
      const pathname = `playlists/${filename}`;
      const { blobs } = await list({
        prefix: pathname,
        limit: 1
      });

      if (blobs.length > 0) {
        console.log(`Found existing M3U8 file in Vercel Blob: ${filename}`);
        return {
          exists: true,
          url: blobs[0].url,
          filename: filename,
          pathname: pathname
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing blob:', error);
      return null;
    }
  }

  private checkExistingM3U8Locally(filename: string): ExistingFileResult | null {
    try {
      const filePath = path.join(this.playlistsDir, filename);

      if (fs.existsSync(filePath)) {
        console.log(`Found existing M3U8 file locally: ${filename}`);
        return {
          exists: true,
          filename: filename,
          path: `/playlists/${filename}`
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing local file:', error);
      return null;
    }
  }

  async saveM3U8(
    content: string,
    tmdbId: string,
    type: 'movie' | 'show',
    season?: string,
    episode?: string
  ): Promise<BlobUploadResult | string> {
    const filename = this.generateFilename(tmdbId, type, season, episode);

    if (config.blob.isEnabled) {
      return this.uploadM3U8ToVercelBlob(content, filename);
    } else {
      return this.saveM3U8ToFile(content, filename);
    }
  }

  private async uploadM3U8ToVercelBlob(content: string, filename: string): Promise<BlobUploadResult> {
    if (!config.blob.isEnabled) {
      throw new Error('Vercel Blob not configured');
    }

    try {
      const pathname = `playlists/${filename}`;
      console.log(`Uploading ${filename} to Vercel Blob...`);

      const blob = await put(pathname, content, {
        access: 'public',
        contentType: 'application/vnd.apple.mpegurl',
        addRandomSuffix: false
      });

      console.log(`Successfully uploaded to Vercel Blob: ${filename}`);

      return {
        success: true,
        filename: filename,
        url: blob.url,
        pathname: pathname,
        size: content.length
      };
    } catch (error) {
      console.error('Error uploading to Vercel Blob:', error);
      throw new Error(`Failed to upload to Vercel Blob: ${(error as Error).message}`);
    }
  }

  private async saveM3U8ToFile(content: string, filename: string): Promise<string> {
    try {
      const filePath = path.join(this.playlistsDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');
      return `/playlists/${filename}`;
    } catch (error) {
      console.error('Error saving M3U8 file:', error);
      throw new Error('Failed to save playlist file');
    }
  }

  async fetchM3U8Playlist(url: string): Promise<PlaylistFetchResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
        throw new Error('URL does not contain valid M3U8 content');
      }

      return {
        success: true,
        content: content,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async cleanupOldBlobFiles(): Promise<void> {
    if (!config.blob.isEnabled) return;

    try {
      const { blobs } = await list({
        prefix: 'playlists/',
        limit: 1000
      });

      const cutoffTime = Date.now() - (config.cleanup.retentionHours * 60 * 60 * 1000);
      const filesToDelete = blobs.filter(blob => {
        const uploadTime = new Date(blob.uploadedAt).getTime();
        return uploadTime < cutoffTime;
      });

      if (filesToDelete.length > 0) {
        console.log(`Cleaning up ${filesToDelete.length} old blob files (older than ${config.cleanup.retentionHours} hours)...`);

        for (const blob of filesToDelete) {
          await del(blob.url);
          console.log(`Deleted old blob: ${blob.pathname}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up blob files:', error);
    }
  }
}

export default new StorageService();
