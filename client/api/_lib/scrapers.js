import axios from 'axios';
import { load } from 'cheerio';

const BASE_URL = 'https://shahiid-anime.net';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Referer': `${BASE_URL}/`,
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const detailsCache = new Map();
let _homeCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ==========================================
// CARD PARSER (.one-poster grid items)
// ==========================================
function parseCardGrid(html, filterType = null) {
  const $ = load(html);
  const results = [];
  const seen = new Set();

  $('.one-poster').each((i, el) => {
    const linkEl = $(el).find('a').first();
    const link = linkEl.attr('href') || '';
    const title = $(el).find('h2 a, h3 a').first().text().trim();
    if (!title || !link) return;

    // Extract image
    let img = $(el).find('img.wp-post-image').attr('src') || $(el).find('img').first().attr('src') || '';
    // Remove resize params to get full image
    img = img.replace(/\?resize=\d+%2C\d+&ssl=1/, '?ssl=1');

    // Type badge (TV, Movie, OVA, etc.)
    const type = $(el).find('.poster-type').text().trim() || '';
    // Rating
    const ratingText = $(el).find('.rated-poster').text().trim().replace(/[^\d.]/g, '');
    const rating = ratingText ? parseFloat(ratingText) : null;

    // Extract slug from URL
    // URLs: /series/slug/, /seasons/slug/, /episodes/slug/, /anime/slug/
    const urlMatch = link.match(/\/(series|seasons|episodes|anime|seriesDubbed|seasonsDubbed)\/([^/]+)\/?$/);
    if (!urlMatch) return;

    const category = urlMatch[1]; // series, seasons, episodes, anime
    const slug = urlMatch[2];

    // Filter by type if specified
    if (filterType === 'episodes' && category !== 'episodes') return;
    if (filterType === 'series' && !['series', 'seriesDubbed'].includes(category)) return;

    // Deduplicate by slug
    if (seen.has(slug)) return;
    seen.add(slug);

    // Determine the ID to use for our app (always the slug)
    results.push({
      id: slug,
      title: title.replace(/\s*مترجم\w*\s*/g, '').replace(/\s*مدبلج\w*\s*/g, '').trim() || title,
      poster: img || null,
      type: 'anime',
      releaseDate: type || (category === 'episodes' ? 'Episode' : 'Anime'),
      rating,
      _category: category, // internal: used to distinguish series/season/episode
      _url: link,
    });
  });

  return results;
}

// ==========================================
// HOME PAGE SECTIONS
// ==========================================
async function _fetchHomePage() {
  const now = Date.now();
  if (_homeCache.data && (now - _homeCache.timestamp) < CACHE_TTL) {
    return _homeCache.data;
  }
  const { data } = await axios.get(BASE_URL, { headers: DEFAULT_HEADERS, timeout: 15000 });
  const results = parseCardGrid(data);
  _homeCache = { data: results, timestamp: now };
  return results;
}

// ==========================================
// PUBLIC API: fetchTrending
// ==========================================
export async function fetchTrending() {
  try {
    const results = await _fetchHomePage();
    // Return the first batch of items (latest episodes section)
    return results.slice(0, 15);
  } catch (err) {
    console.error('Trending Error:', err.message);
    throw err;
  }
}

// ==========================================
// PUBLIC API: fetchPopular
// ==========================================
export async function fetchPopular() {
  try {
    const results = await _fetchHomePage();
    // Return a different slice (anime/series items after the first batch)
    if (results.length > 15) return results.slice(15, 30);
    return results;
  } catch (err) {
    console.error('Popular Error:', err.message);
    throw err;
  }
}

// ==========================================
// PUBLIC API: fetchLatestEpisodes
// ==========================================
export async function fetchLatestEpisodes() {
  try {
    const results = await _fetchHomePage();
    // Filter for episode-type items
    const eps = results.filter(r => r._category === 'episodes');
    return eps.length > 0 ? eps.slice(0, 15) : results.slice(0, 15);
  } catch (err) {
    console.error('Latest Episodes Error:', err.message);
    throw err;
  }
}

// ==========================================
// PUBLIC API: search
// ==========================================
export async function search(query) {
  try {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    return parseCardGrid(data);
  } catch (err) {
    console.error('Search Error:', err.message);
    throw err;
  }
}

// ==========================================
// PUBLIC API: discover
// ==========================================
export async function discover(category, slugString, page = 1) {
  try {
    let url = `${BASE_URL}/genre/${slugString}/`;
    if (page > 1) url += `page/${page}/`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
    return parseCardGrid(data);
  } catch (err) {
    console.error('Discover Error:', err.message);
    throw err;
  }
}

// ==========================================
// PUBLIC API: getDetails
// ==========================================
export async function getDetails(slug) {
  if (detailsCache.has(slug)) {
    const cached = detailsCache.get(slug);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }

  try {
    // Try /series/ first (main anime page), then /seasons/ (individual season), then /anime/ (movie)
    let data, detailUrl;
    let isEpisodePage = false;
    for (const prefix of ['series', 'seasons', 'anime', 'seriesDubbed', 'seasonsDubbed', 'episodes']) {
      try {
        detailUrl = `${BASE_URL}/${prefix}/${slug}/`;
        const resp = await axios.get(detailUrl, { headers: DEFAULT_HEADERS, timeout: 15000 });
        data = resp.data;
        if (prefix === 'episodes') {
          isEpisodePage = true;
        }
        break;
      } catch (e) {
        if (e.response?.status !== 404) throw e;
      }
    }
    if (!data) {
      // Slug didn't match any direct URL — fall back to searching shahiid
      // Convert slug to search keywords: "re-zero-kara-hajimeru" → "re zero kara hajimeru"
      const searchTerms = decodeURIComponent(slug)
        .replace(/-/g, ' ')
        .replace(/%[0-9a-f]{2}/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w.length > 2) // drop tiny words
        .slice(0, 4) // limit to 4 words for better results
        .join(' ');
      
      if (searchTerms.length > 3) {
        try {
          const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(searchTerms)}`;
          const { data: searchHtml } = await axios.get(searchUrl, { headers: DEFAULT_HEADERS, timeout: 15000 });
          const searchResults = parseCardGrid(searchHtml);
          // Prefer: series > seasons > anime (subtitled) > dubbed versions
          const bestResult = searchResults.find(r => r._category === 'series') ||
                             searchResults.find(r => r._category === 'seasons') ||
                             searchResults.find(r => r._category === 'anime') ||
                             searchResults.find(r => ['seriesDubbed', 'seasonsDubbed'].includes(r._category)) ||
                             searchResults[0];
          
          if (bestResult && bestResult.id !== slug) {
            // Recurse with the correct slug from search results
            return getDetails(bestResult.id);
          }
        } catch (searchErr) {
          console.error('Search fallback failed:', searchErr.message);
        }
      }
      throw new Error('Anime not found');
    }

    if (isEpisodePage) {
      const $ep = load(data);
      // Collect ALL candidate parent links, then pick the first with a valid slug
      const candidateLinks = [];
      $ep('a').each((i, el) => {
        const href = $ep(el).attr('href') || '';
        // Must contain a category path segment and NOT be a bare category listing
        const match = href.match(/\/(series|seasons|anime|seriesDubbed|seasonsDubbed)\/([^/]+)\/?$/);
        if (match && match[2] && !href.includes('series_years') && !href.includes('myanimelist')) {
          candidateLinks.push({ href, category: match[1], slug: match[2] });
        }
      });
      
      if (candidateLinks.length > 0) {
        // Prefer /seasons/ links (direct parent), then /series/
        const preferred = candidateLinks.find(c => c.category === 'seasons') ||
                          candidateLinks.find(c => c.category === 'series') ||
                          candidateLinks[0];
        const parentDetails = await getDetails(preferred.slug);
        const epNumMatch = slug.match(/ep-?(\d+)/i) || slug.match(/%d8%a7%d9%84%d8%ad%d9%84%d9%82%d8%a9-?(\d+)/i);
        if (epNumMatch) {
          parentDetails.requestedEpisode = parseInt(epNumMatch[1], 10);
        }
        return parentDetails;
      }
      throw new Error('Anime not found');
    }

    const $ = load(data);

    // Title
    const title = $('h1').first().text().trim().replace(/\s*مترجم\w*\s*/g, '').replace(/\s*مدبلج\w*\s*/g, '').trim();

    // Poster - get the anime's own poster (not the first card poster)
    // The series page has its own poster in a specific structure
    let poster = '';
    $('img.wp-post-image').each((i, el) => {
      const alt = $(el).attr('alt') || '';
      const src = $(el).attr('src') || '';
      if (alt.toLowerCase().includes(slug.split('-')[0]) || i === 1) {
        poster = src.replace(/\?resize=\d+%2C\d+&ssl=1/, '?ssl=1');
      }
    });
    if (!poster) {
      poster = $('img.wp-post-image').eq(1).attr('src') || $('img.wp-post-image').first().attr('src') || '';
      poster = poster.replace(/\?resize=\d+%2C\d+&ssl=1/, '?ssl=1');
    }

    // Info fields
    let overview = '';
    const info = {};
    $('span').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('النوع :')) info.type = text.split(':').pop().trim();
      if (text.includes('السنة :')) info.year = text.split(':').pop().trim();
      if (text.includes('الاستوديو:')) info.studio = text.split(':').pop().trim();
      if (text.includes('حالة')) info.status = text.split(':').pop().trim();
      if (text.includes('الدولة')) info.country = text.split(':').pop().trim();
    });

    // Synopsis from meta description or page content
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    overview = metaDesc || `${title} - ${info.type || 'أنمي'} ${info.year || ''}`.trim();

    // Genres
    const genres = [];
    $('a[href*="/genre/"]').each((i, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g) && g.length > 1) genres.push(g);
    });

    // Episodes - on a series page, we might have seasons listed as .one-poster cards
    // On a seasons page, episodes are listed as links
    const seasons = [];
    const episodeLinks = [];
    const seasonCards = [];

    // Check for season cards (series page -> has .one-poster linking to /seasons/)
    $('.one-poster').each((i, el) => {
      const cardLink = $(el).find('a').first().attr('href') || '';
      if (cardLink.includes('/seasons/') || cardLink.includes('/seasonsDubbed/')) {
        const cardTitle = $(el).find('h2 a, h3 a').first().text().trim();
        seasonCards.push({ url: cardLink, title: cardTitle });
      }
    });

    // Check for direct episode links (seasons page)
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/episodes/') && href !== `${BASE_URL}/episodes/`) {
        const text = $(el).text().trim();
        if (text.length > 5 && !text.includes('مشاهدة الحلقة')) {
          const epMatch = href.match(/\/episodes\/([^/]+)\/?$/);
          if (epMatch && !episodeLinks.find(e => e.slug === epMatch[1])) {
            // Extract episode number from text
            let epNum = null;
            const numMatch = text.match(/الحلقة\s*(\d+)/);
            if (numMatch) epNum = parseInt(numMatch[1], 10);
            if (!epNum) {
              const trailingMatch = text.match(/(\d+)\s*(?:مترجمة|مدبلجة|$)/);
              if (trailingMatch) epNum = parseInt(trailingMatch[1], 10);
            }
            if (!epNum) {
              const slugNum = epMatch[1].match(/ep-?(\d+)/);
              if (slugNum) epNum = parseInt(slugNum[1], 10);
            }
            episodeLinks.push({
              slug: epMatch[1],
              episodeNumber: epNum || (episodeLinks.length + 1),
              title: text,
              url: href,
            });
          }
        }
      }
    });

    if (episodeLinks.length > 0) {
      // We're on a seasons page with episode links
      episodeLinks.sort((a, b) => a.episodeNumber - b.episodeNumber);
      seasons.push({
        seasonNumber: 1,
        episodes: episodeLinks.map(ep => ({
          episodeNumber: ep.episodeNumber,
          id: ep.slug,
          url: ep.url,
        })),
      });
    } else if (seasonCards.length > 0) {
      // We're on a series page - fetch the first season to get episodes
      try {
        const firstSeason = seasonCards[0];
        const { data: seasonData } = await axios.get(firstSeason.url, { headers: DEFAULT_HEADERS, timeout: 15000 });
        const $s = load(seasonData);
        const eps = [];

        $s('a').each((i, el) => {
          const href = $s(el).attr('href') || '';
          if (href.includes('/episodes/') && href !== `${BASE_URL}/episodes/`) {
            const text = $s(el).text().trim();
            if (text.length > 5 && !text.includes('مشاهدة الحلقة')) {
              const epMatch = href.match(/\/episodes\/([^/]+)\/?$/);
              if (epMatch && !eps.find(e => e.id === epMatch[1])) {
                let epNum = null;
                const numMatch = text.match(/الحلقة\s*(\d+)/);
                if (numMatch) epNum = parseInt(numMatch[1], 10);
                if (!epNum) {
                  const slugNum = epMatch[1].match(/ep-?(\d+)/);
                  if (slugNum) epNum = parseInt(slugNum[1], 10);
                }
                eps.push({
                  episodeNumber: epNum || (eps.length + 1),
                  id: epMatch[1],
                  url: href,
                });
              }
            }
          }
        });

        eps.sort((a, b) => a.episodeNumber - b.episodeNumber);
        seasons.push({ seasonNumber: 1, episodes: eps });

        // If there are multiple season cards, add them as additional seasons
        for (let si = 1; si < seasonCards.length; si++) {
          seasons.push({
            seasonNumber: si + 1,
            seasonTitle: seasonCards[si].title,
            seasonUrl: seasonCards[si].url,
            episodes: [], // Loaded on demand
          });
        }
      } catch (e) {
        console.error('Failed to load season episodes:', e.message);
      }
    }

    const result = {
      id: slug,
      title,
      poster,
      backdrop: poster,
      overview,
      type: 'anime',
      genres,
      rating: info.type || null,
      year: info.year || null,
      studio: info.studio || null,
      status: info.status || null,
      seasons,
    };

    detailsCache.set(slug, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.error('Details Error:', err.message);
    throw new Error('Failed to scrape anime details.');
  }
}

// ==========================================
// PUBLIC API: resolveLauncherStream
// ==========================================
export async function resolveLauncherStream({ id, episode }) {
  // `episode` is the slug from getDetails (e.g. "naruto-الحلقة-01")
  let url;
  if (episode && typeof episode === 'string' && episode.includes('-')) {
    url = `${BASE_URL}/episodes/${episode}/`;
  } else {
    // Fallback: try to construct from id and episode number
    url = `${BASE_URL}/episodes/${id}-ep-${episode}/`;
  }

  const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
  const $ = load(data);

  // 1. Collect the default iframe
  const iframes = [];
  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) {
      iframes.push(src);
    }
  });

  // 2. Collect server buttons with data attributes
  const serverButtons = [];
  $('.buttosn, [data-serv]').each((i, el) => {
    const name = $(el).text().trim();
    const frameserver = ($(el).attr('data-frameserver') || '').replace(/["']/g, '');
    const serv = $(el).attr('data-serv') || '';
    if (frameserver && name) {
      serverButtons.push({ name, frameserver, serv });
    }
  });

  // 3. Try to resolve additional servers via AJAX
  const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
  for (const btn of serverButtons) {
    try {
      const params = new URLSearchParams();
      params.append('action', 'codecanal_ajax_request');
      params.append('_server_code_', btn.frameserver);
      params.append('frameserver', btn.frameserver);
      params.append('serv', btn.serv);
      params.append('is_film', '0');

      const { data: ajaxData } = await axios.post(ajaxUrl, params.toString(), {
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': url,
        },
        timeout: 10000,
      });

      if (ajaxData && typeof ajaxData === 'string' && ajaxData.includes('http')) {
        const $a = load(ajaxData);
        const iframeSrc = $a('iframe').attr('src');
        if (iframeSrc && !iframes.includes(iframeSrc)) {
          iframes.push(iframeSrc);
        }
      }
    } catch (e) {
      // AJAX failed for this server, skip
    }
  }

  // 4. Also try to construct direct embed URLs from frameserver codes
  for (const btn of serverButtons) {
    if (btn.frameserver && !iframes.some(u => u.includes(btn.frameserver))) {
      // Common embed pattern for share4max
      if (btn.name.toLowerCase().includes('megamax') || btn.name.toLowerCase().includes('share')) {
        const embedUrl = `https://share4max.com/iframe/${btn.frameserver}`;
        if (!iframes.includes(embedUrl)) iframes.push(embedUrl);
      }
      // Videa pattern
      if (btn.name.toLowerCase().includes('videa')) {
        const embedUrl = `https://videa.hu/player?v=${btn.frameserver}`;
        if (!iframes.includes(embedUrl)) iframes.push(embedUrl);
      }
      // Turboviplay
      if (btn.name.toLowerCase().includes('turbo')) {
        const embedUrl = `https://turboviplay.com/video/${btn.frameserver}`;
        if (!iframes.includes(embedUrl)) iframes.push(embedUrl);
      }
      // Okru
      if (btn.name.toLowerCase().includes('okru') || btn.name.toLowerCase().includes('ok.ru')) {
        const embedUrl = `https://ok.ru/videoembed/${btn.frameserver}`;
        if (!iframes.includes(embedUrl)) iframes.push(embedUrl);
      }
    }
  }

  const unique = [...new Set(iframes)];

  if (!unique.length) throw new Error('No compatible servers');

  // Format into structured server list
  const servers = unique.map((embedUrl, i) => {
    let name = 'Server ' + (i + 1);
    if (embedUrl.includes('share4max')) name = 'Share4Max';
    else if (embedUrl.includes('mega')) name = 'Mega';
    else if (embedUrl.includes('dood')) name = 'DoodStream';
    else if (embedUrl.includes('videa')) name = 'Videa';
    else if (embedUrl.includes('voe')) name = 'Voe';
    else if (embedUrl.includes('ok.ru')) name = 'OK.ru';
    else if (embedUrl.includes('turbo')) name = 'TurboViplay';
    else if (embedUrl.includes('mp4upload')) name = 'MP4Upload';

    return { name, url: embedUrl, quality: 'Auto' };
  });

  return { masterUrl: servers[0].url, isEmbed: true, servers, subtitles: [] };
}
