const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const musicController = require('../controllers/musicController');
const analysisController = require('../controllers/analysisController');
const userController = require('../controllers/userController');

// Import rate limiters
const {
  generalLimiter,
  uploadLimiter,
  databaseLimiter,
  readLimiter,
} = require('../middleware/rateLimiter');

/**
 * User Authentication Routes
 */

// Register new user
router.post('/user/register', generalLimiter, userController.register);

// Login user
router.post('/user/login', generalLimiter, userController.login);

// Get user profile
router.get('/user/profile/:userId', readLimiter, userController.getProfile);

// Update user profile
router.put('/user/profile/:userId', databaseLimiter, userController.updateProfile);

/**
 * Authentication & Spotify Routes
 */

// Get available genres
router.get('/auth/genres', readLimiter, authController.getGenres);

// Get album cover for a genre
router.get('/auth/genre-cover/:genre', readLimiter, authController.getGenreCover);

// Verify Spotify connection
router.get('/auth/verify', readLimiter, authController.verifyConnection);

/**
 * User Preferences Routes
 */

// Save user preferences
router.post('/preferences', databaseLimiter, musicController.savePreferences);

// Get user preferences
router.get('/preferences/:userId', readLimiter, musicController.getPreferences);

/**
 * Music Recommendations Routes
 */

// Get recommendations based on context
router.get('/recommendations', databaseLimiter, musicController.getRecommendations);

// Search for tracks
router.get('/search', generalLimiter, musicController.searchTracks);

// Get audio features for a track
router.get('/audio-features/:trackId', generalLimiter, musicController.getAudioFeatures);

/**
 * EEG Analysis Routes
 */

// Upload and analyze EEG data
router.post(
  '/analyze',
  uploadLimiter,
  analysisController.uploadFiles,
  analysisController.analyzeEEG
);

// Get analysis history for a user
router.get('/analysis/history/:userId', readLimiter, analysisController.getAnalysisHistory);

// Get latest analysis result for a user
router.get('/analysis/latest/:userId', readLimiter, analysisController.getLatestAnalysis);

/**
 * Health check route
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NeuroTune API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
