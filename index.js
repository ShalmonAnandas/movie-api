const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { put, del, list } = require('@vercel/blob');
const { makeProviders, makeStandardFetcher, targets } = require('@movie-web/providers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel Blob configuration
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Check if Vercel Blob is configured
const isVercelBlobEnabled = !!BLOB_READ_WRITE_TOKEN;
if (isVercelBlobEnabled) {
    console.log('Vercel Blob storage enabled');
} else {
    console.log('Vercel Blob not configured - will use local storage for development');
}

// Define playlists directory path for local development
const playlistsDir = path.join(__dirname, 'playlists');

// Initialize @movie-web/providers
const myFetcher = makeStandardFetcher(fetch);
const providers = makeProviders({
    fetcher: myFetcher,
    target: targets.NATIVE
});

// Helper function to upload M3U8 content to Vercel Blob
async function uploadM3U8ToVercelBlob(content, tmdbId, type, season = null, episode = null) {
    if (!isVercelBlobEnabled) {
        throw new Error('Vercel Blob not configured');
    }

    try {
        // Generate a unique filename
        const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
        const timestamp = Date.now();

        let filename;
        if (type === 'show' && season && episode) {
            filename = `${tmdbId}_s${season}e${episode}_${hash}_${timestamp}.m3u8`;
        } else {
            filename = `${tmdbId}_movie_${hash}_${timestamp}.m3u8`;
        }

        const pathname = `playlists/${filename}`;

        console.log(`Uploading ${filename} to Vercel Blob...`);

        // Upload to Vercel Blob
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
        throw new Error(`Failed to upload to Vercel Blob: ${error.message}`);
    }
}

// Cleanup old files from Vercel Blob (optional)
async function cleanupOldBlobFiles() {
    if (!isVercelBlobEnabled) return;

    try {
        const { blobs } = await list({
            prefix: 'playlists/',
            limit: 1000
        });

        const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour
        const filesToDelete = blobs.filter(blob => {
            const uploadTime = new Date(blob.uploadedAt).getTime();
            return uploadTime < oneHourAgo;
        });

        if (filesToDelete.length > 0) {
            console.log(`Cleaning up ${filesToDelete.length} old blob files...`);

            for (const blob of filesToDelete) {
                await del(blob.url);
                console.log(`Deleted old blob: ${blob.pathname}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up blob files:', error);
    }
}

// Run cleanup every 30 minutes
if (isVercelBlobEnabled) {
    setInterval(cleanupOldBlobFiles, 30 * 60 * 1000);
}

// Fallback function to save M3U8 content locally (for development)
async function saveM3U8ToFile(content, tmdbId, type, season = null, episode = null) {
    try {
        // Generate a unique filename based on content and metadata
        const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
        const timestamp = Date.now();

        let filename;
        if (type === 'show' && season && episode) {
            filename = `${tmdbId}_s${season}e${episode}_${hash}_${timestamp}.m3u8`;
        } else {
            filename = `${tmdbId}_movie_${hash}_${timestamp}.m3u8`;
        }

        const filePath = path.join(playlistsDir, filename);

        // Write the M3U8 content to file
        fs.writeFileSync(filePath, content, 'utf8');

        // Return the URL path (relative to the server)
        return `/playlists/${filename}`;
    } catch (error) {
        console.error('Error saving M3U8 file:', error);
        throw new Error('Failed to save playlist file');
    }
}// Helper function to fetch M3U8 playlist content
async function fetchM3U8Playlist(url) {
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

        // Validate that it's actually an M3U8 file
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
            error: error.message
        };
    }
}


// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static playlist files (only for local development when not using Vercel Blob)
if (!isVercelBlobEnabled) {
    app.use('/playlists', express.static(playlistsDir, {
        setHeaders: (res, path) => {
            if (path.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));
}

// Routes
app.get('/', (req, res) => {
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
                description: 'HLS streams automatically upload M3U8 playlists to Vercel Blob',
                workflow: [
                    '1. Call /api/scrape with tmdbId to get stream sources',
                    '2. If stream type is "hls", M3U8 playlist is uploaded to Vercel Blob',
                    '3. Use the playlistUrl (direct CDN link) in your HLS player',
                    '4. Falls back to local storage if Vercel Blob is not configured'
                ],
                response_fields: {
                    'playlistUrl': 'Direct CDN URL from Vercel Blob (for HLS streams)',
                    'playlistFilename': 'Generated filename for the playlist',
                    'playlistPathname': 'Blob storage pathname',
                    'playlistFetched': 'Boolean indicating if playlist was successfully fetched and uploaded',
                    'playlistError': 'Error message if playlist fetch/upload failed',
                    'playlistSize': 'Size of the uploaded playlist in bytes',
                    'storageType': 'Storage method used: vercel_blob, local, or direct_content'
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
});

// Test endpoint to verify @movie-web/providers
app.get('/api/test', async (req, res) => {
    try {
        res.json({
            message: '@movie-web/providers is working!',
            target: 'NATIVE',
            fetcher: 'Standard fetcher initialized'
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            error: 'Failed to initialize @movie-web/providers',
            details: error.message
        });
    }
});

// Search for movies/shows
app.get('/api/search', async (req, res) => {
    try {
        const { query, type = 'movie' } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // For search, we would typically use TMDB API or other search services
        // @movie-web/providers is mainly for getting streaming sources
        res.json({
            message: 'Search functionality would require additional TMDB integration',
            query,
            type,
            note: 'Use /api/scrape with known TMDB IDs to get streaming sources'
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search for content' });
    }
});

// Get streaming sources for a specific movie/show
app.get('/api/scrape', async (req, res) => {
    try {
        const { tmdbId, type = 'movie', season, episode, title, year } = req.query;

        if (!tmdbId) {
            return res.status(400).json({ error: 'tmdbId parameter is required' });
        }

        // Build media object according to the documentation
        const media = {
            type: type, // 'movie' or 'show'
            title: title || 'Unknown Title', // You should provide title for better results
            releaseYear: year ? parseInt(year) : 0,
            tmdbId: tmdbId
        };

        // For TV shows, add season and episode
        if (type === 'show') {
            if (!season || !episode) {
                return res.status(400).json({
                    error: 'season and episode parameters are required for TV shows'
                });
            }
            media.season = {
                number: parseInt(season)
            };
            media.episode = {
                number: parseInt(episode)
            };
        }

        console.log('Scraping media:', media);

        // Use the correct API as per documentation
        const output = await providers.runAll({
            media: media
        });

        console.log('Provider output:', output);

        // Process the output and fetch M3U8 content for HLS streams
        let sources = [];

        if (output.stream) {
            const source = {
                embedId: output.embeds?.[0]?.embedId || 'unknown',
                streamId: output.stream?.id || 'unknown',
                quality: output.stream?.qualities?.['1080'] ? '1080p' : 'unknown',
                type: output.stream?.type || 'unknown',
                url: output.stream?.playlist || output.stream?.file || null
            };

            // If it's an HLS stream, fetch the M3U8 content and upload to Google Drive
            if (source.type === 'hls' && source.url) {
                console.log('Fetching M3U8 playlist for HLS stream:', source.url);

                const playlistResult = await fetchM3U8Playlist(source.url);

                if (playlistResult.success) {
                    try {
                        if (isVercelBlobEnabled) {
                            // Upload to Vercel Blob
                            const uploadResult = await uploadM3U8ToVercelBlob(
                                playlistResult.content,
                                tmdbId,
                                type,
                                season,
                                episode
                            );

                            source.playlistUrl = uploadResult.url;
                            source.playlistFilename = uploadResult.filename;
                            source.playlistPathname = uploadResult.pathname;
                            source.playlistFetched = true;
                            source.playlistSize = playlistResult.size;
                            source.storageType = 'vercel_blob';

                            console.log(`Successfully uploaded M3U8 playlist (${playlistResult.size} bytes) to Vercel Blob`);
                        } else {
                            // Fallback to local storage for development
                            const localUrl = await saveM3U8ToFile(
                                playlistResult.content,
                                tmdbId,
                                type,
                                season,
                                episode
                            );

                            const baseUrl = req.protocol + '://' + req.get('host');
                            source.playlistUrl = baseUrl + localUrl;
                            source.playlistFetched = true;
                            source.playlistSize = playlistResult.size;
                            source.storageType = 'local';

                            console.log(`Successfully saved M3U8 playlist (${playlistResult.size} bytes) locally`);
                        }
                    } catch (uploadError) {
                        // If upload fails, include content directly
                        source.m3u8Content = playlistResult.content;
                        source.playlistFetched = false;
                        source.playlistError = uploadError.message;
                        source.storageType = 'direct_content';
                        console.error('Upload failed, including content directly:', uploadError);
                    }
                } else {
                    source.playlistFetched = false;
                    source.playlistError = playlistResult.error;
                    console.error('Failed to fetch M3U8 playlist:', playlistResult.error);
                }
            }

            if (source.url) {
                sources.push(source);
            }
        }

        res.json({
            tmdbId,
            type,
            title: media.title,
            year: media.releaseYear,
            season: type === 'show' ? season : undefined,
            episode: type === 'show' ? episode : undefined,
            sources: sources,
            embeds: output.embeds || [],
            raw: output // Include raw output for debugging
        });
    } catch (error) {
        console.error('Scrape error:', error);
        res.status(500).json({
            error: 'Failed to get streaming sources',
            details: error.message
        });
    }
});

// Get M3U8 playlist content from HLS stream URL
app.get('/api/playlist', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                error: 'url parameter is required',
                example: '/api/playlist?url=https://example.com/stream.m3u8'
            });
        }

        // Validate that the URL is for an M3U8 playlist
        if (!url.includes('.m3u8') && !url.includes('playlist')) {
            return res.status(400).json({
                error: 'URL must be a valid M3U8 playlist URL',
                provided: url
            });
        }

        // Use the helper function to fetch M3U8 content
        const playlistResult = await fetchM3U8Playlist(url);

        if (!playlistResult.success) {
            return res.status(500).json({
                error: 'Failed to fetch playlist',
                details: playlistResult.error,
                url: url
            });
        }

        // Set appropriate headers for M3U8 content
        res.set({
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Cache-Control': 'no-cache',
            'Content-Length': playlistResult.size.toString()
        });

        // Return the raw M3U8 playlist content
        res.send(playlistResult.content);

    } catch (error) {
        console.error('Playlist fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch M3U8 playlist',
            details: error.message
        });
    }
});

// Proxy endpoint for streaming segments (optional)
app.get('/api/segment', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                error: 'url parameter is required',
                example: '/api/segment?url=https://example.com/segment.ts'
            });
        }

        // Fetch the video segment
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Range': req.headers.range || undefined
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Failed to fetch segment',
                status: response.status,
                url: url
            });
        }

        // Copy headers from the original response
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

        // Stream the video data
        const reader = response.body.getReader();

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
            details: error.message
        });
    }
});

app.get('/api/movies', (req, res) => {
    res.json({
        message: 'This endpoint is deprecated. Use /api/search instead.',
        example: '/api/search?query=inception&type=movie'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
