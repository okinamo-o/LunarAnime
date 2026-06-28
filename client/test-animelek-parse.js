import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('animelek_top.html', 'utf16le');
const $ = cheerio.load(html);

const items = [];
// Looking for anime cards. Animelek usually uses classes like .anime-card, .anime-box, .episodes-card
$('.anime-card-container, .anime-card, .item, article').each((i, el) => {
    const title = $(el).find('h3, .title, .name').text().trim() || $(el).find('a').attr('title');
    const link = $(el).find('a').attr('href');
    const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
    if (title && link) {
        items.push({ title, link, img, class: $(el).attr('class') });
    }
});

console.log(JSON.stringify(items.slice(0, 5), null, 2));

if (items.length === 0) {
    // Dump all classes of divs that contain an <img> inside an <a>
    const classes = new Set();
    $('a img').each((i, el) => {
        classes.add($(el).parent().parent().attr('class'));
    });
    console.log("Found no items. Parent classes of a > img:", [...classes]);
}
