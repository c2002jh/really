const spotifyService = require('../services/spotifyService');
const llmService = require('../services/llmService');
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
    let currentMood = 'Neutral';

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
          focus: latestAnalysis.focus,
          relax: latestAnalysis.relax
        };

        // Determine Mood/State based on EEG
        if (latestAnalysis.focus > latestAnalysis.relax) {
            currentMood = 'Focus';
            // If focused, suggest music that maintains focus (moderate energy, low valence variance)
            targetEnergy = 0.6;
            targetValence = 0.5;
        } else {
            currentMood = 'Relax';
            // If relaxed, suggest calming music
            targetEnergy = 0.3;
            targetValence = 0.6;
        }

        // If stress is high (high arousal, low valence), suggest calming music regardless of focus
        if (latestAnalysis.arousal > 0.7 && latestAnalysis.valence < 0.4) {
            currentMood = 'Stress Relief';
            targetEnergy = 0.2;
            targetValence = 0.8; // Positive/Calm
        }

        // Adjust recommendations based on EEG overall preference
        // Higher preference suggests user is in a good state for their preferred music style
        eegModifier = latestAnalysis.overallPreference;
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
      artists: track.artists, // Keep full artist object for frontend
      album: track.album, // Keep full album object
      albumArt: track.album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
    }));

    res.status(200).json({
      success: true,
      context: currentMood, // Return the determined mood
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
      error: error.message || 'Failed to fetch recommendations',
    });
  }
};

/**
 * Get User's Currently Playing Track
 * @route GET /api/music/now-playing
 */
exports.getNowPlaying = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing Spotify User Token' });
    }

    const token = authHeader.split(' ')[1];
    const data = await spotifyService.getUserCurrentlyPlaying(token);

    if (!data || !data.item) {
      return res.status(200).json({ success: true, is_playing: false });
    }

    res.status(200).json({
      success: true,
      is_playing: data.is_playing,
      item: {
        id: data.item.id,
        name: data.item.name,
        artists: data.item.artists,
        album: data.item.album,
        duration_ms: data.item.duration_ms,
        progress_ms: data.progress_ms
      }
    });
  } catch (error) {
    console.error('Error in getNowPlaying:', error);
    res.status(500).json({ success: false, error: error.message });
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

/**
 * Get a random track based on genre and year
 * @route GET /api/music/random-track
 */
exports.getRandomTrack = async (req, res) => {
  try {
    const { genre, year } = req.query;
    console.log(`getRandomTrack called with: genre=${genre}, year=${year}`);

    if (!genre || !year) {
      return res.status(400).json({
        success: false,
        error: 'Genre and year are required',
      });
    }

    const track = await spotifyService.getRandomTrackByGenreAndYear(genre, year);

    if (!track) {
      return res.status(404).json({
        success: false,
        error: 'No track found for the given criteria',
      });
    }

    res.status(200).json({
      success: true,
      data: track,
    });
  } catch (error) {
    console.error('Error in getRandomTrack:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch random track',
    });
  }
};

/**
 * Get User Mood Analysis (Replaces Album Recommendations)
 * @route GET /api/music/mood-analysis
 */
exports.getUserMoodAnalysis = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // 1. Fetch User History (Last 20 records)
    const history = await AnalysisResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // 2. Get Mood Analysis from LLM
    const moodText = await llmService.analyzeUserMood(history);
    
    res.status(200).json({
      success: true,
      moodText: moodText
    });

  } catch (error) {
    console.error('Error in getUserMoodAnalysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Context Playlist based on Last Song
 * @route GET /api/music/context-playlist
 */
exports.getContextPlaylist = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // 1. Get Last Analysis Result
    const lastAnalysis = await AnalysisResult.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!lastAnalysis) {
      return res.status(404).json({ success: false, error: 'No history found' });
    }

    // 2. Get Song Recommendations from LLM
    const recommendedSongs = await llmService.recommendSongsForContext(lastAnalysis);

    // 3. Search Spotify for these songs to get metadata
    const playlist = [];
    for (const song of recommendedSongs) {
      if (song.title && song.artist) {
        const trackInfo = await spotifyService.searchTrackInfo(song.title, song.artist);
        if (trackInfo) {
          playlist.push({
            id: trackInfo.id,
            name: trackInfo.name,
            artist: trackInfo.artists[0].name,
            image: trackInfo.album.images[0]?.url,
            spotifyUrl: trackInfo.external_urls.spotify
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: playlist
    });

  } catch (error) {
    console.error('Error in getContextPlaylist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


