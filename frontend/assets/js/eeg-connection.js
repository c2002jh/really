// EEG Connection Page JavaScript

const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
  const deviceAnimation = document.getElementById('deviceAnimation');
  const connectionStatus = document.getElementById('connectionStatus');
  const connectBtn = document.getElementById('connectBtn');
  const completeBtn = document.getElementById('completeBtn');

  let isConnecting = false;
  let isConnected = false;

  // Connect button handler
  connectBtn.addEventListener('click', async () => {
    if (isConnecting) return;

    isConnecting = true;
    connectionStatus.textContent = '기기 연결 중...';
    connectBtn.disabled = true;

    // Simulate device connection (2 seconds)
    setTimeout(() => {
      isConnected = true;
      deviceAnimation.classList.add('connected');
      connectionStatus.textContent = '연결 완료!';
      connectionStatus.style.color = '#4ade80';

      // Show complete button
      connectBtn.style.display = 'none';
      completeBtn.style.display = 'block';

      isConnecting = false;
    }, 2000);
  });

  // Complete button handler
  completeBtn.addEventListener('click', async () => {
    // Get user preferences from localStorage
    const userId = localStorage.getItem('neurotune_userId') || 'anonymous';
    
    try {
      // Fetch user's preferred genres from backend
      const response = await fetch(`${API_BASE_URL}/preferences/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const genres = data.data.genres || [];
        
        // Store genres for evaluation flow
        localStorage.setItem('neurotune_genres', JSON.stringify(genres));
        
        // Navigate to song evaluation page
        window.location.href = '../eeg-evaluation/song-evaluation.html';
      } else {
        // If no preferences found, use default genres
        const defaultGenres = ['pop', 'rock', 'indie'];
        localStorage.setItem('neurotune_genres', JSON.stringify(defaultGenres));
        window.location.href = '../eeg-evaluation/song-evaluation.html';
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Fallback: use default genres
      const defaultGenres = ['pop', 'rock', 'indie'];
      localStorage.setItem('neurotune_genres', JSON.stringify(defaultGenres));
      window.location.href = '../eeg-evaluation/song-evaluation.html';
    }
  });
});
