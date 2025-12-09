const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function testKpop() {
    console.log('Testing K-Pop Search Results...');
    
    // Get Token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
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

    // Test 1: Search by genre:"k-pop" (quoted)
    console.log('\n--- Test 1: Search by genre:"k-pop" ---');
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: 'genre:"k-pop"',
                type: 'track',
                limit: 10
            }
        });
        
        const tracks = response.data.tracks.items;
        console.log(`Found ${tracks.length} tracks.`);
        tracks.forEach((t, i) => {
            console.log(`${i+1}. [${t.album.album_type}] ${t.name} - ${t.artists.map(a => a.name).join(', ')}`);
        });
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Test 2: Search by genre:"korean pop"
    console.log('\n--- Test 2: Search by genre:"korean pop" ---');
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: 'genre:"korean pop"',
                type: 'track',
                limit: 10
            }
        });
        
        const tracks = response.data.tracks.items;
        console.log(`Found ${tracks.length} tracks.`);
        tracks.forEach((t, i) => {
            console.log(`${i+1}. [${t.album.album_type}] ${t.name} - ${t.artists.map(a => a.name).join(', ')}`);
        });
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Test 5: Search by keyword "k-pop" AND genre:"k-pop"
    console.log('\n--- Test 5: Search by k-pop genre:k-pop ---');
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: 'k-pop genre:k-pop',
                type: 'track',
                limit: 10
            }
        });
        
        const tracks = response.data.tracks.items;
        console.log(`Found ${tracks.length} tracks.`);
        tracks.forEach((t, i) => {
            console.log(`${i+1}. [${t.album.album_type}] ${t.name} - ${t.artists.map(a => a.name).join(', ')}`);
        });
    } catch (e) {
        console.log('Error:', e.message);
    }
}

testKpop();
