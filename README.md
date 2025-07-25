# Movie API

A REST API for searching and getting streaming sources for movies and TV shows using @movie-web/providers.

## Features

- Search for movies and TV shows
- Get streaming sources for specific content
- Built with Express.js and @movie-web/providers
- CORS enabled for web applications
- Error handling and logging

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### GET /

Returns API information and available endpoints.

### GET /api/search

Search for movies or TV shows.

**Parameters:**
- `query` (required): Search term
- `type` (optional): "movie" or "show" (default: "movie")

**Example:**
```
GET /api/search?query=inception&type=movie
```

**Response:**
```json
{
  "query": "inception",
  "type": "movie",
  "results": [
    {
      "id": "123",
      "title": "Inception",
      "year": 2010,
      "type": "movie"
    }
  ]
}
```

### GET /api/scrape

Get streaming sources for a specific movie or TV show episode.

**Parameters:**
- `tmdbId` (required): The Movie Database ID
- `type` (optional): "movie" or "show" (default: "movie")
- `season` (required for shows): Season number
- `episode` (required for shows): Episode number

**Example for movie:**
```
GET /api/scrape?tmdbId=27205&type=movie
```

**Example for TV show:**
```
GET /api/scrape?tmdbId=1396&type=show&season=1&episode=1
```

**Response:**
```json
{
  "tmdbId": "27205",
  "type": "movie",
  "sources": [
    {
      "embedId": "example",
      "streamId": "stream123",
      "quality": "1080p",
      "type": "hls",
      "url": "https://example.com/stream.m3u8"
    }
  ]
}
```

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000

# Vercel Blob Configuration (for M3U8 playlist storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_1234567890abcdef
```

### Vercel Blob Setup (Recommended for Production)

For production deployment on Vercel, configure Vercel Blob to store M3U8 playlist files:

1. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Deploy your project

2. **Enable Blob Storage**:
   - Go to your Vercel dashboard
   - Navigate to your project
   - Click on the "Storage" tab
   - Create a Blob store (if not already created)

3. **Get the Token**:
   - In the Storage tab, you'll see your Blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`
   - For Vercel deployments, this is automatically available
   - For local development, add it to your `.env` file

4. **Configure Environment Variable**:
   - In Vercel dashboard → Project → Settings → Environment Variables
   - Add `BLOB_READ_WRITE_TOKEN` with your token value
   - Redeploy your project

**Benefits of Vercel Blob:**
- ✅ **5GB free storage** + 100GB bandwidth/month
- ✅ **Global CDN** - files served from edge locations worldwide
- ✅ **Perfect HLS integration** - optimized for streaming
- ✅ **Automatic cleanup** - old files are automatically cleaned up
- ✅ **No external setup** - native Vercel integration

**Note**: If Vercel Blob is not configured, the API will fall back to including M3U8 content directly in the response or using local storage for development.

## Deployment

This API is configured for deployment on Vercel with the included `vercel.json` configuration.

## Error Handling

The API includes comprehensive error handling:
- 400: Bad Request (missing required parameters)
- 404: Not Found (invalid routes)
- 500: Internal Server Error (provider or server errors)

All errors are logged to the console for debugging.

## Legal Notice

This API is for educational purposes only. Make sure to comply with your local laws and the terms of service of the content providers when using this API.
