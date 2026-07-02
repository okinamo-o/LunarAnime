export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

/**
 * Global API fetch wrapper that handles 401 Unauthorized errors.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = getHeaders();
  
  // Add Bearer token from localStorage if available
  const token = localStorage.getItem('lunar_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'omit', // We no longer rely on cookies, so we can omit them to avoid 3P cookie blocks
      signal: controller.signal,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // Dispatch global event for AuthContext to handle logout
      window.dispatchEvent(new CustomEvent('lunar_unauthorized'));
      throw new Error(data.message || 'Session expired');
    }

    if (!res.ok) {
      throw new Error(data.message || `API Error: ${res.status}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالسيرفر.');
    }
    throw err;
  }
}

// Auth
export const registerUser = async (username, email, password) => {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
  if (data.token) localStorage.setItem('lunar_token', data.token);
  return data;
};

export const loginUser = async (username, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (data.token) localStorage.setItem('lunar_token', data.token);
  return data;
};

export const logoutUser = async () => {
  localStorage.removeItem('lunar_token');
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore logout error if token was already invalid
  }
};

export const getMe = async () => request('/auth/me');

// Watchlist
export const getWatchlist = () => request('/watchlist');

export const addToWatchlist = (item) => 
  request('/watchlist', {
    method: 'POST',
    body: JSON.stringify(item)
  });

export const removeFromWatchlist = (animeId, removeHistory = false) => 
  request(`/watchlist/${animeId}${removeHistory ? '?history=true' : ''}`, {
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
