/* global Buffer */
import * as scrapers from './_lib/scrapers.js';
import axios from 'axios';

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

export default async function handler(req, res) {
  const { action, q, id, episode, category, slug, page } = req.query;

  try {
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
      case 'image': {
        if (!req.query.url) return res.status(400).json({ error: 'Missing url' });
        if (!isValidUrl(req.query.url)) return res.status(403).json({ error: 'Invalid or forbidden URL' });
        const imgRes = await axios.get(req.query.url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
        return res.send(Buffer.from(imgRes.data));
      }
      case 'subtitle': {
        if (!req.query.url) return res.status(400).json({ error: 'Missing url' });
        if (!isValidUrl(req.query.url)) return res.status(403).json({ error: 'Invalid or forbidden URL' });
        const subRes = await axios.get(req.query.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', 'text/vtt');
        return res.send(subRes.data);
      }
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    // Set CDN caching depending on the action to massively improve speed
    if (['trending', 'popular', 'latest-episodes'].includes(action)) {
      // Cache home page lists for 1 hour, serve stale while revalidating for 2 hours
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    } else if (action === 'image') {
      // Cache images for a year (posters rarely change)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (action === 'details' || action === 'discover' || action === 'search') {
      // Cache details and search for 30 minutes
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    } else if (action === 'launcher') {
      // Video links might expire quickly, so cache for 10 minutes only
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(`[Vercel Proxy] Error (${action}):`, err.message);
    res.status(500).json({ error: err.message });
  }
}
