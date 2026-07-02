const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSubtitleAsVtt } = require('../services/launcherResolver');

let scrapersPromise = import('../services/scrapers.mjs');

async function getScrapers() {
  return await scrapersPromise;
}

// Helper to validate URLs to prevent SSRF
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname;
    if (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
      hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') || hostname.endsWith('.internal') || hostname.endsWith('.local')
    ) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function rewriteManifest(manifest, originalUrl, originalReferer, cookies = '') {
  const baseUrl = new URL(originalUrl);
  const baseDir = baseUrl.origin + baseUrl.pathname.split('/').slice(0, -1).join('/');

  return manifest.replace(/^(?![#\s])(.*)/gm, (match) => {
    let absoluteUrl;
    try {
      if (match.startsWith('http')) {
        absoluteUrl = match;
      } else if (match.startsWith('/')) {
        absoluteUrl = baseUrl.origin + match;
      } else {
        absoluteUrl = `${baseDir}/${match}`;
      }
      return `/api/proxy/vstream?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(originalReferer)}&cookies=${encodeURIComponent(cookies)}`;
    } catch (err) {
      return match;
    }
  });
}

// Support for Vercel-style ?action=... queries
router.get('/', async (req, res, next) => {
  const { action, q, id, episode, category, slug, page } = req.query;
  if (!action) return next();

  try {
    const scrapers = await getScrapers();
    let result;
    switch (action) {
      case 'trending':
        result = await scrapers.fetchTrending();
        break;
      case 'latest-episodes':
        result = await scrapers.fetchLatestEpisodes();
        break;
      case 'popular':
        result = await scrapers.fetchPopular();
        break;
      case 'search':
        result = await scrapers.search(q);
        break;
      case 'details':
        result = await scrapers.getDetails(id);
        break;
      case 'discover':
        result = await scrapers.discover(category, slug, page);
        break;
      case 'launcher':
        result = await scrapers.resolveLauncherStream({ id, episode });
        break;
      case 'image':
        if (!req.query.url) return res.status(400).json({ error: 'Missing url' });
        if (!isValidUrl(req.query.url)) return res.status(403).json({ error: 'Invalid or forbidden URL' });
        const imgRes = await axios.get(req.query.url, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://w1.anime4up.rest/' } });
        res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
        return imgRes.data.pipe(res);
      case 'subtitle':
        if (!req.query.url) return res.status(400).json({ error: 'Missing url' });
        if (!isValidUrl(req.query.url)) return res.status(403).json({ error: 'Invalid or forbidden URL' });
        const subRes = await axios.get(req.query.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', 'text/vtt');
        return res.send(subRes.data);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    res.json(result);
  } catch (err) {
    console.error(`[Express Proxy] Error (${action}):`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/proxy/trending
router.get(['/trending', '/anime/trending'], async (req, res) => {
  try {
    const scrapers = await getScrapers();
    const results = await scrapers.fetchTrending();
    res.json({ page: 1, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape trending' });
  }
});

// GET /api/proxy/popular/:type
router.get('/popular/:type', async (req, res) => {
  try {
    const scrapers = await getScrapers();
    const results = await scrapers.fetchPopular();
    res.json({ page: 1, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape popular' });
  }
});

// GET /api/proxy/search?q=...
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.json({ page: 1, results: [] });
    const scrapers = await getScrapers();
    const items = await scrapers.search(query);
    res.json({ page: 1, results: items.slice(0, 25) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search' });
  }
});

// GET /api/proxy/details/anime/:id
router.get(['/details/:type/:id', '/details/anime/:id'], async (req, res) => {
  try {
    const scrapers = await getScrapers();
    const details = await scrapers.getDetails(req.params.id);
    if (!details) return res.status(404).json({ error: 'Not found' });
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape details' });
  }
});

// GET /api/proxy/launcher/anime/:id?season=1&episode=1
router.get('/launcher/:type/:id', async (req, res) => {
  try {
    const season = Number(req.query.season) || 1;
    const episode = Number(req.query.episode) || 1;
    const scrapers = await getScrapers();
    const data = await scrapers.resolveLauncherStream({ id: req.params.id, season, episode });
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: 'Failed to resolve launcher stream', details: error.message });
  }
});

// GET /api/proxy/vstream?url=https://...
router.get('/vstream', async (req, res) => {
  const targetUrl = req.query.url;
  const referer = req.query.referer || targetUrl;
  const cookies = req.query.cookies || '';
  const isHtml = req.query.isHtml === 'true';

  if (!targetUrl) return res.status(400).send('Missing URL');
  if (!isValidUrl(targetUrl)) return res.status(403).send('Invalid or forbidden URL (SSRF Protection)');

  const isManifest = targetUrl.includes('.m3u8');
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const baseReferer = new URL(referer).origin + '/';
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': baseReferer,
        'Cookie': cookies,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      };

      const response = await axios.get(targetUrl, {
        responseType: (isManifest || isHtml) ? 'text' : 'stream',
        headers,
        timeout: 20000,
        validateStatus: (status) => status < 400
      });

      if (response.status >= 400) {
        throw new Error(`Upstream returned ${response.status}`);
      }

      const setCookies = response.headers['set-cookie'];
      const newCookies = setCookies ? setCookies.map(c => c.split(';')[0]).join('; ') : '';
      const combinedCookies = [cookies, newCookies].filter(Boolean).join('; ');

      res.setHeader('Access-Control-Allow-Origin', '*');

      if (isManifest) {
        const originalManifest = response.data;
        const modifiedManifest = rewriteManifest(originalManifest, targetUrl, referer, combinedCookies);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(modifiedManifest);
      } else if (isHtml) {
        let htmlContent = response.data;
        const baseTag = `<base href="${new URL(targetUrl).origin}/">`;
        if (htmlContent.includes('<head>')) {
          htmlContent = htmlContent.replace('<head>', `<head>\n    ${baseTag}`);
        } else {
          htmlContent = baseTag + '\n' + htmlContent;
        }
        res.setHeader('Content-Type', 'text/html');
        if (setCookies) res.setHeader('Set-Cookie', setCookies);
        res.send(htmlContent);
      } else {
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/MP2T');
        if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
        if (setCookies) res.setHeader('Set-Cookie', setCookies);
        response.data.pipe(res);
      }
      return;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        res.status(502).send(`Stream error: ${error.message}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
});

// GET /api/proxy/subtitle?url=https://...
router.get('/subtitle', async (req, res) => {
  try {
    const subtitleUrl = req.query.url;
    if (!subtitleUrl) {
      return res.status(400).json({ error: 'Missing subtitle URL' });
    }
    if (!isValidUrl(subtitleUrl)) {
      return res.status(403).json({ error: 'Invalid or forbidden URL (SSRF Protection)' });
    }

    const vtt = await getSubtitleAsVtt(String(subtitleUrl));
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(vtt);
  } catch (error) {
    console.error('[Subtitle Proxy Error]:', error.message);
    res.status(502).json({
      error: 'Failed to load subtitle',
      details: error.message
    });
  }
});

// Image proxy to bypass anime4up hotlink protection
router.get('/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('Missing url');
  if (!isValidUrl(imageUrl)) return res.status(403).send('Invalid or forbidden URL (SSRF Protection)');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://w1.anime4up.rest/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      },
      timeout: 10000
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (err) {
    console.error('[Image Proxy] Error:', err.message);
    res.status(502).send('Image fetch failed');
  }
});



// GET /api/proxy/discover/:type
router.get('/discover/:type', async (req, res) => {
  const { genre, page = 1 } = req.query;
  
  try {
    const scrapers = await getScrapers();
    let items = [];
    if (genre) {
      items = await scrapers.discover('anime-genre', genre, Number(page));
    } else {
      items = await scrapers.discover('anime-type', 'tv2', Number(page));
    }
    
    res.json({ results: items });
  } catch (error) {
    console.error('[Proxy] Discover Error:', error);
    res.status(500).json({ error: 'Failed to discover' });
  }
});

module.exports = router;
