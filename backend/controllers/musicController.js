const spotifyService = require('../services/spotifyService');
const UserPreference = require('../models/UserPreference');
const AnalysisResult = require('../models/AnalysisResult');

/**
 * Music Controller for handling music recommendations and search
 */

/**
 * Save user music preferences
 * @route POST /api/preferences
 */
exports.savePreferences = async (req, res) => {
  try {
    const { userId, genres, topArtists, topTracks } = req.body;

    if (!userId || !genres || !Array.isArray(genres) || genres.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userId and genres array are required',
      });
    }

    // Update or create user preference
    const preference = await UserPreference.findOneAndUpdate(
      { userId },
      {
        userId,
        genres,
        topArtists: topArtists || [],
        topTracks: topTracks || [],
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: preference,
    });
  } catch (error) {
    console.error('Error in savePreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save preferences',
    });
  }
};

/**
 * Get user music preferences
 * @route GET /api/preferences/:userId
 */
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    const preference = await UserPreference.findOne({ userId });

    if (!preference) {
      return res.status(404).json({
        success: false,
        error: 'User preferences not found',
      });
    }

    res.status(200).json({
      success: true,
      data: preference,
    });
  } catch (error) {
    console.error('Error in getPreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch preferences',
    });
  }
};

/**
 * Get music recommendations based on context and EEG data
 * @route GET /api/recommendations
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { context, userId, limit } = req.query;

    // Default context is 'general'
    const musicContext = context || 'general';

    // Define target audio features based on context
    let targetValence = 0.5;
    let targetEnergy = 0.5;

    switch (musicContext.toLowerCase()) {
      case 'study':
        // Calm, focused music for studying
        targetValence = 0.3;
        targetEnergy = 0.4;
        break;
      case 'workout':
        // High energy, motivational music for exercise
        targetValence = 0.8;
        targetEnergy = 0.9;
        break;
      case 'relax':
        // Calm, soothing music for relaxation
        targetValence = 0.4;
        targetEnergy = 0.2;
        break;
      case 'focus':
        // Moderate energy, neutral valence for concentration
        targetValence = 0.5;
        targetEnergy = 0.5;
        break;
      case 'party':
        // High valence, high energy for social gatherings
        targetValence = 0.9;
        targetEnergy = 0.85;
        break;
      default:
        // General listening
        targetValence = 0.5;
        targetEnergy = 0.5;
    }

    // Get user preferences for genres
    let seedGenres = ['pop', 'rock', 'indie'];
    
    if (userId) {
      const userPref = await UserPreference.findOne({ userId });
      if (userPref && userPref.genres.length > 0) {
        seedGenres = userPref.genres.slice(0, 5);
      }
    }

    // Get latest EEG analysis for this user if available
    let eegModifier = 1.0;
    let analysisData = null;

    if (userId) {
      const latestAnalysis = await AnalysisResult.findOne({ userId })
        .sort({ createdAt: -1 })
        .limit(1);

      if (latestAnalysis) {
        analysisData = {
          engagement: latestAnalysis.engagement,
          arousal: latestAnalysis.arousal,
          valence: latestAnalysis.valence,
          overallPreference: latestAnalysis.overallPreference,
        };

        // Adjust recommendations based on EEG overall preference
        // Higher preference suggests user is in a good state for their preferred music style
        eegModifier = latestAnalysis.overallPreference;

        // Modify target features based on EEG arousal and valence
        targetValence = (targetValence * 0.6) + (latestAnalysis.valence * 0.4);
        targetEnergy = (targetEnergy * 0.6) + (latestAnalysis.arousal * 0.4);

        // Ensure values stay in valid range
        targetValence = Math.max(0, Math.min(1, targetValence));
        targetEnergy = Math.max(0, Math.min(1, targetEnergy));
      }
    }

    // Get recommendations from Spotify
    const recommendationLimit = limit ? parseInt(limit) : 20;
    const tracks = await spotifyService.getRecommendations(
      seedGenres,
      targetValence,
      targetEnergy,
      recommendationLimit
    );

    // Format response
    const playlist = tracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
    }));

    res.status(200).json({
      success: true,
      context: musicContext,
      parameters: {
        targetValence: parseFloat(targetValence.toFixed(2)),
        targetEnergy: parseFloat(targetEnergy.toFixed(2)),
        seedGenres,
        eegModifier: parseFloat(eegModifier.toFixed(2)),
      },
      eegData: analysisData,
      count: playlist.length,
      data: playlist,
    });
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations',
    });
  }
};

/**
 * Search for tracks
 * @route GET /api/search
 */
exports.searchTracks = async (req, res) => {
  try {
    const { query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const searchLimit = limit ? parseInt(limit) : 20;
    const tracks = await spotifyService.searchTracks(query, searchLimit);

    // Format response
    const results = tracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
    }));

    res.status(200).json({
      success: true,
      query,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchTracks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search tracks',
    });
  }
};

/**
 * Get audio features for a track
 * @route GET /api/audio-features/:trackId
 */
exports.getAudioFeatures = async (req, res) => {
  try {
    const { trackId } = req.params;

    const features = await spotifyService.getTrackAudioFeatures(trackId);

    res.status(200).json({
      success: true,
      data: features,
    });
  } catch (error) {
    console.error('Error in getAudioFeatures:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get audio features',
    });
  }
};
