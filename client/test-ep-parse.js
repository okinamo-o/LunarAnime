import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('ep_test.html', 'utf16le');
const $ = cheerio.load(html);

const watchServers = [];
$('.watch-list .server, ul.servers li, .watch-servers li').each((i, el) => {
    watchServers.push($(el).text().trim());
});

const iframes = [];
$('iframe, video, source').each((i, el) => {
    iframes.push($(el).attr('src'));
});

const links = [];
$('a, li').each((i, el) => {
    const dataUrl = $(el).attr('data-ep-url') || $(el).attr('data-url') || $(el).attr('data-server');
    if (dataUrl) links.push(dataUrl);
});

console.log("Watch Servers:", watchServers);
console.log("Iframes:", iframes);
console.log("Data URLs:", links);
