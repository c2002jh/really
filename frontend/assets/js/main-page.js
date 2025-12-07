// Main Page JavaScript

const API_BASE_URL = 'http://localhost:5000/api';

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

      // Update brain wave visualization (mock data for now)
      // In real implementation, this would use actual frequency band data
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
    
    // Fetch recommendations
    const response = await fetch(
      `${API_BASE_URL}/recommendations?context=general&userId=${userId}&limit=12`
    );

    if (response.ok) {
      const data = await response.json();
      const albumSlider = document.getElementById('albumSlider');
      
      // Clear placeholder albums
      albumSlider.innerHTML = '';

      // Add albums
      data.data.forEach(track => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.innerHTML = `
          <img src="${track.albumArt}" alt="${track.album}" />
          <p class="album-title">${track.album}</p>
        `;
        albumCard.addEventListener('click', () => {
          window.open(track.spotifyUrl, '_blank');
        });
        albumSlider.appendChild(albumCard);
      });
    }
  } catch (error) {
    console.error('Error loading albums:', error);
  }
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

      // Add tracks
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
        `;

        playlistItem.addEventListener('click', () => {
          if (track.previewUrl) {
            // Play preview if available
            const audio = new Audio(track.previewUrl);
            audio.play();
          } else {
            // Open in Spotify
            window.open(track.spotifyUrl, '_blank');
          }
        });

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
