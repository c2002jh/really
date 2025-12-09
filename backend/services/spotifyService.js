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
      // Fallback to hardcoded genres if API fails (e.g. 404)
      console.log('Using fallback genre list');
      return [
        "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal", "bluegrass", "blues", "bossanova", 
        "brazil", "breakbeat", "british", "cantopop", "chicago-house", "children", "chill", "classical", "club", "comedy", 
        "country", "dance", "dancehall", "death-metal", "deep-house", "disco", "disney", "drum-and-bass", "dub", "dubstep", 
        "edm", "electro", "electronic", "emo", "folk", "forro", "french", "funk", "garage", "german", 
        "gospel", "goth", "grindcore", "groove", "grunge", "guitar", "happy", "hard-rock", "hardcore", "hardstyle", 
        "heavy-metal", "hip-hop", "holidays", "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", 
        "iranian", "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino", 
        "malay", "mandopop", "metal", "metal-misc", "metalcore", "minimal-techno", "movies", "mpb", "new-age", "new-release", 
        "opera", "pagode", "party", "philippines-opm", "piano", "pop", "pop-film", "post-dubstep", "power-pop", "progressive-house", 
        "psych-rock", "punk", "punk-rock", "r-n-b", "rainy-day", "reggae", "reggaeton", "road-trip", "rock", "rock-n-roll", 
        "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo", "show-tunes", "singer-songwriter", "ska", "sleep", 
        "songwriter", "soul", "soundtracks", "spanish", "study", "summer", "swedish", "synth-pop", "tango", "techno", 
        "trance", "trip-hop", "turkish", "work-out", "world-music"
      ];
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
      
      // Fallback: Search for tracks by genre if recommendations endpoint fails
      if (seedGenres && seedGenres.length > 0) {
        console.log('Using fallback search by genre');
        try {
          const genre = seedGenres[0]; // Use the first genre
          const token = await this.getClientCredentialsToken();
          const params = new URLSearchParams({
            q: `genre:"${genre}"`,
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
        } catch (searchError) {
          console.error('Fallback search also failed:', searchError.message);
        }
      }
      
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
   * Search for playlists on Spotify
   * @param {string} query - Search query
   * @param {number} limit - Number of results (default: 20)
   * @returns {Promise<Array>} Array of playlists
   */
  async searchPlaylists(query, limit = 20) {
    try {
      const token = await this.getClientCredentialsToken();

      const params = new URLSearchParams({
        q: query,
        type: 'playlist',
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

      return response.data.playlists.items;
    } catch (error) {
      console.error('Error searching playlists:', error.response?.data || error.message);
      throw new Error('Failed to search playlists on Spotify');
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

  /**
   * Get a random track based on genre and year
   * @param {string} genre - Genre to search for
   * @param {string} year - Year or year range (e.g. "2023", "2010-2019")
   * @returns {Promise<Object>} A track object
   */
  async getRandomTrackByGenreAndYear(genre, year) {
    try {
      const token = await this.getClientCredentialsToken();
      
      // Construct query
      let query = '';
      // Handle K-Pop special case
      if (genre.toLowerCase() === 'k-pop') {
        query = `k-pop year:${year}`;
      } else {
        query = `genre:"${genre}" year:${year}`;
      }

      // Add random offset to get different songs
      // We'll fetch a batch and pick one to ensure we get something
      // Max offset is 1000, but let's try to get something from the top 100 relevant ones
      const maxOffset = 50;
      const offset = Math.floor(Math.random() * maxOffset);

      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '20', // Fetch 20 and pick one
        offset: offset.toString()
      });

      const response = await axios.get(
        `${this.baseURL}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const tracks = response.data.tracks.items;
      
      // Helper function to filter and pick random track
      const pickRandomTrack = (trackList) => {
        if (!trackList || trackList.length === 0) return null;
        const validTracks = trackList.filter(t => 
          t.album && t.album.album_type !== 'compilation' &&
          t.album.artists && t.album.artists[0].name !== 'Various Artists' &&
          t.album.images && t.album.images.length > 0
        );
        const pool = validTracks.length > 0 ? validTracks : trackList;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      let selectedTrack = pickRandomTrack(tracks);
      if (selectedTrack) return selectedTrack;

      // Fallback 1: Try without year
      console.log(`No tracks found for ${genre} in ${year}. Trying without year...`);
      let fallbackQuery = genre.toLowerCase() === 'k-pop' ? 'k-pop' : `genre:"${genre}"`;
      
      const fallbackParams = new URLSearchParams({
        q: fallbackQuery,
        type: 'track',
        limit: '50',
        offset: Math.floor(Math.random() * 50).toString()
      });

      const fallbackResponse = await axios.get(
        `${this.baseURL}/search?${fallbackParams}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      selectedTrack = pickRandomTrack(fallbackResponse.data.tracks.items);
      if (selectedTrack) return selectedTrack;
      
      // Fallback 2: Try simple keyword search
      console.log(`No tracks found for genre tag ${genre}. Trying keyword search...`);
      const keywordParams = new URLSearchParams({
        q: genre,
        type: 'track',
        limit: '50',
        offset: Math.floor(Math.random() * 50).toString()
      });
      
      const keywordResponse = await axios.get(
        `${this.baseURL}/search?${keywordParams}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      return pickRandomTrack(keywordResponse.data.tracks.items);
    } catch (error) {
      console.error(`Error fetching random track for ${genre} (${year}):`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get a random album cover for a genre
   * @param {string} genre - Genre name
   * @returns {Promise<string>} Album cover URL
   */
  async getGenreAlbumCover(genre) {
    try {
      const token = await this.getClientCredentialsToken();

      // To ensure we get "famous" albums, we look at the top results.
      // We randomly choose to fetch from the first 50 or the second 50 results (Top 100).
      const offset = Math.random() < 0.5 ? 0 : 50;

      let tracks = [];

      // Special handling for K-Pop: genre tag search is unreliable, use keyword search directly
      if (genre === 'k-pop') {
        const params = new URLSearchParams({
          q: 'k-pop', // Use keyword directly
          type: 'track',
          limit: '50',
          offset: offset.toString()
        });
        const response = await axios.get(
          `${this.baseURL}/search?${params}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        tracks = response.data.tracks.items;
      } else {
        // 1. Try searching by genre tag specifically for tracks
        let params = new URLSearchParams({
          q: `genre:"${genre}"`,
          type: 'track',
          limit: '50',
          offset: offset.toString()
        });

        let response = await axios.get(
          `${this.baseURL}/search?${params}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        tracks = response.data.tracks.items;

        // 2. Fallback: if no tracks found with genre tag, search by keyword
        if (!tracks || tracks.length === 0) {
          params = new URLSearchParams({
            q: genre,
            type: 'track',
            limit: '50',
            offset: offset.toString()
          });
          response = await axios.get(
            `${this.baseURL}/search?${params}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          tracks = response.data.tracks.items;
        }
      }

      if (tracks && tracks.length > 0) {
        // Filter out compilations and ensure it's an album or single
        // Also exclude "Various Artists" and common compilation titles
        const validTracks = tracks.filter(t => 
          t.album && 
          t.album.images && 
          t.album.images.length > 0 && 
          (t.album.album_type === 'album' || t.album.album_type === 'single') &&
          t.album.artists[0].name !== 'Various Artists' &&
          !t.album.name.toLowerCase().includes('best of') &&
          !t.album.name.toLowerCase().includes('greatest hits') &&
          !t.album.name.toLowerCase().includes('playlist') &&
          // Exclude the song named "K-POP" by Travis Scott etc.
          !(genre === 'k-pop' && t.name.toUpperCase() === 'K-POP') &&
          // Filter for songs from 2010 onwards
          (parseInt(t.album.release_date.substring(0, 4)) >= 2010)
        );

        // Use filtered tracks if available, otherwise fall back to all tracks
        const pool = validTracks.length > 0 ? validTracks : tracks;
        
        if (pool.length > 0) {
          // Pick a random track from the pool (which is from the top 100)
          const randomTrack = pool[Math.floor(Math.random() * pool.length)];
          if (randomTrack.album && randomTrack.album.images && randomTrack.album.images.length > 0) {
            return randomTrack.album.images[0].url;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching album cover for genre ${genre}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Search for a track to get metadata (Cover Art, URI)
   * @param {string} title 
   * @param {string} artist 
   */
  async searchTrackInfo(title, artist) {
    try {
      const token = await this.getClientCredentialsToken();
      const query = `track:${title} artist:${artist}`;
      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
      });

      const response = await axios.get(
        `${this.baseURL}/search?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.tracks.items.length > 0) {
        return response.data.tracks.items[0];
      }
      return null;
    } catch (error) {
      console.error('Error searching track info:', error.message);
      return null;
    }
  }

  /**
   * Get User's Currently Playing Track
   * Requires a valid User Access Token (not Client Credentials)
   * @param {string} userToken 
   */
  async getUserCurrentlyPlaying(userToken) {
    try {
      const response = await axios.get(
        `${this.baseURL}/me/player/currently-playing`,
        { headers: { 'Authorization': `Bearer ${userToken}` } }
      );

      if (response.status === 204 || !response.data) {
        return null; // Nothing playing
      }

      return response.data;
    } catch (error) {
      console.error('Error getting currently playing:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new SpotifyService();
