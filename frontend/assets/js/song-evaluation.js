// Song Evaluation Page JavaScript

const API_BASE_URL = 'http://localhost:5000/api';

let currentSongIndex = 0;
let songs = [];
let uploadedFiles = {};
let evaluationData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const genres = JSON.parse(localStorage.getItem('neurotune_genres') || '["pop"]');
  const userId = localStorage.getItem('neurotune_userId') || 'anonymous';

  // Load songs for evaluation (3 songs per genre)
  await loadSongsForEvaluation(genres);

  // Initialize UI
  updateUI();

  // Set up file upload handlers
  setupFileUploads();

  // Set up next button
  document.getElementById('nextSongBtn').addEventListener('click', handleNextSong);
});

async function loadSongsForEvaluation(genres) {
  try {
    // Fetch songs from Spotify for each genre
    for (const genre of genres) {
      const response = await fetch(
        `${API_BASE_URL}/recommendations?context=general&limit=3`
      );

      if (response.ok) {
        const data = await response.json();
        const genreSongs = data.data.slice(0, 3).map(track => ({
          id: track.id,
          title: track.name,
          artist: track.artists.join(', '),
          albumCover: track.albumArt,
          genre: genre,
          spotifyUrl: track.spotifyUrl
        }));
        songs.push(...genreSongs);
      }
    }

    // If no songs loaded, use placeholder data
    if (songs.length === 0) {
      genres.forEach(genre => {
        for (let i = 1; i <= 3; i++) {
          songs.push({
            id: `${genre}-song-${i}`,
            title: `${genre} 곡 ${i}`,
            artist: '아티스트',
            albumCover: 'https://via.placeholder.com/300',
            genre: genre,
            spotifyUrl: ''
          });
        }
      });
    }

    document.getElementById('totalSongs').textContent = songs.length;
  } catch (error) {
    console.error('Error loading songs:', error);
    // Use placeholder data
    genres.forEach(genre => {
      for (let i = 1; i <= 3; i++) {
        songs.push({
          id: `${genre}-song-${i}`,
          title: `${genre} 곡 ${i}`,
          artist: '아티스트',
          albumCover: 'https://via.placeholder.com/300',
          genre: genre,
          spotifyUrl: ''
        });
      }
    });
    document.getElementById('totalSongs').textContent = songs.length;
  }
}

function updateUI() {
  const song = songs[currentSongIndex];
  
  document.getElementById('currentSong').textContent = currentSongIndex + 1;
  document.getElementById('genreLabel').textContent = song.genre.toUpperCase();
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('artistName').textContent = song.artist;
  document.getElementById('albumCover').src = song.albumCover;

  // Update progress bar
  const progress = ((currentSongIndex + 1) / songs.length) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;

  // Reset upload boxes
  document.querySelectorAll('.upload-box').forEach(box => {
    box.classList.remove('uploaded');
    box.querySelector('.upload-status').textContent = '';
  });

  uploadedFiles = {};
  updateNextButton();
}

function setupFileUploads() {
  const fileInputs = ['rawdata', 'fp1', 'fp2', 'biomarkers'];

  fileInputs.forEach(fileType => {
    const input = document.getElementById(`file-${fileType}`);
    const box = document.querySelector(`.upload-box[data-file="${fileType}"]`);

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadedFiles[fileType] = file;
        box.classList.add('uploaded');
        box.querySelector('.upload-status').textContent = file.name;
        updateNextButton();
      }
    });
  });
}

function updateNextButton() {
  const allFilesUploaded = ['rawdata', 'fp1', 'fp2', 'biomarkers'].every(
    type => uploadedFiles[type]
  );

  document.getElementById('nextSongBtn').disabled = !allFilesUploaded;
}

async function handleNextSong() {
  const userId = localStorage.getItem('neurotune_userId') || 'anonymous';
  const currentSong = songs[currentSongIndex];

  // Show loading overlay
  document.getElementById('loadingOverlay').style.display = 'flex';

  try {
    // Prepare form data
    const formData = new FormData();
    formData.append('eeg1', uploadedFiles['rawdata']);
    formData.append('eeg2', uploadedFiles['fp1']);
    formData.append('ecg', uploadedFiles['fp2']);
    formData.append('gsr', uploadedFiles['biomarkers']);
    formData.append('userId', userId);

    // Send to backend for analysis
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      
      // Store evaluation data
      evaluationData.push({
        songId: currentSong.id,
        genre: currentSong.genre,
        results: result.data.results
      });

      // Move to next song or finish
      currentSongIndex++;

      if (currentSongIndex < songs.length) {
        // Hide loading and show next song
        document.getElementById('loadingOverlay').style.display = 'none';
        updateUI();
      } else {
        // All songs evaluated, go to main page
        localStorage.setItem('neurotune_evaluationComplete', 'true');
        window.location.href = '../main-page/index.html';
      }
    } else {
      throw new Error('Analysis failed');
    }
  } catch (error) {
    console.error('Error analyzing EEG data:', error);
    alert('EEG 데이터 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    document.getElementById('loadingOverlay').style.display = 'none';
  }
}
