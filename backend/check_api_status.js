const axios = require('axios');

const clientId = '3b162e0cf8054fb1b3610ccb7b9c4db8';
const clientSecret = 'b928b993d8c340c79b2a79eafb3ef133';

async function checkSpotifyAPI() {
    console.log('=== Spotify API Status Check ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('--------------------------------');

    let token = null;

    // 1. Authentication
    try {
        process.stdout.write('1. Authentication (Client Credentials)... ');
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        token = response.data.access_token;
        console.log('✅ OK');
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
        if (error.response) console.error('   Details:', error.response.data);
        return; // Cannot proceed without token
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. Check Search API (Tracks)
    try {
        process.stdout.write('2. Search API (Tracks)... ');
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers,
            params: { q: 'genre:pop', type: 'track', limit: 1 }
        });
        if (response.status === 200 && response.data.tracks) {
            console.log('✅ OK');
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
        if (error.response) console.error('   Status:', error.response.status);
    }

    // 3. Check Recommendations API
    try {
        process.stdout.write('3. Recommendations API... ');
        // Need a valid seed. Let's use a common artist ID (e.g., BTS or generic) or genre
        // Using seed_genres=pop
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers,
            params: { seed_genres: 'pop', limit: 1 }
        });
        console.log('✅ OK');
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            if (error.response.status === 404) {
                console.log('   ⚠️  NOTE: 404 on recommendations usually means the endpoint is not available for this client or region, or parameters are invalid.');
            }
        }
    }

    // 4. Check Available Genre Seeds
    try {
        process.stdout.write('4. Genre Seeds API... ');
        const response = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
            headers
        });
        console.log('✅ OK');
        console.log(`   Found ${response.data.genres.length} genres.`);
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
        if (error.response) console.error('   Status:', error.response.status);
    }

    // 5. Check New Releases
    try {
        process.stdout.write('5. New Releases API... ');
        const response = await axios.get('https://api.spotify.com/v1/browse/new-releases', {
            headers,
            params: { limit: 1 }
        });
        console.log('✅ OK');
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
        if (error.response) console.error('   Status:', error.response.status);
    }

    // 6. Check Album Cover Fetching (Custom Logic)
    try {
        process.stdout.write('6. Album Cover Fetching (Pop)... ');
        // Simulate the logic in spotifyService.js
        const offset = Math.random() < 0.5 ? 0 : 50;
        const params = new URLSearchParams({
            q: 'genre:pop',
            type: 'track',
            limit: '50',
            offset: offset.toString()
        });
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers,
            params
        });
        
        const tracks = response.data.tracks.items;
        if (tracks && tracks.length > 0) {
            const validTracks = tracks.filter(t => 
                t.album && 
                t.album.images && 
                t.album.images.length > 0 && 
                (t.album.album_type === 'album' || t.album.album_type === 'single') &&
                t.album.artists[0].name !== 'Various Artists' &&
                !t.album.name.toLowerCase().includes('best of') &&
                !t.album.name.toLowerCase().includes('greatest hits') &&
                !t.album.name.toLowerCase().includes('playlist')
            );
            
            if (validTracks.length > 0) {
                console.log('✅ OK');
                console.log(`   Found ${validTracks.length} valid album covers out of ${tracks.length} tracks (Offset: ${offset}).`);
                console.log(`   Sample Album: "${validTracks[0].album.name}" by ${validTracks[0].album.artists[0].name}`);
                console.log(`   Sample Image: ${validTracks[0].album.images[0].url}`);
            } else {
                console.log('⚠️  WARNING: No valid albums found after filtering (strict mode).');
            }
        } else {
            console.log('❌ FAILED: No tracks found.');
        }
    } catch (error) {
        console.log('❌ FAILED');
        console.error('   Error:', error.message);
    }

    console.log('--------------------------------');
    console.log('Summary:');
    console.log('If Recommendations API fails (404), the app is using a fallback mechanism (Search API) to ensure functionality.');
}

checkSpotifyAPI();
