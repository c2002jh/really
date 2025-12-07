const axios = require('axios');

/**
 * Spotify Service for interacting with Spotify Web API
 */
class SpotifyService {
  constructor() {
    this.baseURL = 'https://api.spotify.com/v1';
    this.authURL = 'https://accounts.spotify.com/api/token';
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get Spotify Client Credentials Token
   * @returns {Promise<string>} Access token
   */
  async getClientCredentialsToken() {
    try {
      // Check if we have a valid token
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Spotify credentials not configured');
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(
        this.authURL,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.token = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      const TOKEN_EXPIRY_BUFFER_SECONDS = 300; // 5 minutes
      this.tokenExpiry = Date.now() + (response.data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000;

      return this.token;
    } catch (error) {
      console.error('Error getting Spotify token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  /**
   * Get available genre seeds from Spotify
   * @returns {Promise<Array<string>>} List of available genres
   */
  async getGenres() {
    try {
      const token = await this.getClientCredentialsToken();

      const response = await axios.get(
        `${this.baseURL}/recommendations/available-genre-seeds`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data.genres;
    } catch (error) {
      console.error('Error fetching genres:', error.response?.data || error.message);
      throw new Error('Failed to fetch genres from Spotify');
    }
  }

  /**
   * Get track recommendations based on seed genres and audio features
   * @param {Array<string>} seedGenres - Array of genre seeds (max 5)
   * @param {number} targetValence - Target valence (0-1)
   * @param {number} targetEnergy - Target energy (0-1)
   * @param {number} limit - Number of tracks to return (default: 20)
   * @returns {Promise<Array>} Array of recommended tracks
   */
  async getRecommendations(seedGenres, targetValence = 0.5, targetEnergy = 0.5, limit = 20) {
    try {
      const token = await this.getClientCredentialsToken();

      // Limit to 5 genres as per Spotify API requirements
      const genres = seedGenres.slice(0, 5);

      const params = new URLSearchParams({
        seed_genres: genres.join(','),
        target_valence: targetValence.toString(),
        target_energy: targetEnergy.toString(),
        limit: limit.toString(),
      });

      const response = await axios.get(
        `${this.baseURL}/recommendations?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data.tracks;
    } catch (error) {
      console.error('Error fetching recommendations:', error.response?.data || error.message);
      throw new Error('Failed to fetch recommendations from Spotify');
    }
  }

  /**
   * Get audio features for a specific track
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<Object>} Audio features object
   */
  async getTrackAudioFeatures(trackId) {
    try {
      const token = await this.getClientCredentialsToken();

      const response = await axios.get(
        `${this.baseURL}/audio-features/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching audio features:', error.response?.data || error.message);
      throw new Error('Failed to fetch audio features from Spotify');
    }
  }

  /**
   * Search for tracks on Spotify
   * @param {string} query - Search query
   * @param {number} limit - Number of results (default: 20)
   * @returns {Promise<Array>} Array of tracks
   */
  async searchTracks(query, limit = 20) {
    try {
      const token = await this.getClientCredentialsToken();

      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: limit.toString(),
      });

      const response = await axios.get(
        `${this.baseURL}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data.tracks.items;
    } catch (error) {
      console.error('Error searching tracks:', error.response?.data || error.message);
      throw new Error('Failed to search tracks on Spotify');
    }
  }
}

module.exports = new SpotifyService();
