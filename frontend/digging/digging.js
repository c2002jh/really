const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('neurotune_userId');
    if (!userId) {
        alert('로그인이 필요합니다.');
        window.location.href = '../onboarding/02-login.html';
        return;
    }

    // Back Button (Main)
    document.getElementById('backToMainBtn').addEventListener('click', () => {
        window.location.href = '../main-page/08-main.html';
    });

    // Back Button (Genre)
    document.getElementById('backToGenreBtn').addEventListener('click', () => {
        // Stop recording if active
        if (isRecording) {
            if (!confirm('녹음 중입니다. 중단하고 돌아가시겠습니까?')) return;
            stopRecording();
        }
        
        document.getElementById('diggingSection').classList.remove('active');
        document.getElementById('diggingSection').classList.add('hidden');
        
        document.getElementById('genreSection').classList.remove('hidden');
        document.getElementById('genreSection').classList.add('active');
    });

    // Initialize Genre Grid
    initGenreGrid();

    // Setup Action Button (Start/Stop)
    setupActionBtn();

    // Setup Upload Form
    setupUploadForm(userId);
    
    // Setup File Inputs Visuals
    setupFileInputs();
});

function initGenreGrid() {
    const genres = [
        'pop', 'k-pop', 'hip-hop', 'r-n-b', 'rock', 
        'indie', 'jazz', 'classical', 'electronic', 'chill'
    ];
    
    const grid = document.getElementById('genreGrid');
    grid.innerHTML = genres.map(genre => `
        <div class="genre-card" onclick="selectGenre('${genre}')">
            ${genre}
        </div>
    `).join('');
}

function selectGenre(genre) {
    document.getElementById('genreSection').classList.remove('active');
    document.getElementById('genreSection').classList.add('hidden');
    
    document.getElementById('diggingSection').classList.remove('hidden');
    document.getElementById('diggingSection').classList.add('active');
    
    document.getElementById('selectedGenreTitle').textContent = genre.toUpperCase();
    
    // Load Spotify Player
    loadSpotifyPlayer(genre);
}

async function loadSpotifyPlayer(genre) {
    const container = document.getElementById('spotifyEmbedContainer');
    
    // Use Spotify Embed with search query
    const embedUrl = `https://open.spotify.com/embed/search/${genre}`;
    
    container.innerHTML = `
        <iframe style="border-radius:12px" 
            src="${embedUrl}" 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            allowfullscreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy">
        </iframe>
    `;
}

let isRecording = false;
let startTime;
let timerInterval;

function setupActionBtn() {
    const btn = document.getElementById('actionBtn');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const uploadArea = document.getElementById('uploadArea');
    
    btn.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
}

function startRecording() {
    const btn = document.getElementById('actionBtn');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const uploadArea = document.getElementById('uploadArea');

    isRecording = true;
    btn.textContent = "STOP DIGGING";
    btn.classList.add('recording-active');
    
    statusTitle.textContent = "Recording EEG...";
    statusDesc.textContent = "음악을 감상하며 뇌파를 측정하고 있습니다.";
    
    // Start Timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    // Hide upload area if visible
    uploadArea.classList.add('hidden');
}

function stopRecording() {
    const btn = document.getElementById('actionBtn');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const uploadArea = document.getElementById('uploadArea');

    isRecording = false;
    btn.textContent = "START DIGGING";
    btn.classList.remove('recording-active');
    
    statusTitle.textContent = "Session Complete";
    statusDesc.textContent = "측정된 데이터를 아래에 업로드해주세요.";
    
    // Stop Timer
    clearInterval(timerInterval);
    
    // Show Upload Area
    uploadArea.classList.remove('hidden');
    
    // Scroll to upload area
    setTimeout(() => {
        uploadArea.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function updateTimer() {
    const now = Date.now();
    const diff = now - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('diggingTimer').textContent = 
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

function setupFileInputs() {
    const inputs = document.querySelectorAll('.upload-box input');
    inputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const box = e.target.closest('.upload-box');
            if (e.target.files.length > 0) {
                box.classList.add('uploaded');
                box.querySelector('.upload-label').textContent = e.target.files[0].name;
            } else {
                box.classList.remove('uploaded');
            }
        });
    });
}

function setupUploadForm(userId) {
    const form = document.getElementById('uploadForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        formData.append('userId', userId);
        
        // Add metadata
        const genre = document.getElementById('selectedGenreTitle').textContent;
        formData.append('songTitle', `Digging Session - ${genre}`);
        formData.append('artistName', 'Various Artists');
        
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = "분석 중...";
        
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('분석이 완료되었습니다!');
                window.location.href = '../main-page/08-main.html';
            } else {
                alert('분석 실패: ' + result.error);
                submitBtn.disabled = false;
                submitBtn.textContent = "ANALYZE SESSION";
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('업로드 중 오류가 발생했습니다.');
            submitBtn.disabled = false;
            submitBtn.textContent = "ANALYZE SESSION";
        }
    });
}
