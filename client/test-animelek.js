import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
    const { data } = await axios.get('https://animelek.top/');
    const $ = cheerio.load(data);
    
    const items = [];
    $('.anime-list-content .col-6, .anime-list .col-6, .col-6').each((i, el) => {
        const title = $(el).find('img').attr('alt') || $(el).find('a').attr('title');
        const link = $(el).find('a').attr('href');
        if (title && link) {
            items.push({ title, link });
        }
    });

    console.log(JSON.stringify(items.slice(0, 5), null, 2));
}

test();
