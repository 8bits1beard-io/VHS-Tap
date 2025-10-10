const axios = require('axios');
const config = require('../config');

class JellyfinService {
  constructor() {
    this.baseUrl = config.jellyfin.url;
    this.apiKey = config.jellyfin.apiKey;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Emby-Token': this.apiKey
      }
    });
  }

  /**
   * Get information about a specific movie/item
   * @param {string} itemId - Jellyfin item ID
   * @returns {Promise<Object>} Movie information
   */
  async getItem(itemId) {
    try {
      // First try the direct endpoint with userId
      const users = await this.getUsers();
      if (users.length > 0) {
        const userId = users[0].Id;
        const response = await this.client.get(`/Users/${userId}/Items/${itemId}`);
        return response.data;
      } else {
        // Fallback to searching by ID if no users
        throw new Error('No users found in Jellyfin');
      }
    } catch (error) {
      console.error('Error fetching item from Jellyfin:', error.message);
      throw new Error(`Failed to fetch item: ${error.message}`);
    }
  }

  /**
   * Get all users
   * @returns {Promise<Array>} List of users
   */
  async getUsers() {
    try {
      const response = await this.client.get('/Users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Start playback for a user
   * @param {string} userId - Jellyfin user ID
   * @param {string} itemId - Item ID to play
   * @returns {Promise<Object>} Playback response
   */
  async startPlayback(userId, itemId) {
    try {
      // Send a play command to the user's session
      const response = await this.client.post(
        `/Sessions/${userId}/Playing`,
        {
          ItemIds: [itemId],
          PlayCommand: 'PlayNow'
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error starting playback:', error.message);
      throw new Error(`Failed to start playback: ${error.message}`);
    }
  }

  /**
   * Get active sessions for a user
   * @param {string} userId - Jellyfin user ID
   * @returns {Promise<Array>} Active sessions
   */
  async getUserSessions(userId) {
    try {
      const response = await this.client.get('/Sessions', {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions:', error.message);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
  }

  /**
   * Send a play command to a specific device/session
   * @param {string} sessionId - Session ID of the device
   * @param {string} itemId - Item ID to play
   * @returns {Promise<Object>} Command response
   */
  async sendPlayCommand(sessionId, itemId) {
    try {
      const response = await this.client.post(
        `/Sessions/${sessionId}/Playing`,
        {
          ItemIds: [itemId],
          PlayCommand: 'PlayNow',
          StartPositionTicks: 0
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending play command:', error.message);
      throw new Error(`Failed to send play command: ${error.message}`);
    }
  }

  /**
   * Search for movies by title
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Search results
   */
  async searchMovies(searchTerm) {
    try {
      const response = await this.client.get('/Items', {
        params: {
          searchTerm,
          IncludeItemTypes: 'Movie',
          Recursive: true,
          Fields: 'Overview,PrimaryImageAspectRatio,ProductionYear'
        }
      });
      return response.data.Items || [];
    } catch (error) {
      console.error('Error searching movies:', error.message);
      throw new Error(`Failed to search movies: ${error.message}`);
    }
  }

  /**
   * Get all movies from Jellyfin
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} List of movies
   */
  async getAllMovies(limit = 100) {
    try {
      const response = await this.client.get('/Items', {
        params: {
          IncludeItemTypes: 'Movie',
          Recursive: true,
          Fields: 'Overview,PrimaryImageAspectRatio,ProductionYear',
          SortBy: 'SortName',
          SortOrder: 'Ascending',
          Limit: limit
        }
      });
      return response.data.Items || [];
    } catch (error) {
      console.error('Error fetching movies:', error.message);
      throw new Error(`Failed to fetch movies: ${error.message}`);
    }
  }
}

// Singleton instance
const jellyfinService = new JellyfinService();

module.exports = jellyfinService;
