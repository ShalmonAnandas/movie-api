# Vercel Blob Setup Guide

## Step-by-Step Instructions

### 1. Deploy to Vercel
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Deploy with default settings

### 2. Access Storage Settings
1. Go to your Vercel dashboard
2. Click on your deployed project
3. Navigate to the "Storage" tab
4. If you don't see a Blob store, click "Create Database" → "Blob"

### 3. Get Your Blob Token
1. In the Storage tab, you'll see your Blob store
2. Click on it to view details
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. This token is automatically available in your Vercel deployment

### 4. Configure Environment Variables

#### For Vercel Deployment (Automatic):
- The `BLOB_READ_WRITE_TOKEN` is automatically available
- No manual configuration needed
- Your app will detect and use Vercel Blob automatically

#### For Local Development:
1. Copy your `.env.example` to `.env`
2. Add your token:
```env
PORT=3000
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_actual_token_here
```

#### For Other Platforms (Railway, Render, etc.):
1. Get your token from Vercel dashboard
2. Set the environment variable in your hosting platform
3. The app will work the same way

### 5. Test Your Setup
1. Deploy/restart your application
2. Check logs for "Vercel Blob storage enabled"
3. Make a scrape request with HLS content
4. Verify files are created in your Vercel Blob dashboard

## Vercel Blob Features

### ✅ **Advantages:**
- **Global CDN**: Files served from edge locations worldwide
- **Perfect for HLS**: Optimized content type and caching
- **Automatic scaling**: Handles traffic spikes automatically
- **Native integration**: Works seamlessly with Vercel
- **Simple setup**: No external services needed
- **Automatic cleanup**: Built-in file lifecycle management

### 💰 **Pricing:**
- **Free Tier**: 5GB storage + 100GB bandwidth/month
- **Pro Tier**: $0.15/GB storage + $0.30/GB bandwidth
- **No API quotas**: Unlimited read/write operations

### 📊 **Typical Usage:**
- **M3U8 files**: Usually 1-10KB each
- **5GB free tier**: Can store ~500,000 to 5,000,000 playlists
- **100GB bandwidth**: Serves ~10,000,000 to 100,000,000 playlist requests

## Response Format

When Vercel Blob is enabled, your API responses will include:

```json
{
  "sources": [{
    "type": "hls",
    "playlistUrl": "https://abc123def456.public.blob.vercel-storage.com/playlists/123456_movie_abcd1234_1640995200000.m3u8",
    "playlistFilename": "123456_movie_abcd1234_1640995200000.m3u8",
    "playlistPathname": "playlists/123456_movie_abcd1234_1640995200000.m3u8",
    "playlistFetched": true,
    "playlistSize": 2048,
    "storageType": "vercel_blob"
  }]
}
```

## Troubleshooting

### **"Vercel Blob not configured"**
- Check if `BLOB_READ_WRITE_TOKEN` environment variable is set
- Verify the token is correct in Vercel dashboard
- Ensure you've created a Blob store in your project

### **"Failed to upload to Vercel Blob"**
- Check your Vercel Blob storage quota
- Verify token permissions
- Check Vercel dashboard for error logs

### **Files not appearing in dashboard**
- Files are uploaded to the `playlists/` prefix
- Check the Blob store browser in Vercel dashboard
- Files are automatically cleaned up after 1 hour

### **Local development issues**
- Ensure you have the token in your local `.env` file
- The token from Vercel dashboard works for local development too
- Restart your local server after adding the token

## Cleanup and Management

### Automatic Cleanup:
- Files older than 1 hour are automatically deleted
- Runs every 30 minutes
- Prevents storage quota from filling up

### Manual Cleanup:
```javascript
// Access cleanup function manually (for debugging)
await cleanupOldBlobFiles();
```

### Monitor Usage:
- Check Vercel dashboard → Project → Storage → Blob
- View storage usage and bandwidth consumption
- Set up usage alerts if needed

## Migration from Google Drive

If you were previously using Google Drive:

1. Remove these environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID`

2. Add Vercel Blob token:
   - `BLOB_READ_WRITE_TOKEN`

3. The API will automatically use Vercel Blob instead
4. Old Google Drive files will remain but won't be used

## Security Notes

- **Token security**: Keep your `BLOB_READ_WRITE_TOKEN` secure
- **Public access**: Uploaded files are publicly accessible (required for HLS)
- **No authentication**: Files can be accessed by anyone with the URL
- **Automatic expiry**: Files are cleaned up automatically
