const axios = require('axios');

class LLMService {
  constructor() {
    // GitHub Models Endpoint (OpenAI Compatible)
    this.endpoint = 'https://models.inference.ai.azure.com/chat/completions';
    this.modelName = process.env.LLM_MODEL || 'gpt-4o';
    this.token = process.env.GITHUB_TOKEN;
  }

  /**
   * Analyze EEG metrics using an LLM via GitHub Token
   * @param {Object} metrics - The EEG metrics (focus, relax, bands, etc.)
   * @returns {Promise<string>} The AI generated report
   */
  async analyzeEEGWithAI(metrics) {
    if (!this.token) {
      console.warn('GitHub Token is missing in .env');
      return this.generateFallbackReport(metrics);
    }

    const prompt = `
    You are an expert Neuroscientist and Music Therapist.
    Analyze the following EEG (Brainwave) data for a user:

    - Focus Score (Beta/Theta): ${(metrics.focus * 100).toFixed(1)}%
    - Relaxation Score (Alpha/Beta): ${(metrics.relax * 100).toFixed(1)}%
    - Stress/Arousal Level: ${(metrics.arousal * 100).toFixed(1)}%
    - Dominant State: ${metrics.focus > metrics.relax ? 'High Concentration' : 'Relaxed/Drowsy'}
    - Valence (Positive Emotion): ${(metrics.valence * 100).toFixed(1)}%

    Based on this data:
    1. Describe the user's current mental state in 2-3 sentences.
    2. Suggest the best type of music (Genre, BPM, Mood) to either maintain this state (if positive) or improve it (if stressed/drowsy).
    3. Keep the tone professional yet empathetic.
    4. Response language: Korean (한국어).
    `;

    try {
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt }
          ],
          model: this.modelName,
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('No response from AI model');
      }
    } catch (error) {
      console.error('LLM Service Error:', error.response?.data || error.message);
      return this.generateFallbackReport(metrics);
    }
  }

  generateFallbackReport(metrics) {
    const isFocused = metrics.focus > metrics.relax;
    const isStressed = metrics.arousal > 0.7;

    let text = `[AI 연결 실패 - 로컬 분석 모드]\n\n`;
    text += `사용자님의 뇌파 데이터 분석 결과, 현재 **${isFocused ? '집중(Concentration)' : '이완(Relaxation)'}** 상태가 우세합니다. `;
    
    if (isStressed) {
        text += `하지만 스트레스 수치가 다소 높게 나타나고 있어, 마음을 진정시킬 수 있는 **앰비언트(Ambient)**나 **클래식** 음악을 추천드립니다. `;
    } else if (isFocused) {
        text += `매우 몰입하고 계시군요! 이 상태를 유지하기 위해 **Lo-Fi**나 **가사가 없는 비트** 음악이 좋습니다. `;
    } else {
        text += `편안한 휴식 상태입니다. 기분 전환을 위해 **어쿠스틱**이나 **재즈** 음악을 들어보시는 건 어떨까요?`;
    }

    return text;
  }

  /**
   * Analyze User Mood based on History
   * @param {Array} history - List of past analysis results
   */
  async analyzeUserMood(history) {
    if (!this.token || !history || history.length === 0) {
      return "데이터가 부족하여 분석할 수 없습니다. 음악을 듣고 뇌파를 분석해보세요!";
    }

    // Summarize history for the prompt
    const summary = history.slice(0, 10).map(h => 
      `- Song: ${h.songTitle || 'Unknown'}, Focus: ${h.focus.toFixed(2)}, Relax: ${h.relax.toFixed(2)}, Stress: ${h.stress ? h.stress.toFixed(2) : (h.arousal || 0).toFixed(2)}`
    ).join('\n');

    const prompt = `
    Based on the user's recent listening history and brain states below, write a short, empathetic paragraph (2-3 sentences) describing their current emotional state and mood in Korean.
    Address the user directly (e.g., "요즘 당신은...").
    
    History:
    ${summary}

    Output ONLY the Korean text.
    `;

    try {
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            { role: "system", content: "You are an empathetic mental health assistant." },
            { role: "user", content: prompt }
          ],
          model: this.modelName,
          temperature: 0.7,
          max_tokens: 150
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('LLM Mood Analysis Error:', error.message);
      return "현재 기분을 분석하는 중 오류가 발생했습니다.";
    }
  }

  /**
   * Recommend Genres based on User History
   * @param {Array} history - List of past analysis results
   */
  async recommendGenresBasedOnHistory(history) {
    if (!this.token || !history || history.length === 0) {
      return ['pop', 'k-pop', 'indie']; // Fallback
    }

    // Summarize history for the prompt
    const summary = history.slice(0, 10).map(h => 
      `- Song: ${h.songTitle || 'Unknown'} (${h.artistName || 'Unknown'}), State: Focus ${h.focus.toFixed(2)}, Relax ${h.relax.toFixed(2)}`
    ).join('\n');

    const prompt = `
    Based on the user's listening history and brain states below, suggest 5 Spotify genre seeds (comma-separated, lowercase, no spaces) that fit their taste.
    Available seeds example: pop, rock, indie, classical, jazz, k-pop, hip-hop, chill, study, piano, ambient...
    
    History:
    ${summary}

    Output format example: pop,jazz,classical,study,chill
    Output ONLY the comma-separated list.
    `;

    try {
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            { role: "system", content: "You are a music recommender system." },
            { role: "user", content: prompt }
          ],
          model: this.modelName,
          temperature: 0.5,
          max_tokens: 50
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      const content = response.data.choices[0].message.content.trim();
      // Clean up and split
      const genres = content.split(',').map(g => g.trim().toLowerCase());
      return genres.length > 0 ? genres : ['pop', 'indie'];
    } catch (error) {
      console.error('LLM Genre Rec Error:', error.message);
      return ['pop', 'k-pop', 'indie'];
    }
  }

  /**
   * Recommend Songs based on Context (Mood)
   * @param {Object} latestAnalysis 
   */
  async recommendSongsForContext(latestAnalysis) {
    if (!this.token || !latestAnalysis) {
      return [];
    }

    const prompt = `
    The user just listened to "${latestAnalysis.songTitle || 'Music'}" by "${latestAnalysis.artistName || 'Artist'}".
    Their brain state was: Focus ${(latestAnalysis.focus * 100).toFixed(0)}%, Relax ${(latestAnalysis.relax * 100).toFixed(0)}%, Stress ${(latestAnalysis.arousal * 100).toFixed(0)}%.
    
    Based on this, recommend 5 specific songs (Title - Artist) that fit their current mood.
    Rules:
    1. Exclude songs released before 2010.
    2. Do not include the song they just listened to.
    3. Output format: "Title - Artist" (one per line).
    4. Do not add numbering or extra text. Just the list.
    
    Example Output:
    Levitating - Dua Lipa
    Peaches - Justin Bieber
    Butter - BTS
    `;

    try {
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            { role: "system", content: "You are a music curator." },
            { role: "user", content: prompt }
          ],
          model: this.modelName,
          temperature: 0.7,
          max_tokens: 100
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      const content = response.data.choices[0].message.content.trim();
      const lines = content.split('\n').filter(line => line.includes('-'));
      
      return lines.map(line => {
        const [title, artist] = line.split('-').map(s => s.trim());
        return { title, artist };
      });

    } catch (error) {
      console.error('LLM Song Rec Error:', error.message);
      return [];
    }
  }
}

module.exports = new LLMService();
