import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('ep_test.html', 'utf16le');
const $ = cheerio.load(html);

const uls = [];
$('ul').each((i, el) => {
    uls.push($(el).attr('class') || $(el).attr('id'));
});
console.log("UL classes/ids:", uls);

const scripts = [];
$('script').each((i, el) => {
    const text = $(el).html();
    if (text && (text.includes('iframe') || text.includes('server') || text.includes('file'))) {
        scripts.push(text.substring(0, 100));
    }
});
console.log("Scripts containing iframe/server/file:", scripts);
