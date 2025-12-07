const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const musicController = require('../controllers/musicController');
const analysisController = require('../controllers/analysisController');

/**
 * Authentication & Spotify Routes
 */

// Get available genres
router.get('/auth/genres', authController.getGenres);

// Verify Spotify connection
router.get('/auth/verify', authController.verifyConnection);

/**
 * User Preferences Routes
 */

// Save user preferences
router.post('/preferences', musicController.savePreferences);

// Get user preferences
router.get('/preferences/:userId', musicController.getPreferences);

/**
 * Music Recommendations Routes
 */

// Get recommendations based on context
router.get('/recommendations', musicController.getRecommendations);

// Search for tracks
router.get('/search', musicController.searchTracks);

// Get audio features for a track
router.get('/audio-features/:trackId', musicController.getAudioFeatures);

/**
 * EEG Analysis Routes
 */

// Upload and analyze EEG data
router.post(
  '/analyze',
  analysisController.uploadFiles,
  analysisController.analyzeEEG
);

// Get analysis history for a user
router.get('/analysis/history/:userId', analysisController.getAnalysisHistory);

// Get latest analysis result for a user
router.get('/analysis/latest/:userId', analysisController.getLatestAnalysis);

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
