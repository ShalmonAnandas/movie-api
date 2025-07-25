# 🎬 Movie API

A modern, TypeScript-based Movie & TV Show streaming API built with Express.js and [@movie-web/providers](https://github.com/movie-web/providers). Features automatic M3U8 playlist caching, Vercel Blob storage integration, and HLS stream proxying.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShalmonAnandas%2Fmovie-api&env=BLOB_READ_WRITE_TOKEN&envDescription=Vercel%20Blob%20storage%20token%20for%20M3U8%20playlist%20caching&envLink=https%3A%2F%2Fvercel.com%2Fdocs%2Fstorage%2Fvercel-blob%2Fquickstart&project-name=movie-api&repository-name=movie-api)

## ✨ Features

- 🔍 **Stream Source Discovery**: Get streaming sources for movies and TV shows using TMDB IDs
- 📺 **HLS Stream Support**: Automatic M3U8 playlist fetching and caching
- ☁️ **Vercel Blob Integration**: Cloud storage for playlist files with automatic cleanup
- 🚀 **TypeScript**: Fully typed codebase for better developer experience
- 📱 **CORS Enabled**: Ready for frontend integration
- 🔒 **Security**: Helmet.js security headers and input validation
- 📊 **Logging**: Morgan HTTP request logging
- 🎯 **Smart Caching**: Predictable filenames prevent duplicate scraping

## 🚀 Quick Start

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShalmonAnandas%2Fmovie-api&env=BLOB_READ_WRITE_TOKEN&envDescription=Vercel%20Blob%20storage%20token%20for%20M3U8%20playlist%20caching&envLink=https%3A%2F%2Fvercel.com%2Fdocs%2Fstorage%2Fvercel-blob%2Fquickstart&project-name=movie-api&repository-name=movie-api)

1. Click the deploy button above
2. Connect your GitHub account and fork the repository
3. Configure the `BLOB_READ_WRITE_TOKEN` environment variable (see [Blob Setup](#-vercel-blob-setup) below)
4. Deploy and start using your API!

### Local Development

```bash
# Clone the repository
git clone https://github.com/ShalmonAnandas/movie-api.git
cd movie-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env and add your BLOB_READ_WRITE_TOKEN (optional for local dev)

# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🛠️ Vercel Blob Setup

Vercel Blob is used for storing M3U8 playlist files in the cloud. This enables:
- ✅ Fast CDN-delivered playlists
- ✅ Automatic cleanup of old files
- ✅ No local storage needed
- ✅ Scalable across multiple deployments

### Setup Steps:

1. **Deploy to Vercel** (if not already deployed)
   ```bash
   npx vercel --prod
   ```

2. **Create Blob Storage**
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Navigate to **Storage** tab
   - Click **Create Database** → **Blob**
   - Choose a name (e.g., "movie-api-storage")

3. **Get Your Token**
   - In the Blob storage dashboard, copy the `BLOB_READ_WRITE_TOKEN`
   - Or find it in: Project → Settings → Environment Variables

4. **Set Environment Variable**
   - In Vercel Dashboard: Project → Settings → Environment Variables
   - Add: `BLOB_READ_WRITE_TOKEN` = `your_token_here`
   - **Or** use Vercel CLI:
   ```bash
   vercel env add BLOB_READ_WRITE_TOKEN
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

### Pricing
- **Free Tier**: 5GB storage + 100GB bandwidth/month
- **Pro**: $0.15/GB storage + $0.30/GB bandwidth

> **Note**: Without Vercel Blob, the API falls back to local file storage (development only).

## 📚 API Documentation

### Base URL
- **Production**: `https://your-deployment.vercel.app`
- **Development**: `http://localhost:3000`

### Endpoints

#### Health Check
```http
GET /
```
Returns API status and available endpoints.

#### Test Provider
```http
GET /api/test
```
Verify @movie-web/providers integration.

#### Search (Placeholder)
```http
GET /api/search?query=movie_name&type=movie
```
- `query` (required): Search term
- `type` (optional): `movie` or `show` (default: `movie`)

> **Note**: This endpoint currently returns a placeholder. Integration with TMDB API would be needed for actual search functionality.

#### Scrape Streaming Sources
```http
GET /api/scrape?tmdbId=27205&type=movie&title=Inception&year=2010
```

**Parameters:**
- `tmdbId` (required): TMDB ID of the content
- `type` (required): `movie` or `show`
- `title` (optional): Title for better matching
- `year` (optional): Release year
- `season` (required for shows): Season number
- `episode` (required for shows): Episode number

**Example Response:**
```json
{
  "tmdbId": "27205",
  "type": "movie",
  "title": "Inception",
  "year": 2010,
  "sources": [
    {
      "embedId": "upstream",
      "streamId": "stream123",
      "quality": "1080p",
      "type": "hls",
      "playlistUrl": "https://blob.vercel-storage.com/playlists/27205_movie.m3u8",
      "playlistFilename": "27205_movie.m3u8",
      "playlistFetched": true,
      "storageType": "vercel_blob",
      "fromCache": false
    }
  ],
  "cached": false
}
```

#### TV Show Example
```http
GET /api/scrape?tmdbId=1396&type=show&season=1&episode=1&title=Breaking%20Bad&year=2008
```

#### Get M3U8 Playlist
```http
GET /api/playlist?url=https://example.com/stream.m3u8
```
Fetch and return M3U8 playlist content with proper headers.

#### Video Segment Proxy
```http
GET /api/segment?url=https://example.com/segment.ts
```
Proxy video segments with range request support.

### Response Fields

| Field | Description |
|-------|-------------|
| `playlistUrl` | Direct CDN URL for HLS players |
| `playlistFilename` | Predictable filename: `{tmdbId}_movie.m3u8` or `{tmdbId}_s{season}e{episode}.m3u8` |
| `playlistFetched` | Boolean indicating successful playlist fetch |
| `storageType` | Storage method: `vercel_blob`, `local`, or `direct_content` |
| `fromCache` | Boolean indicating if file was retrieved from cache |

### Caching Strategy

The API uses predictable filenames for intelligent caching:
- **Movies**: `{tmdbId}_movie.m3u8`
- **TV Shows**: `{tmdbId}_s{season}e{episode}.m3u8`

Benefits:
- ✅ Avoids re-scraping the same content
- ✅ Instant responses for cached content
- ✅ Reduces load on upstream providers
- ✅ Automatic cleanup after 24 hours

## 🧪 Testing with Postman

Import the included Postman collection (`Movie-API-Postman-Collection.json`) for comprehensive API testing:

1. Open Postman
2. Import → Upload Files → Select `Movie-API-Postman-Collection.json`
3. Set environment variables:
   - `baseUrl`: Your API URL
   - `movieTmdbId`: `27205` (Inception)
   - `showTmdbId`: `1396` (Breaking Bad)

The collection includes:
- ✅ Health checks and provider tests
- ✅ Movie and TV show scraping examples
- ✅ Error handling tests
- ✅ HLS playlist validation
- ✅ Caching behavior verification

## 🏗️ Project Structure

```
movie-api/
├── src/
│   ├── config/           # Configuration and environment variables
│   ├── middleware/       # Express middleware setup
│   ├── routes/           # API routes and controllers
│   ├── services/         # Business logic (providers, storage)
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # Application entry point
├── dist/                 # Compiled JavaScript (auto-generated)
├── playlists/           # Local M3U8 storage (development only)
├── .env.example         # Environment variables template
├── tsconfig.json        # TypeScript configuration
├── vercel.json          # Vercel deployment configuration
└── Movie-API-Postman-Collection.json # API testing collection
```

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
PORT=3000

# Vercel Blob Configuration (optional for local development)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_1234567890abcdef
```

## 🛡️ Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Missing or invalid parameters
- **404 Not Found**: Invalid endpoints
- **500 Internal Server Error**: Provider or storage failures

All errors return JSON with descriptive messages:
```json
{
  "error": "tmdbId parameter is required",
  "details": "Additional error context when available"
}
```

## 🚦 Rate Limiting & Usage

**Recommendations:**
- Cache responses in your application when possible
- Use the caching features to avoid redundant requests
- Monitor your Vercel Blob usage if using the storage feature

**Best Practices:**
- Always include `title` and `year` parameters for better matching
- Check the `fromCache` field to understand response source
- Handle errors gracefully in your frontend application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This API is for educational purposes. Users are responsible for ensuring compliance with applicable laws and terms of service of content providers. The developers are not responsible for how this API is used.

## 🙏 Acknowledgments

- [@movie-web/providers](https://github.com/movie-web/providers) - The core streaming source provider
- [Express.js](https://expressjs.com/) - Web application framework
- [Vercel](https://vercel.com/) - Hosting and Blob storage
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

**[🚀 Deploy Now](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShalmonAnandas%2Fmovie-api&env=BLOB_READ_WRITE_TOKEN&envDescription=Vercel%20Blob%20storage%20token%20for%20M3U8%20playlist%20caching&envLink=https%3A%2F%2Fvercel.com%2Fdocs%2Fstorage%2Fvercel-blob%2Fquickstart&project-name=movie-api&repository-name=movie-api)** | **[📖 API Docs](#-api-documentation)** | **[🧪 Test with Postman](#-testing-with-postman)**
