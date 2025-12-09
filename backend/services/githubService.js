const axios = require('axios');

class GithubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Analyze GitHub activity for a user using their token
   * @param {string} token - GitHub Personal Access Token
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeUserActivity(token) {
    try {
      const headers = {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      };

      // 1. Get User Info
      const userResponse = await axios.get(`${this.baseUrl}/user`, { headers });
      const username = userResponse.data.login;

      // 2. Get Recent Events (Activity)
      const eventsResponse = await axios.get(`${this.baseUrl}/users/${username}/events?per_page=100`, { headers });
      const events = eventsResponse.data;

      // 3. Analyze Events
      const analysis = this.calculateMetrics(events);

      return {
        username,
        ...analysis
      };
    } catch (error) {
      console.error('GitHub API Error:', error.response?.data || error.message);
      throw new Error('Failed to analyze GitHub activity. Please check your token.');
    }
  }

  calculateMetrics(events) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    // Filter events from the last 24 hours
    const recentEvents = events.filter(e => new Date(e.created_at) > oneDayAgo);
    
    let pushCount = 0;
    let codeReviewCount = 0;
    let issueCount = 0;
    let languages = {};

    recentEvents.forEach(event => {
      if (event.type === 'PushEvent') {
        pushCount += event.payload.size || 1;
      } else if (event.type === 'PullRequestReviewEvent') {
        codeReviewCount++;
      } else if (event.type === 'IssuesEvent') {
        issueCount++;
      }
    });

    // Calculate Scores (0.0 - 1.0)
    
    // Focus: Driven by Push activity (coding)
    // Cap at 20 commits for max focus
    let focus = Math.min(pushCount / 20, 1.0);
    if (pushCount === 0 && codeReviewCount > 0) {
        // Reading code is also focus, but less intense
        focus = Math.min(codeReviewCount / 10, 0.8);
    }

    // Stress: Driven by Issues (bugs?) or too much activity
    // If many issues created/closed, might be stressful debugging
    let stress = Math.min(issueCount / 5, 1.0);
    
    // If focus is extremely high (sprinting), stress increases
    if (focus > 0.8) stress += 0.2;

    // Relax: Inverse of Focus + Stress
    let relax = 1.0 - Math.max(focus, stress);
    if (relax < 0) relax = 0;

    // Determine State
    let state = 'Neutral';
    if (focus > 0.6) state = 'Deep Work (몰입)';
    else if (stress > 0.6) state = 'High Stress (스트레스)';
    else if (relax > 0.6) state = 'Relaxed (여유)';

    return {
      focus,
      stress,
      relax,
      classification: state,
      details: {
        pushCount,
        issueCount,
        codeReviewCount
      }
    };
  }
}

module.exports = new GithubService();
