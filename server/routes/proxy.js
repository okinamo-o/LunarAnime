const express = require('express');
const router = express.Router();
const anime4upScraper = require('../services/anime4upScraper');
const { resolveLauncherStream, getSubtitleAsVtt } = require('../services/launcherResolver');
const axios = require('axios');

// Helper to rewrite relative HLS paths to absolute proxied paths
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

// GET /api/proxy/trending
router.get(['/trending', '/anime/trending'], async (req, res) => {
  try {
    const results = await anime4upScraper.fetchTrending();
    res.json({ page: 1, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape trending' });
  }
});

// GET /api/proxy/popular/:type
router.get('/popular/:type', async (req, res) => {
  try {
    const results = await anime4upScraper.fetchPopular();
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
    
    const maxResults = 25;
    const items = await anime4upScraper.search(query);
    res.json({ page: 1, results: items.slice(0, maxResults) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search' });
  }
});

// GET /api/proxy/details/anime/:id
router.get(['/details/:type/:id', '/details/anime/:id'], async (req, res) => {
  try {
    const slug = req.params.id;
    const details = await anime4upScraper.getDetails(slug);
    if (!details) return res.status(404).json({ error: 'Not found' });
    res.json(details);
  } catch (error) {
    console.error(`[Proxy] Details Error (${req.params.id}):`, error);
    res.status(500).json({ error: 'Failed to scrape details' });
  }
});

// GET /api/proxy/launcher/anime/:id?season=1&episode=1
router.get('/launcher/:type/:id', async (req, res) => {
  try {
    const season = Number(req.query.season) || 1;
    const episode = Number(req.query.episode) || 1;
    const cleanId = req.params.id;

    const data = await resolveLauncherStream({
      type: 'anime',
      id: cleanId,
      season,
      episode
    });

    res.json(data);
  } catch (error) {
    res.status(502).json({
      error: 'Failed to resolve launcher stream',
      details: error.message
    });
  }
});

// GET /api/proxy/vstream?url=https://...
router.get('/vstream', async (req, res) => {
  const targetUrl = req.query.url;
  const referer = req.query.referer || targetUrl;
  const cookies = req.query.cookies || '';
  const isHtml = req.query.isHtml === 'true';

  if (!targetUrl) return res.status(400).send('Missing URL');

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
    let items = [];
    if (genre) {
      items = await anime4upScraper.discover('anime-genre', genre, Number(page));
    } else {
      items = await anime4upScraper.discover('anime-type', 'tv2', Number(page));
    }
    
    res.json({ results: items });
  } catch (error) {
    console.error('[Proxy] Discover Error:', error);
    res.status(500).json({ error: 'Failed to discover' });
  }
});

module.exports = router;
