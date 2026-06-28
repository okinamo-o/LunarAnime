import { fetchTrending } from './api/_lib/scrapers.js';

fetchTrending().then(data => {
    console.log("SUCCESS:", data.length);
}).catch(err => {
    console.error("ERROR:", err.message);
});
