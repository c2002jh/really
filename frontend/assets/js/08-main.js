// Main Page JavaScript with AI Analysis and Enhanced Spotify

const API_BASE_URL = 'http://localhost:5000/api';
const GITHUB_COPILOT_API = 'https://api.githubcopilot.com/chat/completions'; // Placeholder

document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('neurotune_userId') || 'anonymous';
  const sidebar = document.getElementById('sidebar');
  const sidebarTrigger = document.getElementById('sidebarTrigger');

  // Set user name
  document.getElementById('userName').textContent = userId;

  // Load user's EEG data and preferences
  loadUserData(userId);

  // Load recommended albums
  loadAlbums(userId);

  // Set up sidebar toggle
  let sidebarTimeout;

  sidebarTrigger.addEventListener('mouseenter', () => {
    clearTimeout(sidebarTimeout);
    sidebar.classList.add('show');
  });

  sidebar.addEventListener('mouseleave', () => {
    sidebarTimeout = setTimeout(() => {
      sidebar.classList.remove('show');
    }, 300);
  });

  sidebarTrigger.addEventListener('mouseleave', () => {
    sidebarTimeout = setTimeout(() => {
      sidebar.classList.remove('show');
    }, 500);
  });

  // Set up AI Analysis button
  document.getElementById('aiAnalysisBtn').addEventListener('click', showAIAnalysis);
  document.getElementById('aiCloseBtn').addEventListener('click', () => {
    document.getElementById('aiModal').style.display = 'none';
  });

  // Set up search functionality
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Set up context buttons
  document.querySelectorAll('.context-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      document.querySelectorAll('.context-btn').forEach(b => b.classList.remove('active'));
      
      // Add active to clicked button
      btn.classList.add('active');

      // Get selected context
      const context = btn.dataset.context;

      // Load personalized playlist
      loadPlaylist(userId, context);
    });
  });

  // Set up album slider auto-scroll
  setupAlbumSlider();
});

async function loadUserData(userId) {
  try {
    // Load latest EEG analysis
    const analysisResponse = await fetch(`${API_BASE_URL}/analysis/latest/${userId}`);
    
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const results = analysisData.data;

      // Update mood badges
      document.getElementById('engagement').textContent = 
        Math.round(results.engagement * 100) + '%';
      document.getElementById('arousal').textContent = 
        Math.round(results.arousal * 100) + '%';
      document.getElementById('valence').textContent = 
        Math.round(results.valence * 100) + '%';

      // Update brain wave visualization
      updateBrainWaveViz({
        theta: results.thetaPower,
        alpha: 0.85,
        beta: 0.60,
        gamma: 0.45
      });
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updateBrainWaveViz(waves) {
  const waveBars = document.querySelectorAll('.wave-bar');
  waveBars[0].style.setProperty('--height', (waves.theta * 100) + '%');
  waveBars[1].style.setProperty('--height', (waves.alpha * 100) + '%');
  waveBars[2].style.setProperty('--height', (waves.beta * 100) + '%');
  waveBars[3].style.setProperty('--height', (waves.gamma * 100) + '%');
}

async function loadAlbums(userId) {
  try {
    const genres = JSON.parse(localStorage.getItem('neurotune_genres') || '["pop"]');
    
    // Fetch recommendations with album covers
    const response = await fetch(
      `${API_BASE_URL}/recommendations?context=general&userId=${userId}&limit=12`
    );

    if (response.ok) {
      const data = await response.json();
      const albumSlider = document.getElementById('albumSlider');
      
      // Clear placeholder albums
      albumSlider.innerHTML = '';

      // Add albums with clickable covers
      data.data.forEach(track => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.innerHTML = `
          <img src="${track.albumArt}" alt="${track.album}" />
          <p class="album-title">${track.name}</p>
          <p class="album-artist">${track.artists.join(', ')}</p>
        `;
        
        // Make album clickable - open in Spotify
        albumCard.addEventListener('click', () => {
          if (track.spotifyUrl) {
            window.open(track.spotifyUrl, '_blank');
          }
        });
        
        albumSlider.appendChild(albumCard);
      });
    }
  } catch (error) {
    console.error('Error loading albums:', error);
  }
}

async function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  const resultsDiv = document.getElementById('searchResults');
  
  if (!query) {
    resultsDiv.style.display = 'none';
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10`
    );

    if (response.ok) {
      const data = await response.json();
      resultsDiv.innerHTML = '';
      
      if (data.data && data.data.length > 0) {
        data.data.forEach(track => {
          const resultItem = document.createElement('div');
          resultItem.className = 'search-result-item';
          resultItem.innerHTML = `
            <img src="${track.albumArt}" alt="${track.name}" />
            <div class="search-result-info">
              <div class="search-result-title">${track.name}</div>
              <div class="search-result-artist">${track.artists.join(', ')}</div>
            </div>
            <button class="play-btn" onclick="window.open('${track.spotifyUrl}', '_blank')">▶</button>
          `;
          resultsDiv.appendChild(resultItem);
        });
        resultsDiv.style.display = 'block';
      } else {
        resultsDiv.innerHTML = '<p style="padding: 16px; text-align: center;">검색 결과가 없습니다.</p>';
        resultsDiv.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error searching:', error);
    resultsDiv.innerHTML = '<p style="padding: 16px; text-align: center; color: red;">검색 중 오류가 발생했습니다.</p>';
    resultsDiv.style.display = 'block';
  }
}

async function showAIAnalysis() {
  const modal = document.getElementById('aiModal');
  const resultDiv = document.getElementById('aiResult');
  
  modal.style.display = 'flex';
  resultDiv.innerHTML = '<div class="loading"></div><p>AI가 당신의 음악 취향을 분석하고 있습니다...</p>';

  try {
    const userId = localStorage.getItem('neurotune_userId') || 'anonymous';
    
    // Fetch all user data for analysis
    const [prefsResponse, analysisResponse, historyResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/preferences/${userId}`),
      fetch(`${API_BASE_URL}/analysis/latest/${userId}`),
      fetch(`${API_BASE_URL}/analysis/history/${userId}?limit=10`)
    ]);

    let analysisContext = '';
    
    if (prefsResponse.ok) {
      const prefs = await prefsResponse.json();
      analysisContext += `선호 장르: ${prefs.data.genres.join(', ')}\n`;
    }
    
    if (analysisResponse.ok) {
      const latest = await analysisResponse.json();
      analysisContext += `최신 뇌파 분석:\n`;
      analysisContext += `- 집중력: ${(latest.data.engagement * 100).toFixed(1)}%\n`;
      analysisContext += `- 긴장도: ${(latest.data.arousal * 100).toFixed(1)}%\n`;
      analysisContext += `- 감정: ${(latest.data.valence * 100).toFixed(1)}%\n`;
    }

    // Simulate AI analysis (In production, call GitHub Copilot API or GPT-4)
    const aiAnalysis = await simulateAIAnalysis(analysisContext);
    
    resultDiv.innerHTML = `
      <div class="ai-analysis-content">
        <h4>📊 분석 결과</h4>
        <p>${aiAnalysis}</p>
        <div class="ai-recommendations">
          <h4>💡 추천</h4>
          <ul>
            <li>현재 집중력이 높은 상태입니다. 공부나 작업에 적합한 시간이에요.</li>
            <li>차분한 멜로디의 음악을 선호하시는 것으로 보입니다.</li>
            <li>긍정적인 감정 상태를 유지하고 계시네요!</li>
          </ul>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error in AI analysis:', error);
    resultDiv.innerHTML = `
      <div class="ai-error">
        <p>⚠️ AI 분석 중 오류가 발생했습니다.</p>
        <p>잠시 후 다시 시도해주세요.</p>
      </div>
    `;
  }
}

async function simulateAIAnalysis(context) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In production, this would call GitHub Copilot API or GPT-4.1
  // For now, return a simulated analysis
  return `당신의 음악 취향 분석 결과입니다. 
  
  수집된 EEG 데이터와 선호 장르를 분석한 결과, 당신은 **감성적이고 차분한 음악**을 선호하는 경향이 있습니다. 
  
  현재 뇌파 상태를 보면 집중력과 이완 상태가 균형잡혀 있어 창의적인 작업이나 독서에 최적의 상태입니다.
  
  당신의 음악 취향은 시간대에 따라 변화하는 특징을 보이며, 오전에는 에너지가 높은 곡을, 저녁에는 더 차분한 곡을 선호하는 패턴이 관찰됩니다.`;
}

async function loadPlaylist(userId, context) {
  const playlistSection = document.getElementById('playlistSection');
  const playlistContainer = document.getElementById('playlistContainer');

  // Show loading
  playlistContainer.innerHTML = '<div class="loading"></div>';
  playlistSection.style.display = 'block';

  try {
    const response = await fetch(
      `${API_BASE_URL}/recommendations?context=${context}&userId=${userId}&limit=20`
    );

    if (response.ok) {
      const data = await response.json();
      
      // Clear loading
      playlistContainer.innerHTML = '';

      // Add tracks with enhanced UI
      data.data.forEach((track, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item slide-up';
        playlistItem.style.animationDelay = `${index * 0.05}s`;
        
        // Calculate match score based on EEG data if available
        const matchScore = data.eegData 
          ? Math.round(data.eegData.overallPreference * 100)
          : Math.round(Math.random() * 30 + 70); // Random score between 70-100

        playlistItem.innerHTML = `
          <img src="${track.albumArt}" alt="${track.name}" />
          <div class="playlist-item-info">
            <h3 class="playlist-item-title">${track.name}</h3>
            <p class="playlist-item-artist">${track.artists.join(', ')}</p>
          </div>
          <div class="playlist-item-score">${matchScore}% 매칭</div>
          <button class="playlist-play-btn" onclick="window.open('${track.spotifyUrl}', '_blank')">▶</button>
        `;

        playlistContainer.appendChild(playlistItem);
      });
    }
  } catch (error) {
    console.error('Error loading playlist:', error);
    playlistContainer.innerHTML = '<p>플레이리스트를 불러올 수 없습니다.</p>';
  }
}

function setupAlbumSlider() {
  const slider = document.getElementById('albumSlider');
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.style.cursor = 'grabbing';
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.style.cursor = 'grab';
  });

  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.style.cursor = 'grab';
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2;
    slider.scrollLeft = scrollLeft - walk;
  });

  // Auto-scroll effect
  let scrollDirection = 1;
  setInterval(() => {
    if (!isDown) {
      slider.scrollLeft += scrollDirection;
      
      // Reverse direction at edges
      if (slider.scrollLeft >= slider.scrollWidth - slider.clientWidth) {
        scrollDirection = -1;
      } else if (slider.scrollLeft <= 0) {
        scrollDirection = 1;
      }
    }
  }, 50);
}
