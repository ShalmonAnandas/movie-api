import express = require('express');
import config from './config';
import { setupMiddleware, setupErrorHandling } from './middleware';
import routes from './routes';

const app = express();

// Log configuration
if (config.blob.isEnabled) {
  console.log('Vercel Blob storage enabled');
} else {
  console.log('Vercel Blob not configured - will use local storage for development');
}

// Setup middleware
setupMiddleware(app);

// Setup routes
app.use(routes);

// Setup error handling
setupErrorHandling(app);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
