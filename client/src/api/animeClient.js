const API_BASE = import.meta.env.VITE_API_URL || '/api';
const PROXY_BASE = `${API_BASE}/proxy`;

export const getImageUrl = (path) => {
  if (!path) return 'https://placehold.co/500x750/1a1a25/ffffff?text=No+Image';
  
  // Proxy anime4up images through our backend to bypass hotlink protection
  if (path.includes('anime4up') || path.includes('w1.anime4up')) {
    return `${PROXY_BASE}/image?url=${encodeURIComponent(path)}`;
  }
  return path;
};

export const getBackdropUrl = (path) => {
  if (!path) return null;
  return getImageUrl(path);
};

const fetchProxy = async (endpoint) => {
  const url = `${PROXY_BASE}${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details || data.error || `Proxy Error: ${res.status}`);
  }
  return res.json();
};

export const getTrending = (page = 1) => {
  return fetchProxy(`/trending?page=${page}`);
};

export const getPopular = (page = 1) =>
  fetchProxy(`/popular/anime?page=${page}`);

export const getTrendingAnime = () =>
  fetchProxy(`/anime/trending`);

export const getAnimeDetails = (slug) =>
  fetchProxy(`/details/anime/${slug}`);

export const getDetails = (mediaType, id) => {
  return getAnimeDetails(id);
};

export const searchMulti = (query, page = 1) =>
  fetchProxy(`/search?q=${encodeURIComponent(query)}&page=${page}`);

export const getLauncherStream = (mediaType, id, season = 1, episode = 1) =>
  fetchProxy(`/launcher/anime/${id}?season=${season}&episode=${episode}`);

export const getSubtitleTrackUrl = (subtitleUrl) =>
  `${PROXY_BASE}/subtitle?url=${encodeURIComponent(subtitleUrl)}`;

export const discoverByGenre = (mediaType = 'anime', genreSlug, page = 1) => {
  return fetchProxy(`/discover/anime?genre=${encodeURIComponent(genreSlug)}&page=${page}`);
};

