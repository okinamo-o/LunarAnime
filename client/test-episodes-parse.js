import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('latest_episodes.html', 'utf16le');
const $ = cheerio.load(html);

const items = [];
// find episodes
$('.episodes-card, .episode-card, .episodes-card-container, article').each((i, el) => {
    items.push({
        title: $(el).find('h3, .title').text().trim(),
        link: $(el).find('a').attr('href')
    });
});

console.log("Found items:", items.length);
if (items.length > 0) {
    console.log(items.slice(0, 3));
} else {
    // just dump some classes of `div > a > img`
    const c = new Set();
    $('a img').each((i, el) => {
        c.add($(el).parent().parent().attr('class'));
    });
    console.log("classes:", [...c]);
}
