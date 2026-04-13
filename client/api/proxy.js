import * as scrapers from './_lib/scrapers.js';
import axios from 'axios';

export default async function handler(req, res) {
  const { action, q, id, episode, category, slug, page } = req.query;

  try {
    let result;

    switch (action) {
      case 'trending':
        result = await scrapers.fetchTrending();
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
        const imgRes = await axios.get(req.query.url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
        return res.send(Buffer.from(imgRes.data));
      case 'subtitle':
        const subRes = await axios.get(req.query.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.setHeader('Content-Type', 'text/vtt');
        return res.send(subRes.data);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(`[Vercel Proxy] Error (${action}):`, err.message);
    res.status(500).json({ error: err.message });
  }
}
