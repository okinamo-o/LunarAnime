const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://w1.anime4up.rest';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'ar,en-US,en;q=0.9',
};

// --- Parsers ---

function parseAnimeGrid(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('.anime-card-themex').each((i, el) => {
    // Basic extraction
    const title = $(el).find('h3 a').text().trim() || $(el).find('.anime-card-title').text().trim();
    if (!title) return;

    let link = $(el).find('.overlay').attr('href') || $(el).find('h3 a').attr('href') || '';
    if (link.startsWith('/')) {
      link = `${BASE_URL}${link}`;
    }

    let img = $(el).find('img').attr('data-image') || $(el).find('img').attr('src') || '';
    img = String(img).split('?')[0].trim();
    
    // Upgrade image resolution: remove WordPress thumbnail size suffixes (e.g., -300x450)
    img = img.replace(/-(\d+x\d+)\.(webp|jpg|png|jpeg)$/i, '.$2');
    
    // Some thumbnails are lazy loaded relative
    if (img.startsWith('/')) {
      img = `${BASE_URL}${img}`;
    }
    
    // Since anime4up uses slugs, we extract the slug from the URL.
    // Example: https://w1.anime4up.rest/anime/dorohedoro-season-2/ -> dorohedoro-season-2
    // If it's an episode link, it might be /episode/xxx
    const isEpisode = link.includes('/episode/');
    
    let slug = '';
    const match = link.match(/\/(anime|episode)\/([^\/]+)/);
    if (match) {
      slug = match[2];
    }

    if (!slug) return; // Ignore unparseable

    let type = $(el).find('.anime-card-type').text().trim();
    if (!type) {
        type = isEpisode ? 'Episode' : 'Anime';
    }

    results.push({
      id: slug, // we use the raw slug as the internal ID
      title,
      poster: img || null,
      type: 'anime', // Force 'anime' mapping for uniform frontend logic
      releaseDate: type, // anime4up doesn't give explicit year in generic views reliably, so we pass type
    });
  });

  return results;
}

// --- Home Page Cache (avoids fetching the same page twice) ---
let _homeCache = { data: null, timestamp: 0 };
const HOME_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function _fetchHomePage() {
  const now = Date.now();
  if (_homeCache.data && (now - _homeCache.timestamp) < HOME_CACHE_TTL) {
    return _homeCache.data;
  }
  const { data } = await axios.get(BASE_URL, { headers: DEFAULT_HEADERS });
  const results = parseAnimeGrid(data);
  _homeCache = { data: results, timestamp: now };
  return results;
}

async function fetchTrending() {
  try {
    const results = await _fetchHomePage();
    // Trending: the first batch (slider + latest additions)
    return results.slice(0, 15);
  } catch (err) {
    console.error('[Anime4Up] Trending Error:', err.message);
    return [];
  }
}

async function fetchPopular() {
  try {
    const results = await _fetchHomePage();
    // Popular: classic & recommended series from further down the page
    if (results.length > 15) {
      return results.slice(15, 30);
    }
    return results;
  } catch (err) {
    console.error('[Anime4Up] Popular Error:', err.message);
    return [];
  }
}


async function search(query) {
  try {
    const url = `${BASE_URL}/?search_param=animes&s=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS });
    return parseAnimeGrid(data);
  } catch (err) {
    console.error(`[Anime4Up] Search Error (${query}):`, err.message);
    return [];
  }
}

async function getDetails(slug) {
  try {
    const url = `${BASE_URL}/anime/${slug}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(data);

    const title = $('.anime-details-title').text().trim() || $('h1').first().text().trim();
    let poster = $('.anime-thumbnail img').attr('src') || $('.img-responsive').attr('src') || '';
    poster = String(poster).split('?')[0].trim();
    // Upgrade image resolution
    poster = poster.replace(/-(\d+x\d+)\.(webp|jpg|png|jpeg)$/i, '.$2');

    const overview = $('.anime-story').text().trim() || $('.story').text().trim() || 'لا توجد قصة متاحة.';
    
    // --- Helper to extract episodes from a cheerio doc ---
    function extractEpisodes($doc) {
      const eps = [];
      $doc('a').each((i, el) => {
        const epLink = $doc(el).attr('href') || '';
        const epMatch = epLink.match(/\/episode\/([^\/]+)/);
        if (!epMatch) return;
        
        const rawSlug = epMatch[1];
        let epNum = null;
        
        // Try text first: "الحلقة 4"
        const epText = $doc(el).text().trim();
        const numMatch = epText.match(/\b\d+\b/);
        if (numMatch && !epText.toLowerCase().includes(title.toLowerCase())) {
          epNum = parseInt(numMatch[0], 10);
        }
        
        // Fallback: trailing number from URL slug
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

    // --- Discover pagination ---
    let maxPage = 1;
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const pageMatch = href.match(/\/page\/(\d+)/);
      if (pageMatch) {
        const p = parseInt(pageMatch[1], 10);
        if (p > maxPage) maxPage = p;
      }
    });

    console.log(`[Anime4Up] "${title}" has ${maxPage} episode page(s)`);

    // Extract episodes from page 1
    let allEpisodes = extractEpisodes($);

    // Fetch remaining pages concurrently (batches of 5 to avoid overwhelming)
    if (maxPage > 1) {
      const pageNumbers = [];
      for (let p = 2; p <= maxPage; p++) pageNumbers.push(p);
      
      // Batch fetch in groups of 5
      for (let i = 0; i < pageNumbers.length; i += 5) {
        const batch = pageNumbers.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(p => 
            axios.get(`${url}/?page=${p}`, { headers: DEFAULT_HEADERS, timeout: 10000 })
              .then(res => {
                const $p = cheerio.load(res.data);
                return extractEpisodes($p);
              })
          )
        );
        
        for (const result of results) {
          if (result.status === 'fulfilled') {
            for (const ep of result.value) {
              if (!allEpisodes.some(e => e.episodeNumber === ep.episodeNumber)) {
                allEpisodes.push(ep);
              }
            }
          }
        }
      }
    }

    // Sort episodes ascending
    allEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    console.log(`[Anime4Up] "${title}": ${allEpisodes.length} total episodes found`);

    // --- Extract Genres ---
    const genres = [];
    $('a[href*="/anime-genre/"]').each((i, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    return {
      id: slug,
      title,
      poster: String(poster).split('?')[0].trim(),
      backdrop: String(poster).split('?')[0].trim(),
      overview,
      type: 'anime',
      genres: genres,
      seasons: [
        {
           seasonNumber: 1,
           episodes: allEpisodes
        }
      ]
    };
  } catch (err) {
    console.error(`[Anime4Up] Details Error (${slug}):`, err.message);
    throw new Error('Failed to scrape anime details.');
  }
}

async function discover(category, slugString, page = 1) {
  try {
    const slugs = String(slugString).split(',');

    if (slugs.length === 1) {
      let url = `${BASE_URL}/${category}/${slugs[0]}/`;
      if (page > 1) {
        url += `?page=${page}`;
      }
      const { data } = await axios.get(url, { headers: DEFAULT_HEADERS });
      return parseAnimeGrid(data);
    } else {
      // INTERSECTION fetch: Fetch multiple pages in batches to find overlapping anime.
      // Anime4up genre lists are sorted alphabetically, enabling consistent cross-page intersection.
      const PAGES_PER_BATCH = 3;
      const startPage = (page - 1) * PAGES_PER_BATCH + 1;
      const pagesToFetch = Array.from({length: PAGES_PER_BATCH}, (_, i) => startPage + i);

      const allPromises = [];
      slugs.forEach(slug => {
        pagesToFetch.forEach(p => {
          let url = `${BASE_URL}/${category}/${encodeURIComponent(slug)}/`;
          if (p > 1) url += `?page=${p}`;
          allPromises.push(
            axios.get(url, { headers: DEFAULT_HEADERS })
              .then(({ data }) => ({ slug, items: parseAnimeGrid(data) }))
              .catch(err => {
                console.error(`[Anime4Up] Discover sub-fetch Error (${category}/${slug}/p${p}):`, err.message);
                return { slug, items: [] };
              })
          );
        });
      });

      const resultsArrays = await Promise.all(allPromises);
      
      const itemsBySlug = {};
      slugs.forEach(s => itemsBySlug[s] = []);
      resultsArrays.forEach(res => {
         itemsBySlug[res.slug] = itemsBySlug[res.slug].concat(res.items);
      });

      // Filter to only include anime that exist in ALL selected genres (Intersection/AND)
      let baseItems = itemsBySlug[slugs[0]];
      
      for (let i = 1; i < slugs.length; i++) {
        const otherItems = itemsBySlug[slugs[i]];
        const otherIds = new Set(otherItems.map(x => x.id));
        baseItems = baseItems.filter(x => otherIds.has(x.id));
      }

      const uniqueMap = new Map();
      baseItems.forEach(anime => {
        if (!uniqueMap.has(anime.id)) {
          uniqueMap.set(anime.id, anime);
        }
      });

      return Array.from(uniqueMap.values());
    }
  } catch (err) {
    console.error(`[Anime4Up] Discover Error (${category}/${slugString}):`, err.message);
    return [];
  }
}

module.exports = {
  fetchTrending,
  fetchPopular,
  search,
  getDetails,
  discover
};
