# NeuroTune Backend

Backend API for the NeuroTune system - EEG-based music recommendations powered by Spotify.

## Technology Stack

- **Runtime:** Node.js with Express
- **Database:** MongoDB with Mongoose
- **External API:** Spotify Web API
- **Analysis:** Python 3 with NumPy for EEG processing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Python 3 (with NumPy installed)
- Spotify Developer Account (for API credentials)

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install numpy
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
   - `MONGODB_URI`: Your MongoDB connection string
   - `SPOTIFY_CLIENT_ID`: Your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret
   - `PORT`: Server port (default: 5000)

## Getting Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in the app details and agree to the terms
5. Copy the Client ID and Client Secret to your `.env` file

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Authentication & Spotify
- `GET /api/auth/genres` - Get available music genres from Spotify
- `GET /api/auth/verify` - Verify Spotify API connection

### User Preferences
- `POST /api/preferences` - Save user music preferences
  ```json
  {
    "userId": "user123",
    "genres": ["pop", "rock", "indie"],
    "topArtists": ["artist1", "artist2"],
    "topTracks": ["track1", "track2"]
  }
  ```
- `GET /api/preferences/:userId` - Get user preferences

### Music Recommendations
- `GET /api/recommendations?context={context}&userId={userId}` - Get personalized recommendations
  - Context options: `study`, `workout`, `relax`, `focus`, `party`, `general`
  - Example: `/api/recommendations?context=study&userId=user123`

- `GET /api/search?query={query}` - Search for tracks
  - Example: `/api/search?query=bohemian%20rhapsody`

- `GET /api/audio-features/:trackId` - Get audio features for a specific track

### EEG Analysis
- `POST /api/analyze` - Upload and analyze EEG data
  - Requires 4 files: `eeg1`, `eeg2`, `ecg`, `gsr` (all `.txt` files)
  - Optional: `userId` in form data
  - Example using curl:
  ```bash
  curl -X POST http://localhost:5000/api/analyze \
    -F "eeg1=@path/to/eeg1.txt" \
    -F "eeg2=@path/to/eeg2.txt" \
    -F "ecg=@path/to/ecg.txt" \
    -F "gsr=@path/to/gsr.txt" \
    -F "userId=user123"
  ```

- `GET /api/analysis/history/:userId` - Get analysis history for a user
- `GET /api/analysis/latest/:userId` - Get latest analysis result

## Directory Structure

```
backend/
├── analysis/
│   └── eeg_process.py       # Python script for EEG signal processing
├── config/
│   └── db.js                # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Spotify authentication handlers
│   ├── musicController.js   # Music recommendation handlers
│   └── analysisController.js # EEG analysis handlers
├── models/
│   ├── UserPreference.js    # User preference schema
│   └── AnalysisResult.js    # EEG analysis result schema
├── routes/
│   └── api.js               # API route definitions
├── services/
│   ├── spotifyService.js    # Spotify API wrapper
│   └── eegService.js        # EEG processing service
├── uploads/                 # Temporary folder for uploaded files
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Node.js dependencies
├── server.js                # Application entry point
└── README.md                # This file
```

## Context-Based Recommendations

The system provides context-aware music recommendations with predefined audio feature targets:

| Context  | Target Valence | Target Energy | Description                    |
|----------|----------------|---------------|--------------------------------|
| study    | 0.3            | 0.4           | Calm, focused music            |
| workout  | 0.8            | 0.9           | High energy, motivational      |
| relax    | 0.4            | 0.2           | Calm, soothing music           |
| focus    | 0.5            | 0.5           | Moderate energy for concentration |
| party    | 0.9            | 0.85          | High energy for social events  |
| general  | 0.5            | 0.5           | Balanced recommendations       |

When EEG data is available, these targets are adjusted based on the user's measured arousal and valence levels.

## EEG Analysis

The system processes four types of physiological signals:

1. **EEG1 & EEG2**: Electroencephalography signals (brain activity)
2. **ECG**: Electrocardiography signal (heart activity)
3. **GSR**: Galvanic Skin Response (skin conductance)

These signals are analyzed to calculate:

- **Theta Power**: Brain wave activity in the theta band (focus/meditation)
- **HRV**: Heart Rate Variability (stress/relaxation indicator)
- **P300 Latency**: Event-related potential (attention/engagement)
- **Engagement**: Overall engagement level (0-1)
- **Arousal**: Energy/excitement level (0-1)
- **Valence**: Emotional positivity (0-1)
- **Overall Preference**: Combined preference score (0-1)

## Error Handling

All endpoints return standardized JSON responses:

### Success Response:
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Production Deployment

1. Set `NODE_ENV=production` in your `.env` file
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js --name neurotune-backend
```

3. Set up MongoDB with proper authentication
4. Configure CORS for your frontend domain
5. Use HTTPS in production (configure reverse proxy like Nginx)

## License

MIT
