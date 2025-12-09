require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();

/**
 * Middleware Configuration
 */

// Enable CORS for all origins (configure as needed for production)
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

console.log('Server is starting/restarting...');

/**
 * Database Connection
 */

// Connect to MongoDB
connectDB();

/**
 * Routes
 */

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to NeuroTune API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        genres: 'GET /api/auth/genres',
        verify: 'GET /api/auth/verify',
      },
      preferences: {
        save: 'POST /api/preferences',
        get: 'GET /api/preferences/:userId',
      },
      music: {
        recommendations: 'GET /api/recommendations?context={context}&userId={userId}',
        search: 'GET /api/search?query={query}',
        audioFeatures: 'GET /api/audio-features/:trackId',
      },
      analysis: {
        analyze: 'POST /api/analyze',
        history: 'GET /api/analysis/history/:userId',
        latest: 'GET /api/analysis/latest/:userId',
      },
    },
  });
});

/**
 * Error Handling Middleware
 */

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB',
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

/**
 * Start Server
 */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       NeuroTune Backend Server         ║
║                                        ║
║  Server running on port ${PORT}           ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                        ║
║  API Documentation: http://localhost:${PORT}  ║
╚════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

module.exports = app;
