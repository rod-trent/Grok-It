import { STORAGE_KEY_HISTORY, MAX_HISTORY_ITEMS } from './constants.js';

export async function loadHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY_HISTORY, data => {
      resolve(data[STORAGE_KEY_HISTORY] || []);
    });
  });
}

export async function saveHistoryEntry(entry) {
  const history = await loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY_ITEMS) history.splice(MAX_HISTORY_ITEMS);
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: history }, resolve);
  });
}

export async function clearHistory() {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEY_HISTORY, resolve);
  });
}
