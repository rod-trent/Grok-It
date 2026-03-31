import { STORAGE_KEY_THEME } from './constants.js';

/**
 * Reads the saved theme preference and applies it to <html>.
 * "system" (default) → no attribute, CSS prefers-color-scheme handles it.
 * "light" / "dark"   → sets data-theme attribute to force that theme.
 */
export async function applyTheme() {
  const data = await new Promise(resolve =>
    chrome.storage.sync.get(STORAGE_KEY_THEME, resolve)
  );
  const theme = data[STORAGE_KEY_THEME] || 'system';
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
