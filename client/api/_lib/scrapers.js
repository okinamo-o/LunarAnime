const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://w1.anime4up.rest';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Referer': 'https://w1.anime4up.rest/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0'
};

// --- Parsers ---

function parseAnimeGrid(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('.anime-card-themex').each((i, el) => {
    const title = $(el).find('h3 a').text().trim() || $(el).find('.anime-card-title').text().trim();
    if (!title) return;

    let link = $(el).find('.overlay').attr('href') || $(el).find('h3 a').attr('href') || '';
    if (link.startsWith('/')) link = `${BASE_URL}${link}`;

    let img = $(el).find('img').attr('data-image') || $(el).find('img').attr('src') || '';
    img = String(img).split('?')[0].trim();
    img = img.replace(/-(\d+x\d+)\.(webp|jpg|png|jpeg)$/i, '.$2');
    if (img.startsWith('/')) img = `${BASE_URL}${img}`;
    
    const isEpisode = link.includes('/episode/');
    let slug = '';
    const match = link.match(/\/(anime|episode)\/([^\/]+)/);
    if (match) slug = match[2];

    if (!slug) return;

    let type = $(el).find('.anime-card-type').text().trim();
    if (!type) type = isEpisode ? 'Episode' : 'Anime';

    results.push({
      id: slug,
      title,
      poster: img || null,
      type: 'anime',
      releaseDate: type,
    });
  });

  return results;
}

async function fetchTrending() {
  const { data } = await axios.get(BASE_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimeGrid(data).slice(0, 15);
}

async function fetchPopular() {
  const { data } = await axios.get(BASE_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const results = parseAnimeGrid(data);
  return results.length > 15 ? results.slice(15, 30) : results;
}

async function search(query) {
  const url = `${BASE_URL}/?search_param=animes&s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimeGrid(data);
}

async function getDetails(slug) {
  const url = `${BASE_URL}/anime/${slug}`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);

  const title = $('.anime-details-title').text().trim() || $('h1').first().text().trim();
  let poster = $('.anime-thumbnail img').attr('src') || $('.img-responsive').attr('src') || '';
  poster = String(poster).split('?')[0].trim().replace(/-(\d+x\d+)\.(webp|jpg|png|jpeg)$/i, '.$2');

  const overview = $('.anime-story').text().trim() || $('.story').text().trim() || 'لا توجد قصة متاحة.';
  
  function extractEpisodes($doc) {
    const eps = [];
    $doc('a').each((i, el) => {
      const epLink = $doc(el).attr('href') || '';
      const epMatch = epLink.match(/\/episode\/([^\/]+)/);
      if (!epMatch) return;
      
      const rawSlug = epMatch[1];
      let epNum = null;
      const epText = $doc(el).text().trim();
      const numMatch = epText.match(/\b\d+\b/);
      if (numMatch && !epText.toLowerCase().includes(title.toLowerCase())) {
        epNum = parseInt(numMatch[0], 10);
      }
      
      if (!epNum) {
        const decoded = decodeURIComponent(rawSlug);
        const trailingNum = decoded.match(/-(\d+)\/?$/);
        if (trailingNum) epNum = parseInt(trailingNum[1], 10);
      }
      
      if (epNum && !eps.some(e => e.episodeNumber === epNum)) {
        eps.push({ episodeNumber: epNum, id: rawSlug, url: epLink });
      }
    });
    return eps;
  }

  let allEpisodes = extractEpisodes($);
  // (Simplified pagination for serverless to avoid timeouts - just fetch first page by default or handle carefully)
  allEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

  const genres = [];
  $('a[href*="/anime-genre/"]').each((i, el) => {
    const g = $(el).text().trim();
    if (g && !genres.includes(g)) genres.push(g);
  });

  return {
    id: slug,
    title,
    poster,
    backdrop: poster,
    overview,
    type: 'anime',
    genres,
    seasons: [{ seasonNumber: 1, episodes: allEpisodes }]
  };
}

async function discover(category, slugString, page = 1) {
    const slugs = String(slugString).split(',');
    let url = `${BASE_URL}/${category}/${slugs[0]}/`;
    if (page > 1) url += `?page=${page}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
    return parseAnimeGrid(data);
}

async function resolveLauncherStream({ id, episode }) {
  const details = await getDetails(id);
  const epData = details.seasons[0].episodes.find(e => e.episodeNumber == episode);
  if (!epData) throw new Error(`Episode not found`);

  const { data } = await axios.get(epData.url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  const iframes = [];

  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && /share4max|vkvideo|mega|dood|voe|videa|mp4upload|file-upload/.test(src)) iframes.push(src);
  });

  $('.server-list li a, a[data-ep-url]').each((i, el) => {
    const txt = $(el).html() || '';
    const iframeMatch = txt.match(/<iframe\s+[^>]*src="([^"]+)"/i);
    if (iframeMatch) iframes.push(iframeMatch[1]);
    const dataUrl = $(el).attr('data-ep-url');
    if (dataUrl && dataUrl.startsWith('http')) iframes.push(dataUrl);
  });

  const unique = [...new Set(iframes)].sort((a, b) => {
    const score = (url) => url.includes('share4max') ? 10 : url.includes('mega') ? 5 : 0;
    return score(b) - score(a);
  });

  if (!unique.length) throw new Error('No compatible servers');

  return { masterUrl: unique[0], isEmbed: true, subtitles: [] };
}

module.exports = {
  fetchTrending,
  fetchPopular,
  search,
  getDetails,
  discover,
  resolveLauncherStream
};
