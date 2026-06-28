import { fetchTrending, fetchPopular, getDetails, resolveLauncherStream } from './api/_lib/scrapers.js';

async function test() {
    try {
        console.log("Fetching trending...");
        const trending = await fetchTrending();
        console.log("Trending count:", trending.length);
        if (trending.length > 0) {
            console.log("First trending:", trending[0]);
            
            console.log("\nFetching details for:", trending[0].id);
            const details = await getDetails(trending[0].id);
            console.log("Title:", details.title);
            console.log("Genres:", details.genres);
            console.log("Episodes:", details.seasons[0].episodes.length);
            
            if (details.seasons[0].episodes.length > 0) {
                console.log("First episode number:", details.seasons[0].episodes[0].episodeNumber);
                // We won't test resolveLauncherStream fully because it hits anime4up, which might work locally but fail on vercel
            }
        }
    } catch (e) {
        console.error("TEST FAILED:", e);
    }
}

test();
