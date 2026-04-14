const PROXY_BASE = 'https://okinamo-lunar-proxy-okinamo.hf.space/proxy';

export const getImageUrl = (path) => {
  if (!path || path.includes('default.png') || path.includes('default.jpg')) {
    return 'https://placehold.co/500x750/1a1a25/ffffff?text=No+Image';
  }
  if (path.includes('anime4up') || path.includes('witanime') || path.includes('animelek')) {
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
export const getLatestEpisodes = () => fetchProxy({ action: 'latest-episodes' });
export const getAnimeDetails = (id) => fetchProxy({ action: 'details', id });
export const getDetails = (type, id) => getAnimeDetails(id);
export const searchMulti = (q, page = 1) => fetchProxy({ action: 'search', q, page });
export const getLauncherStream = (type, id, season, episodeSlug) => fetchProxy({ action: 'launcher', id, episode: episodeSlug });
export const discoverByGenre = (type, genre, page = 1) => fetchProxy({ action: 'discover', category: 'anime-genre', slug: genre, page });
export const getSubtitleTrackUrl = (url) => `${PROXY_BASE}?action=subtitle&url=${encodeURIComponent(url)}`;
