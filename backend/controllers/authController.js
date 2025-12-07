const spotifyService = require('../services/spotifyService');

/**
 * Authentication Controller for Spotify integration
 */

/**
 * Get available genres from Spotify
 * @route GET /api/auth/genres
 */
exports.getGenres = async (req, res) => {
  try {
    const genres = await spotifyService.getGenres();
    
    res.status(200).json({
      success: true,
      count: genres.length,
      data: genres,
    });
  } catch (error) {
    console.error('Error in getGenres:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch genres',
    });
  }
};

/**
 * Get album cover for a specific genre
 * @route GET /api/auth/genre-cover/:genre
 */
exports.getGenreCover = async (req, res) => {
  try {
    const { genre } = req.params;
    const coverUrl = await spotifyService.getGenreAlbumCover(genre);
    
    res.status(200).json({
      success: true,
      genre: genre,
      coverUrl: coverUrl,
    });
  } catch (error) {
    console.error('Error in getGenreCover:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch genre cover',
    });
  }
};

/**
 * Verify Spotify connection
 * @route GET /api/auth/verify
 */
exports.verifyConnection = async (req, res) => {
  try {
    await spotifyService.getClientCredentialsToken();
    
    res.status(200).json({
      success: true,
      message: 'Successfully connected to Spotify API',
    });
  } catch (error) {
    console.error('Error in verifyConnection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Spotify API',
    });
  }
};
