const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('lunaranime_user') || 'null');
  return {
    'Content-Type': 'application/json',
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
  };
};

/**
 * Global API fetch wrapper that handles 401 Unauthorized errors.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = getHeaders();
  
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Dispatch global event for AuthContext to handle logout
    window.dispatchEvent(new CustomEvent('lunar_unauthorized'));
    localStorage.removeItem('lunaranime_user');
    throw new Error(data.message || 'Session expired');
  }

  if (!res.ok) {
    throw new Error(data.message || `API Error: ${res.status}`);
  }

  return data;
}

// Auth
export const registerUser = async (username, email, password) => 
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });

export const loginUser = async (username, password) => 
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

// Watchlist
export const getWatchlist = () => request('/watchlist');

export const addToWatchlist = (item) => 
  request('/watchlist', {
    method: 'POST',
    body: JSON.stringify(item)
  });

export const removeFromWatchlist = (animeId) => 
  request(`/watchlist/${animeId}`, {
    method: 'DELETE'
  });

export const reorderWatchlist = (orderedIds) => 
  request('/watchlist/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orderedIds })
  });

export const toggleWatched = (animeId) => 
  request(`/watchlist/toggle-watched/${animeId}`, {
    method: 'PUT'
  });

export const updateWatchProgress = (animeId, lastSeason, lastEpisode, metadata = {}) => 
  request(`/watchlist/progress/${animeId}`, {
    method: 'PUT',
    body: JSON.stringify({ 
      lastSeason, 
      lastEpisode,
      ...metadata
    })
  });

// Ratings
export const getUserRating = (animeId) => request(`/ratings/${animeId}`);

export const submitRating = (animeId, rating) => 
  request('/ratings', {
    method: 'POST',
    body: JSON.stringify({ animeId, rating })
  });

// Admin
export const getAdminStats = () => request('/admin/stats');

export const getAdminUsers = () => request('/admin/users');

export const deleteAdminUser = (userId) => 
  request(`/admin/users/${userId}`, {
    method: 'DELETE'
  });
