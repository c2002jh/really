const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const spotifyService = require('./services/spotifyService');

async function testAlbumCovers() {
    console.log('Testing Album Cover Fetching...');
    const genres = ['pop', 'k-pop', 'rock', 'jazz', 'classical'];
    
    for (const genre of genres) {
        try {
            console.log(`Fetching cover for ${genre}...`);
            const url = await spotifyService.getGenreAlbumCover(genre);
            console.log(`Result for ${genre}: ${url ? 'URL Found' : 'No URL'}`);
            if (url) console.log(`   -> ${url}`);
        } catch (error) {
            console.error(`Failed for ${genre}:`, error.message);
        }
    }
}

testAlbumCovers();
