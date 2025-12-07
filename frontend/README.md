# NeuroTune Frontend

EEG 기반 음악 추천 시스템의 프론트엔드 애플리케이션입니다.

## 구조

```
frontend/
├── index.html                    # 랜딩 페이지
├── onboarding/                   # 온보딩 플로우
│   ├── eeg-connection.html      # EEG 기기 연결 페이지
│   └── eeg-connection.css
├── eeg-evaluation/               # EEG 평가 플로우
│   ├── song-evaluation.html     # 곡별 EEG 데이터 업로드
│   └── song-evaluation.css
├── main-page/                    # 메인 페이지
│   ├── index.html               # 추천 및 플레이리스트
│   └── main-page.css
└── assets/                       # 공통 리소스
    ├── css/
    │   └── common.css           # 공통 스타일
    └── js/
        ├── eeg-connection.js    # EEG 연결 로직
        ├── song-evaluation.js   # 평가 플로우 로직
        └── main-page.js         # 메인 페이지 로직
```

## 주요 기능

### 1. EEG 기기 연결 페이지
- 기기 페어링 애니메이션
- 연결 상태 표시
- 사용자 선호 장르 기반 곡 로드

### 2. 곡 평가 플로우
- 장르별 3곡씩 평가
- 4개 파일 업로드 (Rawdata, Fp1_FFT, Fp2_FFT, Biomarkers)
- 실시간 EEG 데이터 분석
- 진행 상황 표시

### 3. 메인 페이지
- **슬라이딩 사이드바**: 왼쪽 가장자리 호버 시 나타남
  - 최신 뇌파 분석 결과
  - 감정 상태 (집중력, 긴장도, 감정)
  - 뇌파 패턴 시각화
  - 음악 선호도 태그
- **앨범 슬라이더**: 자동 스크롤, 무한 스크롤
- **컨텍스트 선택**: 공부, 운동, 휴식, 수면 전, 출퇴근, 스트레스 해소, 기분 좋음
- **맞춤 플레이리스트**: 컨텍스트 + EEG 데이터 기반

## 백엔드 연동

프론트엔드는 다음 API 엔드포인트를 사용합니다:

### 사용자 선호도
- `POST /api/preferences` - 선호 장르 저장
- `GET /api/preferences/:userId` - 사용자 선호도 조회

### EEG 분석
- `POST /api/analyze` - EEG 데이터 분석
  - 4개 파일 업로드: eeg1, eeg2, ecg, gsr
  - userId (optional)
- `GET /api/analysis/latest/:userId` - 최신 분석 결과
- `GET /api/analysis/history/:userId` - 분석 히스토리

### 음악 추천
- `GET /api/recommendations?context={context}&userId={userId}` - 맞춤 추천
  - context: study, workout, relax, sleep, commute, stress, happy
- `GET /api/search?query={query}` - 곡 검색

## 설치 및 실행

### 1. 백엔드 서버 시작

```bash
cd backend
npm install
cp .env.example .env
# .env 파일에 MongoDB URI와 Spotify 인증 정보 입력
npm start
```

백엔드는 `http://localhost:5000`에서 실행됩니다.

### 2. 프론트엔드 실행

프론트엔드는 정적 HTML/CSS/JS로 구성되어 있어 웹 서버만 있으면 됩니다.

#### 방법 1: Live Server (VSCode Extension)
1. VSCode에서 `frontend/index.html` 열기
2. 우클릭 → "Open with Live Server"

#### 방법 2: Python 간단 서버
```bash
cd frontend
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속

#### 방법 3: Node.js http-server
```bash
npm install -g http-server
cd frontend
http-server -p 8080
```

## 사용 흐름

1. **랜딩 페이지** (`index.html`)
   - "시작하기" 클릭

2. **EEG 기기 연결** (`onboarding/eeg-connection.html`)
   - "연결하기" 버튼 클릭
   - 연결 완료 후 "연결 완료" 클릭

3. **곡 평가** (`eeg-evaluation/song-evaluation.html`)
   - 각 곡마다 4개 파일 업로드
   - EEG 데이터 자동 분석
   - 모든 곡 평가 완료 시 자동으로 메인 페이지 이동

4. **메인 페이지** (`main-page/index.html`)
   - 왼쪽 가장자리에 마우스 올려 사이드바 확인
   - 앨범 슬라이더 탐색
   - 컨텍스트 선택하여 맞춤 플레이리스트 생성

## 디자인 컨셉

기존 NeuroTune 디자인 시스템을 따릅니다:

### 색상
- 배경: `#ededed`
- 텍스트: `#151515`
- 강조: `#dbff44` (네온 옐로우)
- 서브 강조: `#f2ffbc` (연한 옐로우)
- 회색: `#727272`

### 타이포그래피
- 메인 타이틀: Fjalla One
- 본문: System UI 폰트

### 인터랙션
- 부드러운 전환 효과
- 호버 시 살짝 위로 이동
- 클릭 시 scale 애니메이션

## 브라우저 호환성

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 개발 노트

### LocalStorage 사용
- `neurotune_userId`: 사용자 ID
- `neurotune_genres`: 선호 장르 목록
- `neurotune_evaluationComplete`: 평가 완료 여부

### API 통신
모든 API 호출은 `API_BASE_URL` 변수를 통해 관리됩니다.
개발 환경: `http://localhost:5000/api`
프로덕션: `.env` 파일에서 설정

### 파일 업로드
- Multer를 통해 백엔드로 전송
- 각 파일은 특정 필드명으로 전송: eeg1, eeg2, ecg, gsr
- 최대 파일 크기: 10MB

## 향후 개선 사항

- [ ] 실제 EEG 기기 Bluetooth 연동
- [ ] 음악 미리듣기 기능
- [ ] 플레이리스트 저장 및 공유
- [ ] 다국어 지원
- [ ] 모바일 최적화
- [ ] PWA 변환
- [ ] 오프라인 모드

## 라이센스

MIT
