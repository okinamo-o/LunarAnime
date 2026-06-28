import * as fs from 'fs';
const html = fs.readFileSync('ep.html', 'utf16le');

// Try finding any server links
const serverMatches = html.match(/data-ep-url=["'](.*?)["']/gi);
console.log("data-ep-url:", serverMatches);

const serverLinks = html.match(/href=["'](.*?)["'][^>]*>([^<]*(سيرفر|server)[^<]*)<\/a>/gi);
console.log("server hrefs:", serverLinks);

// Try finding iframes
const iframeMatches = html.match(/<iframe[^>]+src=["'](.*?)["']/gi);
console.log("iframes:", iframeMatches);

// Find base64 that might decode to iframe
const b64 = html.match(/[A-Za-z0-9+/=]{40,}/g);
if (b64) {
    for (const b of b64) {
        try {
            const dec = Buffer.from(b, 'base64').toString('utf8');
            if (dec.includes('<iframe')) {
                console.log("Found b64 iframe:", dec);
            }
        } catch (e) {}
    }
}
