import { Router } from 'express';
import * as controllers from './controllers';

const router = Router();

// Health check
router.get('/', controllers.healthCheck);

// Test endpoint
router.get('/api/test', controllers.testProvider);

// Search endpoint
router.get('/api/search', controllers.searchContent);

// Scrape endpoint
router.get('/api/scrape', controllers.scrapeContent);

// Playlist endpoint
router.get('/api/playlist', controllers.getPlaylist);

// Segment proxy endpoint
router.get('/api/segment', controllers.getSegment);

// Deprecated endpoint
router.get('/api/movies', controllers.deprecatedMovies);

export default router;
