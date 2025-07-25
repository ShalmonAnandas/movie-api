import express = require('express');
import cors = require('cors');
import helmet = require('helmet');
import morgan = require('morgan');
import config from '../config';

export const setupMiddleware = (app: express.Application): void => {
    // Security middleware
    app.use(helmet.default());

    // CORS middleware
    app.use(cors());

    // Logging middleware
    app.use(morgan('combined'));

    // Body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve static playlist files (only for local development when not using Vercel Blob)
    if (!config.blob.isEnabled) {
        app.use('/playlists', express.static(config.paths.playlists, {
            setHeaders: (res: express.Response, filePath: string) => {
                if (filePath.endsWith('.m3u8')) {
                    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Cache-Control', 'no-cache');
                }
            }
        }));
    }
};

export const setupErrorHandling = (app: express.Application): void => {
    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Something went wrong!' });
    });

    // 404 handler
    app.use('*', (req: express.Request, res: express.Response) => {
        res.status(404).json({ error: 'Route not found' });
    });
};
