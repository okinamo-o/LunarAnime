import axios from 'axios';
import { load } from 'cheerio';

async function proxyGet(url, options = {}) {
  try {
    return await axios.get(url, options);
  } catch (err) {
    if (err.response && [403, 503].includes(err.response.status)) {
      console.warn(`[Proxy Fallback] 403/503 on ${url}, using allorigins...`);
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      return await axios.get(proxyUrl, options);
    }
    throw err;
  }
}

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

const detailsCache = new Map();
let _homeCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function parseAnimeGrid(html) {
  const $ = load(html);
  const results = [];

  $('.anime-card-themex').each((i, el) => {
    const title = $(el).find('h3 a').text().trim() || $(el).find('.anime-card-title').text().trim();
    if (!title) return;

    let link = $(el).find('.overlay').attr('href') || $(el).find('h3 a').attr('href') || '';
    if (link.startsWith('/')) {
      link = `${BASE_URL}${link}`;
    }

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

async function _fetchHomePage() {
  const now = Date.now();
  if (_homeCache.data && (now - _homeCache.timestamp) < CACHE_TTL) {
    return _homeCache.data;
  }
  const { data } = await proxyGet(BASE_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const results = parseAnimeGrid(data);
  _homeCache = { data: results, timestamp: now };
  return results;
}

export async function fetchTrending() {
  try {
    const results = await _fetchHomePage();
    return results.slice(0, 15);
  } catch (err) {
    console.error('Trending Error:', err.message);
    throw err;
  }
}

export async function fetchPopular() {
  try {
    const results = await _fetchHomePage();
    if (results.length > 15) return results.slice(15, 30);
    return results;
  } catch (err) {
    console.error('Popular Error:', err.message);
    throw err;
  }
}

export async function fetchLatestEpisodes() {
  try {
    const results = await _fetchHomePage();
    // Return items that are episodes, or just the first few if all are mixed
    const eps = results.filter(r => r.releaseDate === 'Episode');
    return eps.length > 0 ? eps.slice(0, 15) : results.slice(0, 15);
  } catch (err) {
    console.error('Latest Episodes Error:', err.message);
    throw err;
  }
}

export async function search(query) {
  try {
    const url = `${BASE_URL}/?search_param=animes&s=${encodeURIComponent(query)}`;
    const { data } = await proxyGet(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
    return parseAnimeGrid(data);
  } catch (err) {
    console.error('Search Error:', err.message);
    throw err;
  }
}

export async function discover(category, slugString, page = 1) {
  try {
    const slugs = String(slugString).split(',');
    let url = `${BASE_URL}/${category}/${slugs[0]}/`;
    if (page > 1) url += `?page=${page}`;
    const { data } = await proxyGet(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
    return parseAnimeGrid(data);
  } catch (err) {
    console.error('Discover Error:', err.message);
    throw err;
  }
}

export async function getDetails(slug) {
  if (detailsCache.has(slug)) {
    const cached = detailsCache.get(slug);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }

  try {
    const url = `${BASE_URL}/anime/${slug}`;
    const { data } = await proxyGet(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
    const $ = load(data);

    const title = $('.anime-details-title').text().trim() || $('h1').first().text().trim();
    let poster = $('.anime-thumbnail img').attr('src') || $('.img-responsive').attr('src') || '';
    poster = String(poster).split('?')[0].trim().replace(/-(\d+x\d+)\.(webp|jpg|png|jpeg)$/i, '.$2');

    const overview = $('.anime-story').text().trim() || $('.story').text().trim() || 'لا توجد قصة متاحة.';
    
    const eps = [];
    $('a').each((i, el) => {
      const epLink = $(el).attr('href') || '';
      const epMatch = epLink.match(/\/episode\/([^\/]+)/);
      if (!epMatch) return;
      
      const rawSlug = epMatch[1];
      let epNum = null;
      
      const epText = $(el).text().trim();
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

    eps.sort((a, b) => a.episodeNumber - b.episodeNumber);

    const genres = [];
    $('a[href*="/anime-genre/"]').each((i, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    const result = {
      id: slug, title, poster, backdrop: poster, overview, type: 'anime', genres,
      seasons: [{ seasonNumber: 1, episodes: eps }]
    };
    detailsCache.set(slug, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('Details Error:', err.message);
    throw new Error('Failed to scrape anime details.');
  }
}

export async function resolveLauncherStream({ id, episode }) {
  // `episode` is the slug we provided in getDetails.
  let url = `${BASE_URL}/episode/${episode}/`;
  if (!episode || typeof episode === 'number') {
    url = `${BASE_URL}/episode/${id}-%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9-${episode}/`;
  }

  const { data } = await proxyGet(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ = load(data);
  const iframes = [];

  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && /share4max|vkvideo|mega|dood|voe|videa|mp4upload|file-upload/.test(src)) {
      iframes.push(src);
    }
  });

  $('ul.ep-servers li').each((i, el) => {
    const b64 = $(el).attr('data-ep-url');
    if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('ascii');
        iframes.push(decoded);
      } catch (e) {}
    }
  });

  const unique = [...new Set(iframes)].sort((a, b) => {
    const score = (u) => u.includes('share4max') ? 10 : u.includes('mega') ? 5 : 0;
    return score(b) - score(a);
  });

  if (!unique.length) throw new Error('No compatible servers');

  // Format into a structured server list
  const servers = unique.map((url, i) => {
    let name = 'Server ' + (i + 1);
    if (url.includes('share4max')) name = 'Share4Max';
    else if (url.includes('mega')) name = 'Mega';
    else if (url.includes('dood')) name = 'DoodStream';
    else if (url.includes('videa')) name = 'Videa';
    else if (url.includes('voe')) name = 'Voe';
    
    return { name, url, quality: 'Auto' };
  });

  return { masterUrl: servers[0].url, isEmbed: true, servers, subtitles: [] };
}
