let logoutDispatched = false;

export const resetApiLogoutGuard = () => {
  logoutDispatched = false;
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

export const refreshAccessToken = async () => {
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
};

export const apiFetch = async (url, options = {}, retry = true) => {
  const token = getAuthToken();
  const { _token, ...fetchOptions } = options; // strip internal param
  
  const headers = new Headers(fetchOptions.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && token && retry) {
    console.log("apiFetch: 401 received, attempting token refresh");
    try {
      const newToken = await refreshAccessToken();
      const newHeaders = new Headers(fetchOptions.headers || {});
      newHeaders.set('Authorization', `Bearer ${newToken}`);
      console.log(`apiFetch: Retrying ${fetchOptions.method || 'GET'} ${url} with refreshed token`);
      return await fetch(url, {
        ...fetchOptions,
        headers: newHeaders,
      });
    } catch (refreshError) {
      console.log("apiFetch: Token refresh failed, dispatching logout");
      logoutDispatched = true;
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
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `API error: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return unwrapData ? payload?.data ?? payload : payload;
};
