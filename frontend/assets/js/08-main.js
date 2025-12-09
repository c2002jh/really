const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Main Page Loaded');
    
    const userId = localStorage.getItem('neurotune_userId');
    
    // Redirect if not logged in
    if (!userId) {
        alert('로그인이 필요합니다.');
        window.location.href = '../onboarding/02-login.html';
        return;
    }

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('neurotune_userId');
        window.location.href = '../onboarding/01-start.html';
    });

    // --- Data Loading ---
    loadUserMood(userId);
    loadContextPlaylist(userId);
    loadAnalysisHistory(userId);
    loadAnalysisStats(userId);
    setupSidebar(userId);

    // --- Modal Logic ---
    const modal = document.getElementById('analysisModal');
    const closeBtn = document.querySelector('.close-modal');
    
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});

/**
 * Load User Mood Analysis
 */
async function loadUserMood(userId) {
    const container = document.getElementById('moodContainer');
    
    try {
        const response = await fetch(`${API_BASE_URL}/music/mood-analysis?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.moodText) {
            container.innerHTML = `<p>${data.moodText}</p>`;
        } else {
            container.innerHTML = '<div class="loading-placeholder">분석할 데이터가 충분하지 않습니다.</div>';
        }
    } catch (error) {
        console.error('Error loading mood:', error);
        container.innerHTML = '<div class="loading-placeholder">데이터를 불러오는 중 오류가 발생했습니다.</div>';
    }
}

/**
 * Load Analysis Stats
 */
async function loadAnalysisStats(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/analysis/count/${userId}`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalAnalyzedCount').textContent = data.count;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Setup Sidebar Logic
 */
function setupSidebar(userId) {
    const resetBtn = document.getElementById('resetDataBtn');
    
    resetBtn.addEventListener('click', async () => {
        if (confirm('정말로 모든 분석 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/analysis/history/${userId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('데이터가 초기화되었습니다.');
                    location.reload();
                } else {
                    alert('초기화 실패: ' + data.error);
                }
            } catch (error) {
                console.error('Error resetting data:', error);
                alert('오류가 발생했습니다.');
            }
        }
    });
}

/**
 * Load Analysis History (Recent Analysis List)
 */
async function loadAnalysisHistory(userId) {
    const listContainer = document.getElementById('analysisList');
    
    try {
        // Fetch analysis history (limit 10)
        const response = await fetch(`${API_BASE_URL}/analysis/history/${userId}?limit=10`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            const items = data.data.map(result => {
                const date = new Date(result.createdAt).toLocaleDateString();
                
                // Determine mood for icon
                let icon = '😐';
                if (result.focus > result.relax) icon = '🧠';
                else if (result.relax > result.focus) icon = '🌿';
                if (result.stress > 0.7) icon = '🔥';

                // Store data for modal
                if (!window.analysisHistoryData) window.analysisHistoryData = [];
                const index = window.analysisHistoryData.push(result) - 1;

                const songTitle = result.songTitle || 'Unknown Song';
                const artistName = result.artistName || 'Unknown Artist';
                const focusScore = (result.focus * 100).toFixed(0);
                const relaxScore = (result.relax * 100).toFixed(0);

                return `
                    <div class="analysis-item" onclick="openAnalysisModal(${index})">
                        <div class="analysis-icon">${icon}</div>
                        <div class="analysis-details">
                            <h4>${songTitle} - ${artistName}</h4>
                            <p>Focus: ${focusScore}% | Relax: ${relaxScore}%</p>
                            <span style="font-size: 0.8rem; color: #888;">${date}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            listContainer.innerHTML = items; 
            
        } else {
            listContainer.innerHTML = '<div class="loading-placeholder">분석 기록이 없습니다.<br>먼저 뇌파를 분석해보세요!</div>';
        }
    } catch (error) {
        console.error('Error loading analysis:', error);
        listContainer.innerHTML = '<div class="loading-placeholder">오류가 발생했습니다.</div>';
    }
}

/**
 * Open Analysis Modal
 */
window.openAnalysisModal = function(index) {
    const data = window.analysisHistoryData[index];
    if (!data) return;

    const modal = document.getElementById('analysisModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    
    modalTitle.textContent = `Analysis Result (${new Date(data.createdAt).toLocaleDateString()})`;
    
    // AI Interpretation or Raw Data Summary
    if (data.aiInterpretation) {
        modalText.innerHTML = data.aiInterpretation.replace(/\n/g, '<br>');
    } else {
        modalText.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <strong>Focus Score:</strong> ${data.focus ? data.focus.toFixed(2) : '-'}<br>
                <strong>Relax Score:</strong> ${data.relax ? data.relax.toFixed(2) : '-'}<br>
                <strong>Stress Score:</strong> ${data.stress ? (data.stress || data.arousal).toFixed(2) : '-'}<br>
            </div>
            <p>AI 상세 분석 결과가 없습니다.</p>
            <button id="generateAiBtn" class="btn-secondary" style="margin-top:10px; padding:8px 16px; background:#24292e; color:white; border:none; border-radius:4px; cursor:pointer;">
                🤖 AI 분석 생성하기
            </button>
        `;
        
        // Add event listener for the button
        setTimeout(() => {
            const btn = document.getElementById('generateAiBtn');
            if (btn) {
                btn.onclick = () => generateAIReport(data.userId);
            }
        }, 0);
    }

    modal.style.display = "block";

    // Render Charts
    renderModalCharts(data);
}

async function generateAIReport(userId) {
    const btn = document.getElementById('generateAiBtn');
    if(btn) {
        btn.disabled = true;
        btn.textContent = "분석 중...";
    }

    try {
        const response = await fetch(`${API_BASE_URL}/analyze/ai-interpretation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const result = await response.json();
        if (result.success) {
            alert("분석 완료! 페이지를 새로고침하면 결과가 표시됩니다.");
            location.reload();
        } else {
            alert("분석 실패: " + result.error);
            if(btn) {
                btn.disabled = false;
                btn.textContent = "다시 시도";
            }
        }
    } catch (e) {
        console.error(e);
        alert("오류 발생");
    }
}

function renderModalCharts(data) {
    // Chart 1: Focus vs Relax
    const ctx1 = document.getElementById('modalChart1').getContext('2d');
    if (window.myModalChart1) window.myModalChart1.destroy();
    
    const focus = data.focus || 0;
    const relax = data.relax || 0;
    const stress = data.stress || data.arousal || 0;

    window.myModalChart1 = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Focus', 'Relax', 'Stress'],
            datasets: [{
                data: [focus, relax, stress],
                backgroundColor: ['#dbff44', '#a55eea', '#ff7675'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Chart 2: Brain Waves (Mock or Real if available)
    const ctx2 = document.getElementById('modalChart2').getContext('2d');
    if (window.myModalChart2) window.myModalChart2.destroy();

    // If we have raw band powers, use them. Otherwise mock.
    // The backend saves thetaPower. Others might be missing in the simplified model.
    // Let's use what we have or mock.
    window.myModalChart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Theta', 'Alpha', 'Beta', 'Gamma'],
            datasets: [{
                label: 'Power',
                data: [
                    data.thetaPower || Math.random(), 
                    (data.relax || 0.5), // Alpha correlates with relax
                    (data.focus || 0.5), // Beta correlates with focus
                    (data.excite || 0.2) // Gamma
                ], 
                backgroundColor: '#dbff44'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

/**
 * Load Context Playlist based on Last Song Analysis
 */
async function loadContextPlaylist(userId) {
    const container = document.getElementById('studyPlaylist');
    const contextText = document.getElementById('playlistContextText');
    
    try {
        const response = await fetch(`${API_BASE_URL}/music/context-playlist?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            contextText.textContent = `현재 기분에 맞는 추천 곡`;
            
            container.innerHTML = data.data.map(song => `
                <div class="playlist-item" onclick="window.open('${song.spotifyUrl}', '_blank')">
                    <img src="${song.image || '../logo_page/icon/neurotune_icon.png'}" class="playlist-cover">
                    <div class="playlist-info">
                        <h4>${song.name}</h4>
                        <p>${song.artist}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="loading-placeholder">추천 곡을 찾을 수 없습니다.</div>';
        }
    } catch (error) {
        console.error('Error loading context playlist:', error);
        container.innerHTML = '<div class="loading-placeholder">데이터를 불러오는 중 오류가 발생했습니다.</div>';
    }
}
