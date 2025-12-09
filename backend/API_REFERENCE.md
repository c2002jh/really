# NeuroTune API Reference

Complete API documentation for the NeuroTune backend system.

## Base URL

- **Development:** `http://localhost:5000`
- **Production:** `https://api.yourdomain.com`

## Authentication

Currently, the API uses Spotify Client Credentials flow for Spotify API access. User authentication endpoints will be added in future versions.

## Rate Limits

Different rate limits apply to different endpoint categories:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Read Operations | 200 requests | 15 minutes |
| Database Operations | 30 requests | 15 minutes |
| General Operations | 100 requests | 15 minutes |
| File Uploads | 5 requests | 1 hour |

Rate limit information is returned in response headers:
- `RateLimit-Limit`: Maximum number of requests
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Endpoints

### Health & Status

#### GET /api/health
Check if the API is running.

**Rate Limit:** Read (200/15min)

**Response:**
```json
{
  "success": true,
  "message": "NeuroTune API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Authentication & Spotify

### GET /api/auth/genres
Get available music genres from Spotify.

**Rate Limit:** Read (200/15min)

**Response:**
```json
{
  "success": true,
  "count": 126,
  "data": [
    "acoustic",
    "afrobeat",
    "alt-rock",
    "alternative",
    "ambient",
    ...
  ]
}
```

### GET /api/auth/verify
Verify Spotify API connection.

**Rate Limit:** Read (200/15min)

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to Spotify API"
}
```

---

## User Preferences

### POST /api/preferences
Save user music preferences.

**Rate Limit:** Database (30/15min)

**Request Body:**
```json
{
  "userId": "user123",
  "genres": ["pop", "rock", "indie"],
  "topArtists": ["The Beatles", "Queen"],
  "topTracks": ["Bohemian Rhapsody", "Hey Jude"]
}
```

**Required Fields:**
- `userId` (string): Unique user identifier
- `genres` (array): Array of genre strings (at least 1 required)

**Optional Fields:**
- `topArtists` (array): Array of artist names
- `topTracks` (array): Array of track names

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "genres": ["pop", "rock", "indie"],
    "topArtists": ["The Beatles", "Queen"],
    "topTracks": ["Bohemian Rhapsody", "Hey Jude"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/preferences/:userId
Get user preferences by user ID.

**Rate Limit:** Read (200/15min)

**Path Parameters:**
- `userId` (string): User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "genres": ["pop", "rock", "indie"],
    "topArtists": ["The Beatles", "Queen"],
    "topTracks": ["Bohemian Rhapsody", "Hey Jude"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "User preferences not found"
}
```

---

## Music Recommendations

### GET /api/recommendations
Get personalized music recommendations based on context and optional EEG data.

**Rate Limit:** Database (30/15min)

**Query Parameters:**
- `context` (string, optional): Music context - `study`, `workout`, `relax`, `focus`, `party`, `general` (default)
- `userId` (string, optional): User ID to fetch preferences and EEG data
- `limit` (number, optional): Number of tracks to return (default: 20, max: 100)

**Context Target Features:**

| Context | Valence | Energy | Description |
|---------|---------|--------|-------------|
| study | 0.3 | 0.4 | Calm, focused music |
| workout | 0.8 | 0.9 | High energy, motivational |
| relax | 0.4 | 0.2 | Calm, soothing |
| focus | 0.5 | 0.5 | Moderate, neutral |
| party | 0.9 | 0.85 | High energy, positive |
| general | 0.5 | 0.5 | Balanced |

**Example Request:**
```
GET /api/recommendations?context=study&userId=user123&limit=10
```

**Response:**
```json
{
  "success": true,
  "context": "study",
  "parameters": {
    "targetValence": 0.3,
    "targetEnergy": 0.4,
    "seedGenres": ["pop", "rock", "indie"],
    "eegModifier": 0.6023
  },
  "eegData": {
    "engagement": 0.562,
    "arousal": 0.555,
    "valence": 0.6662,
    "overallPreference": 0.6023
  },
  "count": 10,
  "data": [
    {
      "id": "3n3Ppam7vgaVa1iaRUc9Lp",
      "name": "Mr. Brightside",
      "artists": ["The Killers"],
      "album": "Hot Fuss",
      "albumArt": "https://i.scdn.co/image/...",
      "duration": 222000,
      "previewUrl": "https://p.scdn.co/mp3-preview/...",
      "spotifyUrl": "https://open.spotify.com/track/..."
    }
  ]
}
```

### GET /api/search
Search for tracks on Spotify.

**Rate Limit:** General (100/15min)

**Query Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Number of results (default: 20, max: 100)

**Example Request:**
```
GET /api/search?query=bohemian+rhapsody&limit=5
```

**Response:**
```json
{
  "success": true,
  "query": "bohemian rhapsody",
  "count": 5,
  "data": [
    {
      "id": "7tFiyTwD0nx5a1eklYtX2J",
      "name": "Bohemian Rhapsody - Remastered 2011",
      "artists": ["Queen"],
      "album": "A Night At The Opera",
      "albumArt": "https://i.scdn.co/image/...",
      "duration": 354320,
      "previewUrl": "https://p.scdn.co/mp3-preview/...",
      "spotifyUrl": "https://open.spotify.com/track/..."
    }
  ]
}
```

### GET /api/audio-features/:trackId
Get audio features for a specific Spotify track.

**Rate Limit:** General (100/15min)

**Path Parameters:**
- `trackId` (string): Spotify track ID

**Example Request:**
```
GET /api/audio-features/3n3Ppam7vgaVa1iaRUc9Lp
```

**Response:**
```json
{
  "success": true,
  "data": {
    "acousticness": 0.00242,
    "analysis_url": "https://api.spotify.com/v1/audio-analysis/...",
    "danceability": 0.350,
    "duration_ms": 222075,
    "energy": 0.923,
    "id": "3n3Ppam7vgaVa1iaRUc9Lp",
    "instrumentalness": 0.00686,
    "key": 1,
    "liveness": 0.0813,
    "loudness": -4.817,
    "mode": 1,
    "speechiness": 0.0311,
    "tempo": 148.108,
    "time_signature": 4,
    "track_href": "https://api.spotify.com/v1/tracks/...",
    "type": "audio_features",
    "uri": "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    "valence": 0.962
  }
}
```

---

## EEG Analysis

### POST /api/analyze
Upload and analyze EEG data files.

**Rate Limit:** Upload (5/hour)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `eeg1` (file, required): First EEG channel data (.txt file)
- `eeg2` (file, required): Second EEG channel data (.txt file)
- `ecg` (file, required): ECG data (.txt file)
- `gsr` (file, required): GSR data (.txt file)
- `userId` (string, optional): User identifier (defaults to "anonymous")

**File Requirements:**
- Format: Plain text (.txt)
- Content: Numeric values (space or comma separated)
- Max size: 10MB per file

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/analyze \
  -F "eeg1=@eeg1.txt" \
  -F "eeg2=@eeg2.txt" \
  -F "ecg=@ecg.txt" \
  -F "gsr=@gsr.txt" \
  -F "userId=user123"
```

**Response:**
```json
{
  "success": true,
  "message": "EEG analysis completed successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "results": {
      "thetaPower": 0.59,
      "hrv": 0.544,
      "p300Latency": 0.48,
      "engagement": 0.562,
      "arousal": 0.555,
      "valence": 0.6662,
      "overallPreference": 0.6023
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Metrics Explanation:**
- `thetaPower` (0-1): Brain wave activity in theta band (4-8 Hz), indicates relaxation/focus
- `hrv` (0-1): Heart Rate Variability, indicates stress/relaxation
- `p300Latency` (0-1): Event-related potential component, indicates attention
- `engagement` (0-1): Overall engagement level
- `arousal` (0-1): Energy/excitement level
- `valence` (0-1): Emotional positivity (higher = more positive)
- `overallPreference` (0-1): Combined preference score

**Error Responses:**

Missing files (400):
```json
{
  "success": false,
  "error": "Missing required file: eeg1"
}
```

Invalid file type (400):
```json
{
  "success": false,
  "error": "File sample.pdf must be a .txt file"
}
```

File too large (400):
```json
{
  "success": false,
  "error": "File size too large. Maximum size is 10MB"
}
```

### GET /api/analysis/history/:userId
Get analysis history for a user.

**Rate Limit:** Read (200/15min)

**Path Parameters:**
- `userId` (string): User identifier

**Query Parameters:**
- `limit` (number, optional): Number of results per page (default: 10, max: 100)
- `page` (number, optional): Page number (default: 1)

**Example Request:**
```
GET /api/analysis/history/user123?limit=5&page=1
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 23,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user123",
      "thetaPower": 0.59,
      "hrv": 0.544,
      "p300Latency": 0.48,
      "engagement": 0.562,
      "arousal": 0.555,
      "valence": 0.6662,
      "overallPreference": 0.6023,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/analysis/latest/:userId
Get the latest analysis result for a user.

**Rate Limit:** Read (200/15min)

**Path Parameters:**
- `userId` (string): User identifier

**Example Request:**
```
GET /api/analysis/latest/user123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "thetaPower": 0.59,
    "hrv": 0.544,
    "p300Latency": 0.48,
    "engagement": 0.562,
    "arousal": 0.555,
    "valence": 0.6662,
    "overallPreference": 0.6023,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "No analysis found for this user"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters or missing required fields |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

## Common Errors

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

### Invalid Endpoint (404)
```json
{
  "success": false,
  "error": "Endpoint not found"
}
```

### Missing Required Field (400)
```json
{
  "success": false,
  "error": "userId and genres array are required"
}
```

### Spotify Connection Error (500)
```json
{
  "success": false,
  "error": "Failed to authenticate with Spotify"
}
```

### Database Error (500)
```json
{
  "success": false,
  "error": "Failed to save preferences"
}
```

## Example Workflows

### Workflow 1: Get Personalized Recommendations

1. Save user preferences:
```bash
curl -X POST http://localhost:5000/api/preferences \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "genres": ["pop", "rock"]}'
```

2. Get recommendations for studying:
```bash
curl "http://localhost:5000/api/recommendations?context=study&userId=user123"
```

### Workflow 2: EEG-Based Recommendations

1. Upload and analyze EEG data:
```bash
curl -X POST http://localhost:5000/api/analyze \
  -F "eeg1=@eeg1.txt" \
  -F "eeg2=@eeg2.txt" \
  -F "ecg=@ecg.txt" \
  -F "gsr=@gsr.txt" \
  -F "userId=user123"
```

2. Get personalized recommendations (automatically uses latest EEG data):
```bash
curl "http://localhost:5000/api/recommendations?context=workout&userId=user123"
```

3. View analysis history:
```bash
curl "http://localhost:5000/api/analysis/history/user123"
```

### Workflow 3: Music Search and Discovery

1. Search for a specific song:
```bash
curl "http://localhost:5000/api/search?query=imagine+john+lennon"
```

2. Get audio features for a track:
```bash
curl "http://localhost:5000/api/audio-features/7pKfPomDEeI4TPT6EOYjn9"
```

3. Get available genres:
```bash
curl "http://localhost:5000/api/auth/genres"
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- File paths are stored securely on the server and not exposed in API responses
- EEG analysis results influence recommendations automatically when available
- Rate limits are per IP address
- The system uses Spotify's recommendation algorithm with custom parameters based on context and EEG data

## Support

For issues or questions about the API:
- Check the comprehensive [README.md](README.md) for setup instructions
- Review [TESTING.md](TESTING.md) for testing procedures
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

## Version

Current API Version: 1.0.0
