import { discover } from './api/_lib/scrapers.js';

async function test() {
    try {
        const results = await discover('anime-genre', 'أكشن');
        console.log("Discover results:", results.length);
    } catch (e) {
        console.error("Discover error:", e.message);
    }
}
test();
