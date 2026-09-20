import toast from "react-hot-toast";
import { getFriendlyErrorMessage } from "./errorMessages";

export const resetApiLogoutGuard = () => {};

export const getAuthState = () => {
  try {
    // eslint-disable-next-line no-restricted-syntax
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem("auth");
    return null;
  }
};

// Internal: raw localStorage access for edge cases
export const _getAuthRaw = () => {
  // eslint-disable-next-line no-restricted-syntax
  return localStorage.getItem("auth");
};

export const getAuthToken = () => {
  const auth = getAuthState();
  return auth?.token || "";
};

export const getRefreshToken = () => {
  const auth = getAuthState();
  return auth?.refreshToken || "";
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < (now + 10);
  } catch {
    return true;
  }
};

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const response = await apiFetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, false);

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    const newToken = data.access_token;

    const auth = getAuthState();
    if (auth) {
      auth.token = newToken;
      localStorage.setItem("auth", JSON.stringify(auth));
    }

    window.dispatchEvent(new CustomEvent('TOKEN_UPDATED', { detail: { token: newToken } }));
    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const apiFetch = async (url, options = {}, retry = true) => {
  let token = getAuthToken();
  const { _token, ...fetchOptions } = options;

  if (token && isTokenExpired(token) && retry) {
    try {
      token = await refreshAccessToken();
    } catch {
      // Token refresh failed, proceed with existing token
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // eslint-disable-next-line no-restricted-syntax
  const response = await fetch(url, { ...fetchOptions, headers });

  if (response.status === 401 && token && retry) {
    try {
      const newToken = await refreshAccessToken();
      const newHeaders = new Headers(fetchOptions.headers || {});
      newHeaders.set('Authorization', `Bearer ${newToken}`);
      if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !newHeaders.has('Content-Type')) {
        newHeaders.set('Content-Type', 'application/json');
      }
      // eslint-disable-next-line no-restricted-syntax
      return await fetch(url, { ...fetchOptions, headers: newHeaders });
    } catch {
      toast.error("Session expired. Please log in again.");
      window.dispatchEvent(new Event('LOGOUT'));
      return response;
    }
  }

  return response;
};

export const apiJson = async (url, options = {}) => {
  const { unwrapData = false, ...fetchOptions } = options;
  const response = await apiFetch(url, fetchOptions);
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let payload = null;

  if (text && isJson) {
    try {
      payload = JSON.parse(text);
    } catch {
      const error = new Error(`Invalid JSON response from API (${response.status})`);
      error.status = response.status;
      error.rawBody = text;
      throw error;
    }
  }

  if (!response.ok) {
    const fallback = response.statusText
      ? `API error ${response.status}: ${response.statusText}`
      : `API error: ${response.status}`;
    
    // Use friendly error message
    const friendlyMessage = getFriendlyErrorMessage({
      message: payload?.message || payload?.error || fallback,
      status: response.status,
      code: payload?.code,
    });
    
    const error = new Error(friendlyMessage);
    error.status = response.status;
    error.payload = payload;
    error.code = payload?.code;
    if (!isJson) error.rawBody = text;
    throw error;
  }

  if (text && !isJson) {
    const error = new Error(`Expected JSON response but received ${contentType || "unknown content type"}`);
    error.status = response.status;
    error.rawBody = text;
    throw error;
  }

  return unwrapData ? payload?.data ?? payload : payload;
};

/**
 * API Route Constants
 * Centralized endpoint definitions for consistency
 */
export const API_ROUTES = {
  // Auth
  AUTH: {
    SIGNUP: '/api/auth/signup',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VALIDATE_SETUP: (token) => `/api/auth/validate-setup/${token}`,
    SETUP_PASSWORD: '/api/auth/setup-password',
    PARTICIPANT_LOGIN: '/api/auth/participant-login',
    PARTICIPANT_SIGNUP: '/api/auth/participant-signup',
    PARTICIPANT_SELECT_COMPETITION: '/api/auth/participant-select-competition',
    PARTICIPANT_CLAIM_VALIDATE: '/api/auth/participant-claim-validate',
    PARTICIPANT_CLAIM_SET_PASSWORD: '/api/auth/participant-claim-set-password',
    SELECT_COMPETITION: '/api/auth/competition/select',
  },

  // Participants
  PARTICIPANTS: {
    BASE: '/api/participants',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/participants${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/participants',
    BULK_JSON: '/api/participants/bulkJson',
    BULK: '/api/participants/bulk',
    UPDATE: (id) => `/api/participants/${id}`,
    DELETE: (id) => `/api/participants/${id}`,
    BULK_DELETE: '/api/participants/bulk',
    SETUP_LINKS_BULK: '/api/participants/setup-links/bulk',
    SETUP_LINK_REGENERATE: (id) => `/api/participants/${id}/setup-link/regenerate`,
    STATUS: (id) => `/api/participants/${id}/status`,
    IMPORT: {
      VALIDATE: '/api/participants/import/validate',
      EXECUTE: '/api/participants/import/execute',
      JOB: (jobId) => `/api/participants/import/${jobId}`,
    },
    EXPORT: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/participants/export${q ? `?${q}` : ''}`;
    },
  },

  // Events
  EVENTS: {
    BASE: '/api/event',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/event${q ? `?${q}` : ''}`;
    },
    GET: (id) => `/api/event/${id}`,
    CREATE: '/api/event',
    UPDATE: (id) => `/api/event/${id}`,
    DELETE: (id) => `/api/event/${id}`,
    USAGE: '/api/event/usage',
    COORDINATORS: '/api/event/coordinators',
    JUDGES: '/api/event/judges',
    TEAMS: (id) => `/api/event/${id}/teams`,
    STATUS: (id) => `/api/event/${id}/status`,
    DELAY: (id) => `/api/event/${id}/delay`,
    RESUME: (id) => `/api/event/${id}/resume`,
    TIMELINE: (id) => `/api/event/${id}/timeline`,
    STATUS_SUMMARY: '/api/event/status-summary',
    VALID_TRANSITIONS: '/api/event/valid-transitions',
  },

  // Teams
  TEAMS: {
    BASE: '/api/team',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/team${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/team',
    QUICK_REGISTER: '/api/team/quick-register',
    GET: (id) => `/api/team/${id}`,
    UPDATE: (id) => `/api/team/${id}`,
    DELETE: (id) => `/api/team/${id}`,
    CHEST: (id) => `/api/team/${id}/chest`,
    BULK_CHEST: '/api/team/bulk-chest',
    MEMBERS: (id) => `/api/team/${id}/members`,
    ADD_MEMBER: (id) => `/api/team/${id}/members`,
    REMOVE_MEMBER: (teamId, participantId) => `/api/team/${teamId}/members/${participantId}`,
    PARTICIPATE: '/api/team/participate',
    MY_REGISTRATIONS: '/api/team/my-registrations',
    JOIN: (id) => `/api/team/${id}/join`,
  },

  // Results
  RESULTS: {
    BASE: '/api/results',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/results${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/results',
    GET: (id) => `/api/results/${id}`,
    UPDATE: (id) => `/api/results/${id}`,
    DELETE: (id) => `/api/results/${id}`,
    APPROVE: (id) => `/api/results/${id}/approve`,
    BULK_APPROVE: '/api/results/approve',
    REJECT: (id) => `/api/results/${id}/reject`,
    BULK_REJECT: '/api/results/reject',
    ADMIN_EDIT: (id) => `/api/results/${id}/admin-edit`,
    ADMIN_DELETE: (id) => `/api/results/${id}/admin-delete`,
    PUBLISH: (id) => `/api/results/${id}/publish`,
    BULK_PUBLISH: '/api/results/publish',
    LOCK: (id) => `/api/results/${id}/lock`,
    BULK_LOCK: '/api/results/lock',
    REVERT: (id) => `/api/results/${id}/revert`,
    BULK_REVERT: '/api/results/revert',
  },

  // Competitions
  COMPETITIONS: {
    BASE: '/api/competition',
    LIST: '/api/competition',
    GET: (id) => `/api/competition/${id}`,
    CREATE: '/api/competition',
    UPDATE: (id) => `/api/competition/${id}`,
    DELETE: (id) => `/api/competition/${id}`,
    MY: '/api/competition/my',
    GROUPS: (id) => `/api/competition/${id}/groups`,
    SELECT: '/api/auth/competition/select',
  },

  // Groups/Houses
  GROUPS: {
    BASE: '/api/groups',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/groups${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/groups',
    GET: (id) => `/api/groups/${id}`,
    UPDATE: (id) => `/api/groups/${id}`,
    DELETE: (id) => `/api/groups/${id}`,
    LOGO: (id) => `/api/groups/${id}/logo`,
  },

  // Captain
  CAPTAIN: {
    BASE: '/api/captain',
    PROFILE: '/api/captain/me',
    UPDATE_PROFILE: '/api/captain/me',
    GROUP_PARTICIPANTS: '/api/captain/group-participants',
    CREATE_PARTICIPANT: '/api/captain/create-participant',
    REGISTER_FOR_EVENT: '/api/captain/register-for-event',
    UNREGISTER_FROM_EVENT: '/api/captain/unregister-from-event',
    GROUP_EVENT_REGISTRATIONS: '/api/captain/group-event-registrations',
    BULK_REGISTER: '/api/captain/bulk-register',
    UPDATE_TEAM: (id) => `/api/captain/team/${id}`,
  },

  // Judge
  JUDGE: {
    ASSIGNMENTS: '/api/judge/assignments',
    SESSION: (eventId, roundNo) => `/api/judge/session/${eventId}${roundNo ? `?round_no=${roundNo}` : ''}`,
    START_SESSION: (eventId) => `/api/judge/session/${eventId}/start`,
    SCORE: (eventId) => `/api/judge/session/${eventId}/score`,
    NAVIGATE: (eventId) => `/api/judge/session/${eventId}/navigate`,
    DISQUALIFY: (eventId) => `/api/judge/session/${eventId}/disqualify`,
    COMPLETE: (eventId) => `/api/judge/session/${eventId}/complete`,
    RANKING: (eventId, roundNo) => `/api/judge/session/${eventId}/ranking${roundNo ? `?round_no=${roundNo}` : ''}`,
    ABANDON: (eventId, roundNo) => `/api/judge/session/${eventId}${roundNo ? `?round_no=${roundNo}` : ''}`,
  },

  // Scoreboard
  SCOREBOARD: {
    BASE: '/api/scoreboard',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/scoreboard${q ? `?${q}` : ''}`;
    },
    GROUP_BREAKDOWN: '/api/scoreboard/group-breakdown',
  },

  // Users
  USERS: {
    BASE: '/api/users',
    LIST: '/api/users',
    CREATE: '/api/users',
    GET: (id) => `/api/users/${id}`,
    UPDATE: (id) => `/api/users/${id}`,
    DELETE: (id) => `/api/users/${id}`,
    SETUP_LINK: (id) => `/api/user/setup-link/${id}`,
    SEARCH: '/api/users/search',
    PROFILE: '/api/profile',
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/notifications${q ? `?${q}` : ''}`;
    },
    MARK_READ: (id) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
  },

  // Schedule
  SCHEDULE: {
    BASE: '/api/schedule',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/schedule${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/schedule',
    GET: (id) => `/api/schedule/${id}`,
    UPDATE: (id) => `/api/schedule/${id}`,
    DELETE: (id) => `/api/schedule/${id}`,
  },

  // Venues
  VENUES: {
    BASE: '/api/venues',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/venues${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/venues',
    GET: (id) => `/api/venues/${id}`,
    UPDATE: (id) => `/api/venues/${id}`,
    DELETE: (id) => `/api/venues/${id}`,
  },

  // Public
  PUBLIC: {
    BASE: '/api/public',
    EVENTS: '/api/public/events',
    STANDINGS: '/api/public/standings',
    RESULTS: '/api/public/results',
    TICKER: '/api/public/ticker',
    STATS: '/api/public/stats',
    PARTICIPANTS_TOP: (slug, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/public/${slug}/participants/top${q ? `?${q}` : ''}`;
    },
    PARTICIPANT_DETAIL: (slug, participantId) => `/api/public/${slug}/participants/${participantId}`,
  },

  // Live
  LIVE: {
    BASE: '/api/live',
    EVENTS: '/api/live/events',
    SCORES: '/api/live/scores',
  },

  // Export
  EXPORT: {
    BASE: '/api/export',
    REPORT: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/export/report${q ? `?${q}` : ''}`;
    },
    PARTICIPANTS: '/api/export/participants',
    RESULTS: '/api/export/results',
    SCOREBOARD: '/api/export/scoreboard',
  },

  // Subcategories
  SUBCATEGORIES: {
    BASE: '/api/subcategories',
    LIST: (category) => `/api/subcategories/${category}`,
    CREATE: '/api/subcategories',
    UPDATE: (id) => `/api/subcategories/${id}`,
    DELETE: (id) => `/api/subcategories/${id}`,
  },

  // Appeals
  APPEALS: {
    BASE: '/api/appeal',
    LIST: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return `/api/appeal${q ? `?${q}` : ''}`;
    },
    CREATE: '/api/appeal',
    REVIEW: (id) => `/api/appeal/${id}/review`,
  },

  // Profile
  PROFILE: {
    BASE: '/api/profile',
    UPDATE: '/api/profile',
  },
};

/**
 * Build full URL with backend base
 * @param {string} route - Route from API_ROUTES
 * @returns {string} Full URL
 */
export const buildUrl = (route) => {
  if (typeof route === "function") {
    throw new TypeError(
      `buildUrl received a function instead of an endpoint string — did you forget to invoke it? e.g. API_ROUTES.NOTIFICATIONS.LIST({}) (got: ${route.name || "anonymous function"})`
    );
  }
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  return `${backendUrl}${route}`;
};

/**
 * Convenience wrapper for common CRUD operations
 */
export const api = {
  get: (route, options = {}) => apiJson(buildUrl(route), { method: 'GET', ...options }),
  post: (route, body, options = {}) => apiJson(buildUrl(route), { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (route, body, options = {}) => apiJson(buildUrl(route), { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (route, body, options = {}) => apiJson(buildUrl(route), { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (route, options = {}) => apiJson(buildUrl(route), { method: 'DELETE', ...options }),
};