# NeuroTune 설정 문제 해결 가이드 (Setup Troubleshooting)

## 🔴 문제: "서버 연결에 실패했습니다" 에러

회원가입 시 "서버 연결에 실패했습니다. 백엔드가 실행 중인지 확인해주세요." 메시지가 나타나는 경우

### 원인

1. 백엔드 서버가 실행되지 않음
2. 백엔드 dependencies가 설치되지 않음
3. MongoDB 연결 실패
4. 포트 충돌 (5000번 포트가 이미 사용 중)

### 해결 방법

#### 1단계: 백엔드 Dependencies 설치

```bash
cd backend
npm install
```

**중요:** 반드시 `npm install`을 실행해야 합니다. 다음 패키지들이 설치됩니다:
- `bcryptjs` - 비밀번호 암호화 (필수!)
- `express` - 웹 서버
- `mongoose` - MongoDB 연동
- `axios` - Spotify API 통신
- `multer` - 파일 업로드
- 기타 필수 패키지들

#### 2단계: 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집
nano .env  # 또는 원하는 텍스트 에디터 사용
```

**최소 설정 (테스트용):**
```env
# MongoDB 연결 (필수)
MONGODB_URI=mongodb://localhost:27017/neurotune

# 서버 포트
PORT=5000

# Spotify API (선택사항 - 나중에 설정 가능)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# CORS 설정
CORS_ORIGIN=*

# 환경
NODE_ENV=development
```

**MongoDB 설치 방법:**

**Option 1: MongoDB Atlas (클라우드, 추천)**
1. https://www.mongodb.com/cloud/atlas 방문
2. 무료 계정 생성
3. 무료 클러스터 생성
4. "Connect" 클릭 → "Connect your application" 선택
5. Connection string 복사하여 `.env` 파일의 `MONGODB_URI`에 붙여넣기
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/neurotune?retryWrites=true&w=majority
   ```

**Option 2: 로컬 MongoDB**
```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo service mongodb start

# Windows
# MongoDB 공식 사이트에서 설치: https://www.mongodb.com/try/download/community
```

#### 3단계: 백엔드 서버 시작

```bash
cd backend
npm start
```

**성공 시 다음과 같은 메시지가 표시됩니다:**
```
╔════════════════════════════════════════╗
║       NeuroTune Backend Server         ║
║                                        ║
║  Server running on port 5000           ║
║  Environment: development              ║
║                                        ║
║  API Documentation: http://localhost:5000  ║
╚════════════════════════════════════════╝

MongoDB Connected: localhost
```

#### 4단계: 서버 연결 테스트

**방법 1: 브라우저에서 테스트**
```
http://localhost:5000/api/health
```

다음과 같은 응답이 나와야 합니다:
```json
{
  "success": true,
  "message": "NeuroTune API is running",
  "timestamp": "2025-12-07T18:26:08.000Z"
}
```

**방법 2: curl 명령어로 테스트**
```bash
curl http://localhost:5000/api/health
```

#### 5단계: 프론트엔드 실행

**새 터미널 창에서:**
```bash
cd frontend
python3 -m http.server 8080

# 또는 Python 2.x를 사용하는 경우:
python -m SimpleHTTPServer 8080
```

**브라우저에서 접속:**
```
http://localhost:8080/onboarding/01-start.html
```

## 🔧 자주 발생하는 문제들

### 문제 1: `bcrypt` 또는 `bcryptjs` 관련 에러

**에러 메시지:**
```
Error: Cannot find module 'bcryptjs'
```

**해결:**
```bash
cd backend
npm install bcryptjs
```

### 문제 2: MongoDB 연결 실패

**에러 메시지:**
```
MongoNetworkError: failed to connect to server
```

**해결:**
1. MongoDB가 실행 중인지 확인
   ```bash
   # macOS
   brew services list | grep mongodb
   
   # Linux
   sudo service mongodb status
   ```

2. `.env` 파일의 `MONGODB_URI` 확인
   - 로컬: `mongodb://localhost:27017/neurotune`
   - Atlas: Connection string이 올바른지 확인

3. 방화벽 설정 확인 (필요시)

### 문제 3: 포트 5000이 이미 사용 중

**에러 메시지:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**해결:**
```bash
# 포트를 사용 중인 프로세스 찾기
# macOS/Linux:
lsof -i :5000

# Windows:
netstat -ano | findstr :5000

# 프로세스 종료 후 다시 실행
# 또는 .env 파일에서 다른 포트로 변경
PORT=5001
```

### 문제 4: CORS 에러

**에러 메시지 (브라우저 콘솔):**
```
Access to fetch at 'http://localhost:5000/api/user/register' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**해결:**
`.env` 파일 확인:
```env
CORS_ORIGIN=*
# 또는 특정 origin만 허용:
CORS_ORIGIN=http://localhost:8080
```

### 문제 5: `npm install` 실패

**에러: 권한 문제**
```bash
# Linux/macOS - sudo 사용 (권장하지 않음)
# 대신 nvm 사용 권장

# Node Version Manager 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**에러: 네트워크 문제**
```bash
# npm 레지스트리 변경
npm config set registry https://registry.npmjs.org/

# 또는 캐시 클리어
npm cache clean --force
```

## 📝 완전한 실행 체크리스트

### 백엔드 설정
- [ ] Node.js 설치 완료 (v14 이상)
- [ ] `cd backend` 디렉토리 이동
- [ ] `npm install` 실행 완료
- [ ] `.env` 파일 생성 및 설정
- [ ] MongoDB 실행 중 (로컬 또는 Atlas)
- [ ] `npm start`로 서버 시작
- [ ] `http://localhost:5000/api/health` 테스트 성공

### 프론트엔드 설정
- [ ] Python 설치 완료
- [ ] `cd frontend` 디렉토리 이동
- [ ] `python3 -m http.server 8080` 실행
- [ ] `http://localhost:8080/onboarding/01-start.html` 접속 성공

### 테스트
- [ ] 회원가입 페이지 로드 성공
- [ ] 회원가입 폼 제출 성공
- [ ] 로그인 기능 작동
- [ ] 다음 페이지로 이동 성공

## 🚀 빠른 시작 스크립트

**자동화된 설정 (Linux/macOS):**

```bash
#!/bin/bash
# setup.sh - 프로젝트 초기 설정 스크립트

echo "🔧 NeuroTune 프로젝트 설정 시작..."

# 백엔드 설정
echo "📦 백엔드 dependencies 설치 중..."
cd backend
npm install

if [ ! -f .env ]; then
    echo "⚙️ .env 파일 생성 중..."
    cp .env.example .env
    echo "✅ .env 파일이 생성되었습니다. MongoDB URI를 설정해주세요."
fi

echo "✅ 백엔드 설정 완료!"
echo ""
echo "🚀 서버를 시작하려면:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "🌐 프론트엔드를 실행하려면 (새 터미널에서):"
echo "   cd frontend"
echo "   python3 -m http.server 8080"
```

**사용 방법:**
```bash
chmod +x setup.sh
./setup.sh
```

## 📞 추가 도움말

문제가 계속되면:

1. **로그 확인**
   ```bash
   # 백엔드 로그 확인
   cd backend
   npm start 2>&1 | tee server.log
   ```

2. **버전 확인**
   ```bash
   node --version  # v14 이상이어야 함
   npm --version   # v6 이상이어야 함
   python3 --version  # v3.6 이상이어야 함
   ```

3. **디버그 모드 실행**
   ```bash
   cd backend
   NODE_ENV=development npm start
   ```

4. **GitHub Issues**
   - 저장소의 Issues 탭에서 비슷한 문제 검색
   - 새 이슈 생성 시 에러 로그 첨부

## ✅ 성공 확인

모든 것이 정상적으로 작동하면:

1. 백엔드 터미널에 "MongoDB Connected" 메시지 표시
2. `http://localhost:5000/api/health` 접속 시 JSON 응답
3. 프론트엔드에서 회원가입 시 "회원가입이 완료되었습니다!" 메시지
4. 다음 페이지(API 연결 확인)로 자동 이동

---

**마지막 업데이트:** 2025-12-07
**작성자:** GitHub Copilot Agent
