# NeuroTune Backend Testing Guide

This guide provides instructions for testing the NeuroTune backend system.

## Prerequisites

Before testing, ensure you have:

1. **Node.js** (v14 or higher) installed
2. **MongoDB** running locally or accessible via connection string
3. **Python 3** with NumPy installed (`pip install numpy`)
4. **Spotify API Credentials** (Client ID and Client Secret)

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your credentials:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/neurotune
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

## Unit Tests

### Test 1: Python EEG Analysis Script

Create sample data files:

```bash
mkdir -p /tmp/test_data
cd /tmp/test_data

# Create sample EEG1 data
cat > eeg1.txt << EOF
0.5
0.6
0.7
0.4
0.5
EOF

# Create sample EEG2 data
cat > eeg2.txt << EOF
0.3
0.4
0.5
0.6
0.7
EOF

# Create sample ECG data
cat > ecg.txt << EOF
0.8
0.9
0.7
0.8
0.9
EOF

# Create sample GSR data
cat > gsr.txt << EOF
0.5
0.6
0.5
0.4
0.5
EOF
```

Run the Python script:

```bash
python3 backend/analysis/eeg_process.py /tmp/test_data/eeg1.txt /tmp/test_data/eeg2.txt /tmp/test_data/ecg.txt /tmp/test_data/gsr.txt
```

Expected output (JSON format):
```json
{
  "theta_power": 0.xxxx,
  "hrv": 0.xxxx,
  "p300_latency": 0.xxxx,
  "engagement": 0.xxxx,
  "arousal": 0.xxxx,
  "valence": 0.xxxx,
  "overall_preference": 0.xxxx
}
```

### Test 2: Start the Server

Start the backend server:

```bash
cd backend
npm start
```

Expected output:
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

## API Endpoint Tests

With the server running, test the following endpoints using curl or a tool like Postman.

### Test 3: Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "NeuroTune API is running",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ"
}
```

### Test 4: Get Available Genres

```bash
curl http://localhost:5000/api/auth/genres
```

Expected response:
```json
{
  "success": true,
  "count": 126,
  "data": ["acoustic", "afrobeat", "alt-rock", ...]
}
```

### Test 5: Verify Spotify Connection

```bash
curl http://localhost:5000/api/auth/verify
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully connected to Spotify API"
}
```

### Test 6: Save User Preferences

```bash
curl -X POST http://localhost:5000/api/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "genres": ["pop", "rock", "indie"],
    "topArtists": ["The Beatles", "Queen"],
    "topTracks": ["Bohemian Rhapsody"]
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "userId": "test_user_123",
    "genres": ["pop", "rock", "indie"],
    "topArtists": ["The Beatles", "Queen"],
    "topTracks": ["Bohemian Rhapsody"],
    "_id": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Test 7: Get User Preferences

```bash
curl http://localhost:5000/api/preferences/test_user_123
```

### Test 8: Get Music Recommendations (Study Context)

```bash
curl "http://localhost:5000/api/recommendations?context=study&userId=test_user_123"
```

Expected response:
```json
{
  "success": true,
  "context": "study",
  "parameters": {
    "targetValence": 0.3,
    "targetEnergy": 0.4,
    "seedGenres": ["pop", "rock", "indie"],
    "eegModifier": 1.0
  },
  "count": 20,
  "data": [
    {
      "id": "...",
      "name": "Track Name",
      "artists": ["Artist Name"],
      "album": "Album Name",
      "albumArt": "https://...",
      "duration": 240000,
      "previewUrl": "https://...",
      "spotifyUrl": "https://..."
    }
  ]
}
```

### Test 9: Get Music Recommendations (Workout Context)

```bash
curl "http://localhost:5000/api/recommendations?context=workout"
```

### Test 10: Search for Tracks

```bash
curl "http://localhost:5000/api/search?query=bohemian+rhapsody&limit=5"
```

### Test 11: Analyze EEG Data

```bash
curl -X POST http://localhost:5000/api/analyze \
  -F "eeg1=@/tmp/test_data/eeg1.txt" \
  -F "eeg2=@/tmp/test_data/eeg2.txt" \
  -F "ecg=@/tmp/test_data/ecg.txt" \
  -F "gsr=@/tmp/test_data/gsr.txt" \
  -F "userId=test_user_123"
```

Expected response:
```json
{
  "success": true,
  "message": "EEG analysis completed successfully",
  "data": {
    "id": "...",
    "userId": "test_user_123",
    "results": {
      "thetaPower": 0.xxxx,
      "hrv": 0.xxxx,
      "p300Latency": 0.xxxx,
      "engagement": 0.xxxx,
      "arousal": 0.xxxx,
      "valence": 0.xxxx,
      "overallPreference": 0.xxxx
    },
    "createdAt": "..."
  }
}
```

### Test 12: Get Analysis History

```bash
curl http://localhost:5000/api/analysis/history/test_user_123
```

### Test 13: Get Latest Analysis

```bash
curl http://localhost:5000/api/analysis/latest/test_user_123
```

### Test 14: Get Recommendations with EEG Data

After uploading EEG data, test recommendations again to see EEG-adjusted results:

```bash
curl "http://localhost:5000/api/recommendations?context=study&userId=test_user_123"
```

The response should now include `eegData` with the latest analysis results, and the recommendations should be adjusted based on the user's arousal and valence levels.

## Integration Test Workflow

Complete workflow test:

1. Start the server
2. Verify Spotify connection
3. Get available genres
4. Save user preferences
5. Upload and analyze EEG data
6. Get personalized recommendations (should be influenced by EEG data)
7. Search for specific tracks
8. View analysis history

## Error Handling Tests

### Test Missing Required Parameters

```bash
# Missing userId in preferences
curl -X POST http://localhost:5000/api/preferences \
  -H "Content-Type: application/json" \
  -d '{"genres": ["pop"]}'
```

Expected: 400 error with appropriate message

### Test Missing Files in Analysis

```bash
# Upload only 3 files instead of 4
curl -X POST http://localhost:5000/api/analyze \
  -F "eeg1=@/tmp/test_data/eeg1.txt" \
  -F "eeg2=@/tmp/test_data/eeg2.txt" \
  -F "ecg=@/tmp/test_data/ecg.txt"
```

Expected: 400 error indicating missing file

### Test Invalid Endpoint

```bash
curl http://localhost:5000/api/invalid-endpoint
```

Expected: 404 error

## Performance Tests

### Load Test for Recommendations

Test multiple concurrent recommendation requests:

```bash
for i in {1..10}; do
  curl "http://localhost:5000/api/recommendations?context=study" &
done
wait
```

All requests should complete successfully.

### Large File Upload Test

Create larger test files (up to 10MB) and test the file upload:

```bash
python3 << EOF
import numpy as np

# Generate larger dataset (10,000 points)
data = np.random.randn(10000) * 0.5
np.savetxt('/tmp/test_data/large_eeg1.txt', data)
EOF

curl -X POST http://localhost:5000/api/analyze \
  -F "eeg1=@/tmp/test_data/large_eeg1.txt" \
  -F "eeg2=@/tmp/test_data/eeg2.txt" \
  -F "ecg=@/tmp/test_data/ecg.txt" \
  -F "gsr=@/tmp/test_data/gsr.txt"
```

Should process successfully and return results.

## Troubleshooting

### MongoDB Connection Issues

If you see `MongoDB connection error`:
- Check that MongoDB is running: `sudo systemctl status mongodb`
- Verify connection string in `.env`
- Check MongoDB logs: `tail -f /var/log/mongodb/mongodb.log`

### Spotify API Issues

If you see `Failed to authenticate with Spotify`:
- Verify your Client ID and Client Secret in `.env`
- Check that credentials are active in Spotify Developer Dashboard
- Test credentials: `curl http://localhost:5000/api/auth/verify`

### Python Script Issues

If EEG analysis fails:
- Verify Python 3 is installed: `python3 --version`
- Verify NumPy is installed: `python3 -c "import numpy; print(numpy.__version__)"`
- Test script directly: `python3 backend/analysis/eeg_process.py [file paths]`

### File Upload Issues

If file uploads fail:
- Check that `uploads/` directory exists and is writable
- Verify file sizes are under the limit (10MB)
- Ensure files are `.txt` format

## Success Criteria

The backend is working correctly when:

1. ✓ Server starts without errors
2. ✓ MongoDB connection is established
3. ✓ Spotify API authentication works
4. ✓ All API endpoints return expected responses
5. ✓ Python EEG analysis script processes data correctly
6. ✓ File uploads work and are saved to database
7. ✓ Recommendations are adjusted based on context
8. ✓ EEG data influences recommendations when available
9. ✓ Error handling returns appropriate status codes and messages

## Next Steps

After successful testing:

1. Set up production MongoDB instance
2. Configure production environment variables
3. Set up HTTPS/SSL certificates
4. Configure CORS for specific frontend domain
5. Set up process manager (PM2) for production
6. Configure logging and monitoring
7. Set up automated backups for MongoDB
8. Implement rate limiting for API endpoints
9. Add authentication/authorization if needed
10. Deploy to production server
