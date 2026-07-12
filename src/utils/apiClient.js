import toast from "react-hot-toast";

// Resets any internal "logout guard" state used to prevent repeated logout flows.
// This project currently dispatches LOGOUT directly on auth failures in apiFetch/apiJson,
// but AuthContext still expects this named export.
export const resetApiLogoutGuard = () => {
  // No-op for now (kept for backward compatibility).
};

export const getAuthState = () => {
  try {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem("auth");
    return null;
  }
};

export const getAuthToken = () => {
  const auth = getAuthState();
  const token = auth?.token || localStorage.getItem("access_token") || "";
  return token;
};

export const getRefreshToken = () => {
  const auth = getAuthState();
  return auth?.refreshToken || localStorage.getItem("refresh_token") || "";
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
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const newToken = data.access_token;

    // Update localStorage
    const auth = getAuthState();
    if (auth) {
      auth.token = newToken;
      localStorage.setItem("auth", JSON.stringify(auth));
    }

    // Dispatch event to update context
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
  const { _token, ...fetchOptions } = options; // strip internal param

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

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && token && retry) {
    try {
      const newToken = await refreshAccessToken();
      const newHeaders = new Headers(fetchOptions.headers || {});
      newHeaders.set('Authorization', `Bearer ${newToken}`);
      return await fetch(url, {
        ...fetchOptions,
        headers: newHeaders,
      });
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
    const error = new Error(payload?.message || payload?.error || fallback);
    error.status = response.status;
    error.payload = payload;
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
