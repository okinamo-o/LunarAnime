const axios = require('axios');
const cheerio = require('cheerio');
const anime4upScraper = require('./anime4upScraper');

async function resolveLauncherStream({ type, id, season, episode }) {
  try {
    const slug = id;
    console.log(`[Launcher] Resolving Arabic TV Anime: ${slug} (Ep ${episode})`);

    // 1. Fetch Anime Details to locate the specific Episode URL
    const details = await anime4upScraper.getDetails(slug);
    if (!details || !details.seasons || !details.seasons[0]) {
      throw new Error(`Could not locate details for anime: ${slug}`);
    }

    const epData = details.seasons[0].episodes.find(e => e.episodeNumber == episode);
    if (!epData) {
      throw new Error(`Could not find episode ${episode} for ${slug}`);
    }

    const targetUrl = epData.url;
    console.log(`[Launcher] Fetching Anime4up Episode Details: ${targetUrl}`);

    // 2. Extract Iframes / Servers from Anime4Up Episode HTML
    const { data } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const $ = cheerio.load(data);
    const iframes = [];

    // Collect hardcoded iframes on the page first (usually the default player)
    $('iframe').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('share4max') || src.includes('vkvideo') || src.includes('mega') || src.includes('dood') || src.includes('voe') || src.includes('videa') || src.includes('mp4upload') || src.includes('file-upload'))) {
           iframes.push(src);
        }
    });

    // Also look for server buttons that might contain iframe markup within their text/html
    $('.server-list li a, ul.episodes-links li a, a[data-ep-url], .host-list li a, .servers li a, ul#episode-servers li a, .nav-tabs li a').each((i, el) => {
      const txt = $(el).html() || $(el).text().trim();
      const iframeMatch = txt && txt.match(/<iframe\s+[^>]*src="([^"]+)"/i);
      
      if (iframeMatch && iframeMatch[1]) {
          iframes.push(iframeMatch[1]);
      } else {
         const directDataUrl = $(el).attr('data-ep-url');
         if (directDataUrl && directDataUrl.startsWith('http')) {
            iframes.push(directDataUrl);
         }
      }
    });

    // Clean duplicates and sort by priority (share4max tends to be the fastest/best)
    const uniqueIframes = [...new Set(iframes)];
    
    uniqueIframes.sort((a, b) => {
       const w1 = a.includes('share4max') ? 10 : a.includes('mega') ? 5 : a.includes('mp4upload') ? 4 : 0;
       const w2 = b.includes('share4max') ? 10 : b.includes('mega') ? 5 : b.includes('mp4upload') ? 4 : 0;
       return w2 - w1;
    });

    if (uniqueIframes.length === 0) {
       throw new Error('No compatible embedded streaming servers found on this Anime4up episode.');
    }

    console.log('[Launcher] Extracted CDN Embed:', uniqueIframes[0]);

    // 3. Return to the Frontend!
    // Since anime4up uses hard-subbed streams, we don't need external subtitle loading.
    // The Watch.jsx proxy directly understands `isEmbed: true`.
    return {
       masterUrl: uniqueIframes[0],
       isEmbed: true,
       subtitles: []
    };

  } catch (error) {
    console.error('[Launcher] Error resolving stream:', error.message);
    throw error;
  }
}

async function getSubtitleAsVtt() {
   // Deprecated: Anime4up relies strictly on hard sub or standard embedded players.
   return '';
}

module.exports = {
  resolveLauncherStream,
  getSubtitleAsVtt
};
