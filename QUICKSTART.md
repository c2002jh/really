# NeuroTune 빠른 시작 가이드

EEG 기반 음악 추천 시스템 전체 설정 가이드입니다.

## 시스템 구성

```
ner/
├── backend/          # Node.js/Express 백엔드 API
│   ├── server.js
│   ├── analysis/    # Python EEG 분석 스크립트
│   └── ...
└── frontend/         # HTML/CSS/JS 프론트엔드
    ├── index.html
    ├── onboarding/
    ├── eeg-evaluation/
    └── main-page/
```

## 1단계: 백엔드 설정

### 필수 요구사항
- Node.js v14+
- MongoDB v4.4+
- Python 3 + NumPy
- Spotify Developer 계정

### 설치 및 실행

```bash
# 1. 백엔드 디렉토리로 이동
cd backend

# 2. 의존성 설치
npm install

# 3. Python 의존성 설치
pip3 install numpy

# 4. 환경 변수 설정
cp .env.example .env

# 5. .env 파일 수정 (필수!)
# - MONGODB_URI=mongodb://localhost:27017/neurotune
# - SPOTIFY_CLIENT_ID=your_client_id
# - SPOTIFY_CLIENT_SECRET=your_client_secret

# 6. MongoDB 시작 (별도 터미널)
mongod

# 7. 백엔드 서버 시작
npm start
```

서버가 `http://localhost:5000`에서 실행됩니다.

### Spotify API 인증 정보 받기

1. https://developer.spotify.com/dashboard 접속
2. "Create an App" 클릭
3. Client ID와 Client Secret을 `.env` 파일에 입력

## 2단계: 프론트엔드 실행

프론트엔드는 정적 HTML 파일이므로 간단한 웹 서버만 있으면 됩니다.

### 방법 1: Python HTTP 서버 (추천)

```bash
# 새 터미널 창에서
cd frontend
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속

### 방법 2: VSCode Live Server

1. VSCode에서 `frontend/index.html` 파일 열기
2. 우클릭 → "Open with Live Server"

### 방법 3: Node.js http-server

```bash
npm install -g http-server
cd frontend
http-server -p 8080
```

## 3단계: 시스템 사용하기

### 1. 랜딩 페이지
- 브라우저에서 `http://localhost:8080` 접속
- "시작하기" 버튼 클릭

### 2. EEG 기기 연결
- "연결하기" 버튼 클릭
- 연결 애니메이션 확인
- "연결 완료" 버튼 클릭

### 3. 곡 평가 (중요!)
각 곡마다 4개의 EEG 데이터 파일을 업로드해야 합니다:

#### 필요한 파일:
1. **Rawdata.txt** - EEG_Fp1, EEG_Fp2, PPG 시계열 데이터
2. **Fp1_FFT.txt** - Fp1 채널 FFT 스펙트럼 (0-127Hz, 0.2Hz 간격)
3. **Fp2_FFT.txt** - Fp2 채널 FFT 스펙트럼
4. **Biomarkers.txt** - 대역 % 및 HRV 지표

#### 테스트용 샘플 파일 생성:

```bash
# 백엔드 디렉토리에서 실행
cd backend

# Python으로 샘플 데이터 생성
python3 << 'EOF'
import numpy as np

# 샘플 EEG 데이터 생성
np.savetxt('sample_rawdata.txt', np.random.randn(1000))
np.savetxt('sample_fp1_fft.txt', np.random.randn(635))
np.savetxt('sample_fp2_fft.txt', np.random.randn(635))
np.savetxt('sample_biomarkers.txt', np.random.randn(10))

print("샘플 파일 생성 완료!")
EOF
```

#### 업로드 과정:
1. 각 파일을 해당 박스에 드래그 앤 드롭
2. 4개 파일 모두 업로드되면 "다음 곡" 버튼 활성화
3. 백엔드가 자동으로 EEG 분석 수행
4. 18곡 모두 완료 시 자동으로 메인 페이지로 이동

### 4. 메인 페이지
- **왼쪽 가장자리에 마우스 올리기** → 사이드바 나타남
  - 뇌파 분석 결과 확인
  - 집중력, 긴장도, 감정 상태
  - 뇌파 패턴 시각화
- **앨범 슬라이더** 탐색
- **컨텍스트 선택**:
  - 📚 공부
  - 💪 운동
  - 😌 휴식
  - 😴 수면 전
  - 🚇 출퇴근
  - 🧘 스트레스 해소
  - 😊 기분 좋음
- **맞춤 플레이리스트** 확인

## API 테스트

백엔드가 제대로 작동하는지 확인:

```bash
# Health check
curl http://localhost:5000/api/health

# Spotify 연결 확인
curl http://localhost:5000/api/auth/verify

# 장르 목록 조회
curl http://localhost:5000/api/auth/genres

# 추천 받기 (공부 컨텍스트)
curl "http://localhost:5000/api/recommendations?context=study"
```

## 문제 해결

### 백엔드 연결 안 됨
- MongoDB가 실행 중인지 확인: `mongod`
- 포트 5000이 사용 중인지 확인: `lsof -i :5000`
- `.env` 파일이 올바르게 설정되었는지 확인

### Spotify API 오류
- Client ID와 Client Secret이 정확한지 확인
- https://developer.spotify.com/dashboard 에서 앱 상태 확인
- `curl http://localhost:5000/api/auth/verify` 로 테스트

### 프론트엔드가 백엔드에 연결 안 됨
- 백엔드가 5000 포트에서 실행 중인지 확인
- 브라우저 콘솔에서 CORS 오류 확인
- `frontend/assets/js/` 파일들의 `API_BASE_URL` 확인

### EEG 분석 실패
- Python 3와 NumPy가 설치되어 있는지 확인: `python3 -c "import numpy; print(numpy.__version__)"`
- 업로드한 파일이 .txt 형식인지 확인
- 파일 크기가 10MB 이하인지 확인

## 전체 시스템 흐름도

```
┌─────────────┐
│ 랜딩 페이지   │
└──────┬──────┘
       │ "시작하기"
       ▼
┌─────────────┐
│ EEG 연결     │ ← 기기 페어링
└──────┬──────┘
       │ "연결 완료"
       ▼
┌─────────────┐
│ 곡 평가      │ ← 4개 파일 × 18곡
│ (EEG 업로드)│   백엔드 분석
└──────┬──────┘
       │ 완료 후 자동 이동
       ▼
┌─────────────┐
│ 메인 페이지  │ ← 사이드바, 앨범, 컨텍스트
│ (추천)       │   맞춤 플레이리스트
└─────────────┘
```

## 다음 단계

### 개발
- EEG 기기 실제 Bluetooth 연동
- 음악 미리듣기 기능 추가
- 플레이리스트 저장 기능
- 사용자 인증 시스템

### 프로덕션 배포
- MongoDB Atlas 설정
- 환경 변수 프로덕션 설정
- Nginx 리버스 프록시 구성
- HTTPS 인증서 설정
- PM2로 백엔드 프로세스 관리

상세한 내용:
- 백엔드: `backend/README.md`, `backend/DEPLOYMENT.md`
- 프론트엔드: `frontend/README.md`
- API 문서: `backend/API_REFERENCE.md`
- 테스트: `backend/TESTING.md`
- 보안: `backend/SECURITY.md`
