const PROXY_BASE = 'https://m-a-v-l-u-n-a-r-a-n-i-m-e-p-r-o-x-y.hf.space/proxy';

export const getImageUrl = (path) => {
  if (!path) return 'https://placehold.co/500x750/1a1a25/ffffff?text=No+Image';
  if (path.includes('anime4up') || path.includes('witanime')) {
    return `${PROXY_BASE}?action=image&url=${encodeURIComponent(path)}`;
  }
  return path;
};

export const getBackdropUrl = (path) => path ? getImageUrl(path) : null;

const fetchProxy = async (params) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${PROXY_BASE}?${query}`);
  if (!res.ok) throw new Error(`Proxy Error: ${res.status}`);
  return res.json();
};

export const getTrending = () => fetchProxy({ action: 'trending' });
export const getPopular = () => fetchProxy({ action: 'popular' });
export const getAnimeDetails = (id) => fetchProxy({ action: 'details', id });
export const getDetails = (type, id) => getAnimeDetails(id);
export const searchMulti = (q, page = 1) => fetchProxy({ action: 'search', q, page });
export const getLauncherStream = (type, id, season, episode) => fetchProxy({ action: 'launcher', id, episode });
export const discoverByGenre = (type, genre, page = 1) => fetchProxy({ action: 'discover', category: 'anime-genre', slug: genre, page });
export const getSubtitleTrackUrl = (url) => `${PROXY_BASE}?action=subtitle&url=${encodeURIComponent(url)}`;
