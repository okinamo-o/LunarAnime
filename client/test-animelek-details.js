import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
    const { data } = await axios.get('https://animelek.top/anime/one-piece/');
    const $ = cheerio.load(data);
    
    let firstEpLink = null;
    $('a[href*="/episode/"]').each((i, el) => {
        if (!firstEpLink) firstEpLink = $(el).attr('href');
    });
    
    console.log("First Ep Link:", firstEpLink);
    
    const { data: epData } = await axios.get(firstEpLink);
    const $ep = cheerio.load(epData);
    
    // Dump iframe sources
    const iframes = [];
    $ep('iframe, video').each((i, el) => {
        iframes.push($ep(el).attr('src'));
    });
    console.log("Iframes on actual ep:", iframes);
    
    const watchUl = $ep('ul#servers-list, ul.watch-list, .watch-servers');
    console.log("Watch UL classes:", watchUl.attr('class'));
    
    const serverLinks = [];
    $ep('a[data-server], a[data-url], li[data-server]').each((i, el) => {
        serverLinks.push($ep(el).attr('data-server') || $ep(el).attr('data-url'));
    });
    console.log("Server links:", serverLinks);
}

test().catch(console.error);
