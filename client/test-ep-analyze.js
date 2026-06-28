import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('ep.html', 'utf16le');
const $ = cheerio.load(html);

const scripts = [];
$('script').each((i, el) => {
    scripts.push($(el).html());
});

let foundUrl = null;
for (const script of scripts) {
    if (!script) continue;
    
    // Check for base64 encoded iframes
    const base64Matches = script.match(/atob\(['"]([^'"]+)['"]\)/g);
    if (base64Matches) {
        console.log("Found atob:", base64Matches);
        for (const match of base64Matches) {
            const b64 = match.match(/atob\(['"]([^'"]+)['"]\)/)[1];
            console.log("Decoded:", Buffer.from(b64, 'base64').toString('utf-8'));
        }
    }
    
    // Check for direct server URLs
    if (script.includes('http') && (script.includes('embed') || script.includes('player') || script.includes('video'))) {
        console.log("Suspicious script snippet:", script.substring(0, 200));
    }
    
    // Check for URL encoded iframes
    const urlDecoded = unescape(script);
    if (urlDecoded.includes('<iframe')) {
        console.log("Found URL encoded iframe:", urlDecoded.substring(urlDecoded.indexOf('<iframe'), urlDecoded.indexOf('<iframe') + 100));
    }
}

// Find any links with 'data-url' or 'data-server' or 'data-ep-url'
$('*').each((i, el) => {
    const dataUrl = $(el).attr('data-url') || $(el).attr('data-ep-url') || $(el).attr('data-src');
    if (dataUrl && dataUrl.includes('http')) {
        console.log("Found data-url:", dataUrl);
    }
});
