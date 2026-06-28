import axios from 'axios';
import { load } from 'cheerio';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0'
};

async function test() {
    const { data } = await axios.get('https://w1.anime4up.rest', { headers: DEFAULT_HEADERS });
    const $ = load(data);
    const results = [];
    $('.anime-card-themex').each((i, el) => {
        results.push($(el).find('h3 a').text().trim());
    });
    console.log("w1.anime4up.rest Found:", results.length);
}
test().catch(console.error);
