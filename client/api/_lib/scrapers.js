import axios from 'axios';
import { load } from 'cheerio';

const ANIMELEK_URL = 'https://animelek.top';
const ANIME4UP_URL = 'https://anime4up.rest';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
};

// ==========================================
// ANIMELEK METADATA SCRAPING (Option A)
// ==========================================

function parseAnimelekGrid(html) {
  const $ = load(html);
  const results = [];

  $('.anime-card, .anime-card-container').each((i, el) => {
    const title = $(el).find('h3').text().trim() || $(el).find('.title').text().trim() || $(el).find('img').attr('alt');
    if (!title) return;

    let link = $(el).find('a').attr('href') || '';
    if (!link.startsWith('http')) link = `${ANIMELEK_URL}${link}`;

    let img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    
    // Extract slug from link
    let slug = '';
    const match = link.match(/\/anime\/([^/]+)/);
    if (match) slug = match[1];

    if (!slug) return;

    let type = $(el).find('.type').text().trim() || 'Anime';

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

export async function fetchTrending() {
  const { data } = await axios.get(ANIMELEK_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimelekGrid(data).slice(0, 15);
}

export async function fetchPopular() {
  const { data } = await axios.get(`${ANIMELEK_URL}/قائمة-الأنمي/`, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimelekGrid(data).slice(0, 15);
}

export async function search(query) {
  const url = `${ANIMELEK_URL}/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimelekGrid(data);
}

export async function discover(category, slugString, page = 1) {
  // Animelek uses /anime-genre/genre-name
  let url = `${ANIMELEK_URL}/anime-genre/${encodeURIComponent(slugString)}/`;
  if (page > 1) url += `page/${page}/`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return parseAnimelekGrid(data);
}

export async function getDetails(slug) {
  const url = `${ANIMELEK_URL}/anime/${slug}/`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ = load(data);

  const title = $('.anime-details h1').text().trim() || $('.title').first().text().trim() || slug;
  const poster = $('.anime-poster img').attr('src') || $('.image img').attr('src') || '';
  const overview = $('.story p').text().trim() || $('.anime-story').text().trim() || 'لا توجد قصة متاحة.';

  // Extract episodes from Animelek
  const eps = [];
  $('a[href*="/episode/"]').each((i, el) => {
    const epLink = $(el).attr('href') || '';
    const rawSlug = epLink.match(/\/episode\/([^/]+)/);
    if (!rawSlug) return;
    
    let epNum = null;
    const epText = $(el).text().trim();
    const numMatch = epText.match(/\b\d+\b/);
    if (numMatch) {
      epNum = parseInt(numMatch[0], 10);
    } else {
      const decoded = decodeURIComponent(rawSlug[1]);
      const trailingNum = decoded.match(/-(\d+)\/?$/);
      if (trailingNum) epNum = parseInt(trailingNum[1], 10);
    }

    if (epNum && !eps.some(e => e.episodeNumber === epNum)) {
      eps.push({ episodeNumber: epNum, id: rawSlug[1], url: epLink });
    }
  });

  eps.sort((a, b) => a.episodeNumber - b.episodeNumber);

  const genres = [];
  $('.anime-genres a, .genres a').each((i, el) => {
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
    seasons: [{ seasonNumber: 1, episodes: eps }]
  };
}

// ==========================================
// ANIME4UP VIDEO EXTRACTION 
// ==========================================
// Since Animelek hides iframe links in JS, we fall back to Anime4up just for the video player extraction as requested.

export async function resolveLauncherStream({ id, episode }) {
  // To get the video player from anime4up, we must construct the anime4up episode URL using the Animelek slug.
  // This is a best-effort mapping since the slugs might differ slightly between sites.
  // Example Animelek slug: "one-piece" -> Anime4up episode url: "one-piece-episode-1"
  
  const searchUrl = `${ANIME4UP_URL}/?search_param=animes&s=${encodeURIComponent(id)}`;
  const searchRes = await axios.get(searchUrl, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $search = load(searchRes.data);
  
  let anime4upLink = $search('.anime-card-themex h3 a').first().attr('href');
  
  if (!anime4upLink) {
    throw new Error('Anime not found on video server');
  }

  const { data: detailsData } = await axios.get(anime4upLink, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $details = load(detailsData);
  
  let epUrl = null;
  $details('.episodes-card-title a').each((i, el) => {
    const link = $details(el).attr('href');
    const txt = $details(el).text();
    if (txt.includes(episode.toString())) {
      epUrl = link;
    }
  });

  if (!epUrl) {
      // Fallback: try to guess the episode URL
      const a4upSlug = anime4upLink.match(/\/anime\/([^/]+)/);
      if (a4upSlug) {
          epUrl = `${ANIME4UP_URL}/episode/${a4upSlug[1]}-episode-${episode}/`;
      } else {
          throw new Error('Episode not found on video server');
      }
  }

  const { data: epData } = await axios.get(epUrl, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ep = load(epData);
  const iframes = [];

  $ep('iframe').each((i, el) => {
    const src = $ep(el).attr('src');
    if (src && /share4max|vkvideo|mega|dood|voe|videa|mp4upload|file-upload/.test(src)) iframes.push(src);
  });

  $ep('.server-list li a, a[data-ep-url]').each((i, el) => {
    const txt = $ep(el).html() || '';
    const iframeMatch = txt.match(/<iframe\s+[^>]*src="([^"]+)"/i);
    if (iframeMatch) iframes.push(iframeMatch[1]);
    const dataUrl = $ep(el).attr('data-ep-url');
    if (dataUrl && dataUrl.startsWith('http')) iframes.push(dataUrl);
  });

  const unique = [...new Set(iframes)].sort((a, b) => {
    const score = (url) => url.includes('share4max') ? 10 : url.includes('mega') ? 5 : 0;
    return score(b) - score(a);
  });

  if (!unique.length) throw new Error('No compatible servers');

  return { masterUrl: unique[0], isEmbed: true, subtitles: [] };
}
