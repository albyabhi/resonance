// ─────────────────────────────────────────────────────────────
// Safe storage wrapper — the theme system must never break
// app initialisation because storage is blocked (private mode,
// restricted environments, quota, etc.).
//
// Failure path: storage unavailable → null → caller falls back
// to system preference → light.
// ─────────────────────────────────────────────────────────────

/**
 * Read a value from localStorage, tolerating any failure.
 * @param {string} key
 * @returns {string|null}
 */
export function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a value to localStorage, tolerating any failure.
 * @param {string} key
 * @param {string} value
 */
export function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — non-fatal. Theme still applies in-memory.
  }
}
