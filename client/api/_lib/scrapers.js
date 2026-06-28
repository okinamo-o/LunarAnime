import axios from 'axios';
import { load } from 'cheerio';

const ANIMELEK_URL = 'https://animelek.top';
const ANIME4UP_URL = 'https://w1.anime4up.rest';

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

async function formatItemsAndFillPosters(items) {
  for (let item of items) {
    // Clean messy titles from Animelek (e.g. "انمي One Piece مترجم" -> "One Piece")
    item.title = item.title.replace(/مشاهدة|انمي|مترجمة|مترجم|اون\s*لاين/g, '').replace(/الحلقة\s*\d+/g, '').trim();

    // Fetch missing posters from Jikan API
    if (!item.poster || item.poster.includes('default.png') || item.poster.includes('default.jpg')) {
      try {
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(item.title)}&limit=1`, { timeout: 2000 });
        if (data && data.data && data.data.length > 0) {
          item.poster = data.data[0].images.jpg.large_image_url;
        }
        await new Promise(r => setTimeout(r, 350)); // Respect Jikan rate limits
      } catch (e) {}
    }
  }
  return items;
}

export async function fetchTrending() {
  const { data } = await axios.get(ANIMELEK_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return await formatItemsAndFillPosters(parseAnimelekGrid(data).slice(0, 15));
}

export async function fetchPopular() {
  const { data } = await axios.get(`${ANIMELEK_URL}/قائمة-الأنمي/`, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return await formatItemsAndFillPosters(parseAnimelekGrid(data).slice(0, 15));
}

export async function fetchLatestEpisodes() {
  const { data } = await axios.get(ANIMELEK_URL, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const results = parseAnimelekGrid(data);
  return await formatItemsAndFillPosters(results.length > 15 ? results.slice(15, 30) : results);
}

export async function search(query) {
  const url = `${ANIMELEK_URL}/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return await formatItemsAndFillPosters(parseAnimelekGrid(data));
}

export async function discover(category, slugString, page = 1) {
  // Animelek uses /anime-genre/genre-name
  let url = `${ANIMELEK_URL}/anime-genre/${encodeURIComponent(slugString)}/`;
  if (page > 1) url += `page/${page}/`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  return await formatItemsAndFillPosters(parseAnimelekGrid(data));
}

export async function getDetails(slug) {
  const url = `${ANIMELEK_URL}/anime/${slug}/`;
  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
  const $ = load(data);

  const rawTitle = $('h1').first().text().trim() || slug;
  const title = rawTitle.replace(/مشاهدة|انمي|مترجمة|مترجم|اون\s*لاين/g, '').replace(/الحلقة\s*\d+/g, '').trim();
  let poster = $('.anime-poster img').attr('src') || $('.image img').attr('src') || '';
  
  if (!poster || poster.includes('default.png') || poster.includes('default.jpg')) {
    try {
      const { data: jikanData } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`, { timeout: 2000 });
      if (jikanData && jikanData.data && jikanData.data.length > 0) {
        poster = jikanData.data[0].images.jpg.large_image_url;
      }
    } catch (e) {}
  }
  const overview = $('.story p').text().trim() || $('.anime-story').text().trim() || $('.anime-details .content p, .media-box .content p').first().text().trim() || 'لا توجد قصة متاحة.';

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
  // First, get the Animelek episode URL by parsing the details page
  const details = await getDetails(id);
  const epObj = details.seasons[0].episodes.find(e => e.episodeNumber == episode || e.id == episode || decodeURIComponent(e.id) == decodeURIComponent(episode));
  
  if (!epObj) {
    throw new Error('Episode not found on video server');
  }
  
  const epUrl = epObj.url;
  const { data } = await axios.get(epUrl, { headers: DEFAULT_HEADERS, timeout: 10000 });
  
  const iframes = [];
  
  // Animelek embeds video players using card.php?random=URL
  const regex = /https?:\/\/[^\s"'<>]+\/card\.php\?random=(https?:\/\/[^\s"'<>&]+)/ig;
  let match;
  while ((match = regex.exec(data)) !== null) {
    iframes.push(decodeURIComponent(match[1]));
  }
  
  // Fallback: look for direct iframes in the HTML
  const $ep = load(data);
  $ep('iframe').each((i, el) => {
    const src = $ep(el).attr('src');
    if (src && /share4max|vkvideo|mega|dood|voe|videa|mp4upload|file-upload/.test(src)) {
      iframes.push(src);
    }
  });

  const unique = [...new Set(iframes)].sort((a, b) => {
    const score = (url) => url.includes('share4max') ? 10 : url.includes('mega') ? 5 : 0;
    return score(b) - score(a);
  });

  if (!unique.length) throw new Error('No compatible servers');

  return { masterUrl: unique[0], isEmbed: true, subtitles: [] };
}
