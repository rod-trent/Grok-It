import {
  STORAGE_KEY_API_KEY, STORAGE_KEY_MODEL, STORAGE_KEY_TEMPERATURE,
  STORAGE_KEY_MAX_TOKENS, STORAGE_KEY_SYSTEM_PROMPT, STORAGE_KEY_CONTEXT_AWARE,
  STORAGE_KEY_AVAIL_MODELS,
  DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT,
  XAI_CHAT_ENDPOINT, XAI_MODELS_ENDPOINT,
  CONTEXT_MENU_ID, SESSION_KEY_PROMPT, SESSION_KEY_PAGE_CONTEXT,
  MSG_STREAM_CHUNK, MSG_STREAM_DONE, MSG_STREAM_ERROR
} from './constants.js';
import { saveHistoryEntry } from './history.js';

// ── Settings ────────────────────────────────────────────────────────────────

async function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get([
      STORAGE_KEY_API_KEY, STORAGE_KEY_MODEL, STORAGE_KEY_TEMPERATURE,
      STORAGE_KEY_MAX_TOKENS, STORAGE_KEY_SYSTEM_PROMPT, STORAGE_KEY_CONTEXT_AWARE
    ], data => {
      resolve({
        apiKey:        (data[STORAGE_KEY_API_KEY] || "").trim(),
        model:         data[STORAGE_KEY_MODEL]        || DEFAULT_MODEL,
        temperature:   data[STORAGE_KEY_TEMPERATURE]  ?? DEFAULT_TEMPERATURE,
        maxTokens:     data[STORAGE_KEY_MAX_TOKENS]   ?? DEFAULT_MAX_TOKENS,
        systemPrompt:  data[STORAGE_KEY_SYSTEM_PROMPT] || DEFAULT_SYSTEM_PROMPT,
        contextAware:  data[STORAGE_KEY_CONTEXT_AWARE] !== false, // default true
      });
    });
  });
}

// ── Model discovery ──────────────────────────────────────────────────────────

export async function discoverModels(apiKey) {
  if (!apiKey) return [];
  let res;
  try {
    res = await fetch(XAI_MODELS_ENDPOINT, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
  } catch (err) {
    console.warn("[Grok-it] discoverModels network error:", err.message);
    return [];
  }
  if (!res.ok) {
    console.warn("[Grok-it] discoverModels HTTP error:", res.status);
    return [];
  }
  const json = await res.json();
  const models = (json.data || []).map(m => m.id).filter(Boolean);
  if (models.length > 0) {
    chrome.storage.local.set({ [STORAGE_KEY_AVAIL_MODELS]: models });
    const stored = await new Promise(r =>
      chrome.storage.sync.get(STORAGE_KEY_MODEL, d => r(d[STORAGE_KEY_MODEL]))
    );
    if (!stored) {
      chrome.storage.sync.set({ [STORAGE_KEY_MODEL]: models[0] });
    }
  }
  return models;
}

// ── Extension lifecycle ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Grok-it",
    contexts: ["selection"]
  });
  const settings = await loadSettings();
  if (settings.apiKey) discoverModels(settings.apiKey);
});

// ── Context menu → popup handoff ─────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) return;
  const pageContext = {
    url:   tab?.url   || "",
    title: tab?.title || ""
  };
  chrome.storage.session.set({
    [SESSION_KEY_PROMPT]:       info.selectionText.trim(),
    [SESSION_KEY_PAGE_CONTEXT]: pageContext
  });
  chrome.action.openPopup();
});

// ── Streaming via long-lived port ─────────────────────────────────────────────

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "grok-stream") return;

  let activeReader = null;

  port.onDisconnect.addListener(() => {
    if (activeReader) {
      activeReader.cancel().catch(() => {});
      activeReader = null;
    }
  });

  port.onMessage.addListener(async msg => {
    const settings = await loadSettings();

    if (!settings.apiKey) {
      port.postMessage({ type: MSG_STREAM_ERROR, error: "API key missing – open Options and paste it", code: "NO_KEY" });
      return;
    }

    let systemContent = settings.systemPrompt;
    if (settings.contextAware && msg.pageContext?.url) {
      systemContent += `\n\nPage context – Title: "${msg.pageContext.title}" | URL: ${msg.pageContext.url}`;
    }

    const messages = msg.messages || [{ role: "user", content: msg.prompt }];

    let res;
    try {
      res = await fetch(XAI_CHAT_ENDPOINT, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey}`,
          "Content-Type":  "application/json"
        },
        body: JSON.stringify({
          model:       settings.model,
          messages:    [{ role: "system", content: systemContent }, ...messages],
          temperature: settings.temperature,
          max_tokens:  settings.maxTokens,
          stream:      true
        })
      });
    } catch (err) {
      port.postMessage({ type: MSG_STREAM_ERROR, error: `Network error: ${err.message}`, code: "NETWORK_ERROR" });
      return;
    }

    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).error?.message || ""; } catch (_) {}
      port.postMessage({
        type:  MSG_STREAM_ERROR,
        error: `API error ${res.status}${detail ? ": " + detail : ""}`,
        code:  "API_ERROR",
        status: res.status
      });
      return;
    }

    const reader = res.body.getReader();
    activeReader = reader;
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const text = parsed.choices?.[0]?.delta?.content || "";
            if (text) {
              fullText += text;
              port.postMessage({ type: MSG_STREAM_CHUNK, chunk: text });
            }
          } catch (_) { /* malformed SSE line, skip */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        port.postMessage({ type: MSG_STREAM_ERROR, error: `Stream error: ${err.message}`, code: "STREAM_ERROR" });
      }
      return;
    } finally {
      activeReader = null;
    }

    // Persist to history
    await saveHistoryEntry({
      id:        crypto.randomUUID(),
      prompt:    messages[messages.length - 1].content,
      answer:    fullText,
      model:     settings.model,
      pageUrl:   msg.pageContext?.url   || "",
      pageTitle: msg.pageContext?.title || "",
      timestamp: Date.now()
    });

    port.postMessage({ type: MSG_STREAM_DONE, fullText, model: settings.model });
  });
});
