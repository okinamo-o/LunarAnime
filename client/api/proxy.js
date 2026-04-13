const scrapers = require('./_lib/scrapers');

module.exports = async (req, res) => {
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
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(`[Vercel Proxy] Error (${action}):`, err.message);
    res.status(500).json({ error: err.message });
  }
};
