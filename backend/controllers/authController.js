const spotifyService = require('../services/spotifyService');
const querystring = require('querystring');
const axios = require('axios');

/**
 * Authentication Controller for Spotify integration
 */

/**
 * Login with Spotify (Redirect to Spotify Auth)
 * @route GET /api/auth/spotify/login
 */
exports.loginSpotify = (req, res) => {
  const scope = 'user-read-currently-playing user-read-playback-state';
  // Use localhost as the standard. User must add this to Spotify Dashboard.
  const redirect_uri = 'http://localhost:5000/api/auth/spotify/callback';
  
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: redirect_uri,
    }));
};

/**
 * Spotify Callback (Exchange code for token)
 * @route GET /api/auth/spotify/callback
 */
exports.callbackSpotify = async (req, res) => {
  const code = req.query.code || null;
  const redirect_uri = 'http://localhost:5000/api/auth/spotify/callback';

  try {
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      method: 'post',
      params: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios(authOptions);
    const access_token = response.data.access_token;
    const refresh_token = response.data.refresh_token;

    // Redirect back to frontend with token
    // In production, use secure cookies or a proper session
    res.redirect(`http://127.0.0.1:5500/frontend/main-page/08-main.html?access_token=${access_token}`);
  } catch (error) {
    console.error('Spotify Auth Error:', error.response?.data || error.message);
    res.redirect('http://127.0.0.1:5500/frontend/main-page/08-main.html?error=auth_failed');
  }
};

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
