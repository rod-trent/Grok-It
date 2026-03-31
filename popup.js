import {
  SESSION_KEY_PROMPT, SESSION_KEY_PAGE_CONTEXT,
  MSG_STREAM_CHUNK, MSG_STREAM_DONE, MSG_STREAM_ERROR
} from './constants.js';
import { loadHistory, clearHistory } from './history.js';

// ── Icons (inline SVG strings) ────────────────────────────────────────────────

const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_REGEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  conversation: [],   // [{ role, content }]
  pageContext:  null, // { url, title }
  isStreaming:  false,
  currentPort:  null,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────

const conversationEl  = document.getElementById('conversation');
const progressBar     = document.getElementById('progress-bar');
const pageContextEl   = document.getElementById('page-context');
const pageFaviconEl   = document.getElementById('page-favicon');
const pageTitleEl     = document.getElementById('page-title-text');
const pageUrlLinkEl   = document.getElementById('page-url-link');
const historyPanel    = document.getElementById('history-panel');
const historyList     = document.getElementById('history-list');
const followUpInput   = document.getElementById('follow-up-input');
const sendBtn         = document.getElementById('btn-send');

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Read and clear session storage
  const session = await new Promise(resolve =>
    chrome.storage.session.get([SESSION_KEY_PROMPT, SESSION_KEY_PAGE_CONTEXT], resolve)
  );
  chrome.storage.session.remove([SESSION_KEY_PROMPT, SESSION_KEY_PAGE_CONTEXT]);

  state.pageContext = session[SESSION_KEY_PAGE_CONTEXT] || null;
  const initialPrompt = (session[SESSION_KEY_PROMPT] || '').trim();

  // Render page context badge
  if (state.pageContext?.url) renderPageContext(state.pageContext);

  // Fire initial request if text was selected
  if (initialPrompt) {
    appendUserBubble(initialPrompt);
    state.conversation.push({ role: 'user', content: initialPrompt });
    await streamFromGrok();
  }

  // Wire up UI
  setupInputArea();
  setupHeaderButtons();
  setupHistoryPanel();
});

// ── Page context badge ────────────────────────────────────────────────────────

function renderPageContext(ctx) {
  try {
    const origin = new URL(ctx.url).origin;
    pageFaviconEl.src = `${origin}/favicon.ico`;
  } catch (_) {}
  pageTitleEl.textContent = ctx.title || ctx.url;
  pageUrlLinkEl.href = ctx.url;
  pageContextEl.style.display = 'flex';
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function showProgress() {
  progressBar.classList.add('active');
}
function hideProgress() {
  progressBar.classList.remove('active');
  progressBar.style.width = '0%';
}

// ── Bubble helpers ────────────────────────────────────────────────────────────

function appendUserBubble(text) {
  const msg = document.createElement('div');
  msg.className = 'message message-user';
  msg.innerHTML = `<div class="bubble-user">${escapeHtml(text)}</div>`;
  conversationEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function appendAssistantBubble() {
  const msg = document.createElement('div');
  msg.className = 'message message-assistant';
  msg.innerHTML = `
    <div class="bubble-assistant">
      <div class="response-text streaming-cursor">
        <div class="skeleton-wrap">
          <div class="skeleton w-full"></div>
          <div class="skeleton w-3q"></div>
          <div class="skeleton w-half"></div>
        </div>
      </div>
    </div>`;
  conversationEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function appendChunkToBubble(bubbleMsg, chunk) {
  const textEl = bubbleMsg.querySelector('.response-text');
  // Remove skeleton on first chunk
  const skeleton = textEl.querySelector('.skeleton-wrap');
  if (skeleton) skeleton.remove();
  textEl.textContent += chunk;
  scrollToBottom();
}

function finalizeAssistantBubble(bubbleMsg, fullText) {
  const bubble = bubbleMsg.querySelector('.bubble-assistant');
  const textEl = bubble.querySelector('.response-text');
  textEl.classList.remove('streaming-cursor');
  textEl.textContent = fullText;

  // Track which turn index this is
  const turnIndex = state.conversation.length;

  // Add action buttons
  const actions = document.createElement('div');
  actions.className = 'bubble-actions';
  actions.innerHTML = `
    <button class="action-btn copy-btn" title="Copy to clipboard">${ICON_COPY} Copy</button>
    <button class="action-btn regen-btn" title="Regenerate response">${ICON_REGEN} Regenerate</button>`;
  bubble.appendChild(actions);

  actions.querySelector('.copy-btn').addEventListener('click', e => {
    copyToClipboard(fullText, e.currentTarget);
  });
  actions.querySelector('.regen-btn').addEventListener('click', () => {
    handleRegenerate(bubbleMsg, turnIndex);
  });

  scrollToBottom();
}

function showErrorInBubble(bubbleMsg, errorText) {
  const textEl = bubbleMsg.querySelector('.response-text');
  const skeleton = textEl.querySelector('.skeleton-wrap');
  if (skeleton) skeleton.remove();
  textEl.classList.remove('streaming-cursor');
  textEl.classList.add('error-text');
  textEl.textContent = `Error: ${errorText}`;
  scrollToBottom();
}

// ── Streaming ─────────────────────────────────────────────────────────────────

function streamFromGrok() {
  return new Promise(resolve => {
    if (state.isStreaming) { resolve(); return; }
    state.isStreaming = true;
    sendBtn.disabled = true;
    showProgress();

    const bubbleMsg = appendAssistantBubble();
    let fullText = '';

    const port = chrome.runtime.connect({ name: 'grok-stream' });
    state.currentPort = port;

    port.postMessage({
      messages:    state.conversation,
      pageContext: state.pageContext,
    });

    port.onMessage.addListener(msg => {
      if (msg.type === MSG_STREAM_CHUNK) {
        fullText += msg.chunk;
        appendChunkToBubble(bubbleMsg, msg.chunk);

      } else if (msg.type === MSG_STREAM_DONE) {
        finalizeAssistantBubble(bubbleMsg, msg.fullText || fullText);
        state.conversation.push({ role: 'assistant', content: msg.fullText || fullText });
        done();
        resolve();

      } else if (msg.type === MSG_STREAM_ERROR) {
        showErrorInBubble(bubbleMsg, msg.error);
        done();
        resolve();
      }
    });

    port.onDisconnect.addListener(() => {
      if (state.isStreaming) {
        if (!fullText) showErrorInBubble(bubbleMsg, 'Connection lost. Please try again.');
        else finalizeAssistantBubble(bubbleMsg, fullText);
        done();
        resolve();
      }
    });

    function done() {
      state.isStreaming = false;
      state.currentPort = null;
      sendBtn.disabled = followUpInput.value.trim() === '';
      hideProgress();
    }
  });
}

// ── Regenerate ────────────────────────────────────────────────────────────────

function handleRegenerate(bubbleMsg, turnIndex) {
  if (state.isStreaming) return;
  // Remove all turns from this assistant response onward
  state.conversation.splice(turnIndex);
  // Remove this bubble and any subsequent messages from DOM
  const messages = conversationEl.querySelectorAll('.message');
  messages.forEach((el, i) => {
    // Count assistant bubbles up to turnIndex
    if (el === bubbleMsg || el.compareDocumentPosition(bubbleMsg) & Node.DOCUMENT_POSITION_PRECEDING) {
      if (el !== bubbleMsg && conversationEl.contains(el)) {
        // only remove bubbles after this one
      }
    }
  });
  bubbleMsg.remove();
  streamFromGrok();
}

// ── Follow-up input ───────────────────────────────────────────────────────────

function setupInputArea() {
  followUpInput.addEventListener('input', () => {
    autoResize(followUpInput);
    sendBtn.disabled = followUpInput.value.trim() === '' || state.isStreaming;
  });

  followUpInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);
}

async function handleSend() {
  const text = followUpInput.value.trim();
  if (!text || state.isStreaming) return;
  followUpInput.value = '';
  autoResize(followUpInput);
  sendBtn.disabled = true;
  appendUserBubble(text);
  state.conversation.push({ role: 'user', content: text });
  await streamFromGrok();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
}

// ── Header buttons ────────────────────────────────────────────────────────────

function setupHeaderButtons() {
  document.getElementById('btn-history').addEventListener('click', () => {
    toggleHistoryPanel(true);
  });
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ── History panel ─────────────────────────────────────────────────────────────

function setupHistoryPanel() {
  document.getElementById('btn-history-close').addEventListener('click', () => {
    toggleHistoryPanel(false);
  });
  document.getElementById('btn-clear-history').addEventListener('click', async () => {
    await clearHistory();
    renderHistoryList([]);
  });
}

async function toggleHistoryPanel(show) {
  if (show) {
    historyPanel.style.display = 'flex';
    const history = await loadHistory();
    renderHistoryList(history);
  } else {
    historyPanel.style.display = 'none';
  }
}

function renderHistoryList(history) {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No recent queries</p>';
    return;
  }
  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-prompt">${escapeHtml(truncate(entry.prompt, 90))}</div>
      <div class="history-meta">
        <span>${escapeHtml(entry.model || '')}</span>
        <span>${formatRelativeTime(entry.timestamp)}</span>
      </div>`;
    item.addEventListener('click', () => {
      loadHistoryEntry(entry);
      toggleHistoryPanel(false);
    });
    historyList.appendChild(item);
  });
}

function loadHistoryEntry(entry) {
  state.conversation = [
    { role: 'user',      content: entry.prompt },
    { role: 'assistant', content: entry.answer  }
  ];
  conversationEl.innerHTML = '';
  appendUserBubble(entry.prompt);
  // Render answer as finalized bubble
  const bubbleMsg = document.createElement('div');
  bubbleMsg.className = 'message message-assistant';
  bubbleMsg.innerHTML = `
    <div class="bubble-assistant">
      <div class="response-text">${escapeHtml(entry.answer)}</div>
    </div>`;
  const actions = document.createElement('div');
  actions.className = 'bubble-actions';
  actions.innerHTML = `<button class="action-btn copy-btn" title="Copy">${ICON_COPY} Copy</button>`;
  bubbleMsg.querySelector('.bubble-assistant').appendChild(actions);
  actions.querySelector('.copy-btn').addEventListener('click', e => {
    copyToClipboard(entry.answer, e.currentTarget);
  });
  conversationEl.appendChild(bubbleMsg);
  scrollToBottom();
}

// ── Clipboard ─────────────────────────────────────────────────────────────────

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Fallback
    const ta = Object.assign(document.createElement('textarea'), {
      value: text, style: 'position:fixed;opacity:0'
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  btn.innerHTML = `${ICON_CHECK} Copied!`;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = `${ICON_COPY} Copy`;
    btn.classList.remove('copied');
  }, 2000);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scrollToBottom() {
  conversationEl.scrollTop = conversationEl.scrollHeight;
}
