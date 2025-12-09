const axios = require('axios');

const clientId = '3b162e0cf8054fb1b3610ccb7b9c4db8';
const clientSecret = 'b928b993d8c340c79b2a79eafb3ef133';

async function testSpotify() {
    try {
        // 1. Get Token
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        console.log('Getting token...');
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        const token = tokenResponse.data.access_token;
        console.log('Token obtained successfully:', token);

        // 2. Get Artist (Test)
        console.log('Fetching artist...');
        try {
            const artistResponse = await axios.get(
                'https://api.spotify.com/v1/artists/0TnOYISbd1XYRBk9myaseg',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            console.log('Artist fetched successfully:', artistResponse.data.name);
        } catch (e) {
            console.error('Failed to fetch artist:', e.message);
            if (e.response) console.error('Artist Response status:', e.response.status);
        }

        // 3. Search by Genre (Fallback)
        console.log('Testing Search by Genre...');
        try {
            const searchResponse = await axios.get(
                'https://api.spotify.com/v1/search',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    params: {
                        q: 'genre:pop',
                        type: 'track',
                        limit: 10
                    }
                }
            );
            console.log('Search by genre successful:', searchResponse.data.tracks.items.length);
        } catch (e) {
            console.error('Failed to search by genre:', e.message);
            if (e.response) console.error('Search Response status:', e.response.status);
        }

        // 4. Get Genres
        console.log('Fetching genres...');
        const response = await axios.get(
            'https://api.spotify.com/v1/recommendations/available-genre-seeds',
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );
        console.log('Genres fetched successfully:', response.data.genres.length);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testSpotify();
