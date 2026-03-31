import {
  STORAGE_KEY_API_KEY, STORAGE_KEY_MODEL, STORAGE_KEY_TEMPERATURE,
  STORAGE_KEY_MAX_TOKENS, STORAGE_KEY_SYSTEM_PROMPT, STORAGE_KEY_CONTEXT_AWARE,
  STORAGE_KEY_AVAIL_MODELS,
  DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT,
  XAI_MODELS_ENDPOINT
} from './constants.js';

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ── Load all settings on open ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const data = await new Promise(resolve =>
    chrome.storage.sync.get([
      STORAGE_KEY_API_KEY, STORAGE_KEY_MODEL, STORAGE_KEY_TEMPERATURE,
      STORAGE_KEY_MAX_TOKENS, STORAGE_KEY_SYSTEM_PROMPT, STORAGE_KEY_CONTEXT_AWARE
    ], resolve)
  );

  // API Key tab — just show saved indicator
  if (data[STORAGE_KEY_API_KEY]) {
    showStatus('key-status', 'A key is already saved.', 'success');
  }

  // Model tab
  const savedModel = data[STORAGE_KEY_MODEL] || DEFAULT_MODEL;
  await populateModelDropdown(savedModel);

  // Params tab
  document.getElementById('temperature').value =
    data[STORAGE_KEY_TEMPERATURE] ?? DEFAULT_TEMPERATURE;
  document.getElementById('temperature-value').textContent =
    data[STORAGE_KEY_TEMPERATURE] ?? DEFAULT_TEMPERATURE;
  document.getElementById('max-tokens').value =
    data[STORAGE_KEY_MAX_TOKENS] ?? DEFAULT_MAX_TOKENS;

  // Prompt tab
  document.getElementById('system-prompt').value =
    data[STORAGE_KEY_SYSTEM_PROMPT] || '';
  document.getElementById('context-aware').checked =
    data[STORAGE_KEY_CONTEXT_AWARE] !== false; // default true

  wireUpControls();
});

// ── Model dropdown ────────────────────────────────────────────────────────────

async function populateModelDropdown(selectedModel) {
  const local = await new Promise(resolve =>
    chrome.storage.local.get(STORAGE_KEY_AVAIL_MODELS, resolve)
  );
  const models = local[STORAGE_KEY_AVAIL_MODELS] || [selectedModel || DEFAULT_MODEL];
  const select = document.getElementById('model-select');
  select.innerHTML = '';
  models.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    if (id === selectedModel) opt.selected = true;
    select.appendChild(opt);
  });
  updateModelBadge(selectedModel);
}

function updateModelBadge(model) {
  const badge = document.getElementById('model-badge');
  const text  = document.getElementById('model-badge-text');
  if (model) {
    text.textContent = `Active: ${model}`;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── Wire up all controls ──────────────────────────────────────────────────────

function wireUpControls() {
  // ── API Key tab ──
  const keyInput = document.getElementById('key-input');

  // Show/hide toggle
  document.getElementById('toggle-key-visibility').addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  // Save key
  document.getElementById('btn-save-key').addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus('key-status', 'Please enter an API key.', 'error');
      return;
    }
    await saveToSync({ [STORAGE_KEY_API_KEY]: key });
    keyInput.value = '';
    showStatus('key-status', 'Key saved successfully.', 'success');
  });

  // Test connection
  document.getElementById('btn-test').addEventListener('click', async () => {
    const key = keyInput.value.trim() || await getSavedKey();
    if (!key) {
      showStatus('key-status', 'No API key to test — enter one above first.', 'error');
      return;
    }
    showStatus('key-status', 'Testing connection…', 'info');
    const result = await testConnection(key);
    if (result.ok) {
      showStatus('key-status', result.message, 'success');
      await populateModelDropdown(await getSavedModel());
    } else {
      showStatus('key-status', result.message, 'error');
    }
  });

  // ── Model tab ──
  document.getElementById('btn-save-model').addEventListener('click', async () => {
    const model = document.getElementById('model-select').value;
    await saveToSync({ [STORAGE_KEY_MODEL]: model });
    updateModelBadge(model);
    showStatus('model-status', `Model set to "${model}".`, 'success');
  });

  document.getElementById('btn-refresh-models').addEventListener('click', async () => {
    const key = await getSavedKey();
    if (!key) {
      showStatus('model-status', 'Save your API key first, then refresh.', 'error');
      return;
    }
    showStatus('model-status', 'Fetching available models…', 'info');
    const result = await testConnection(key);
    if (result.ok) {
      const savedModel = await getSavedModel();
      await populateModelDropdown(savedModel);
      showStatus('model-status', result.message, 'success');
    } else {
      showStatus('model-status', result.message, 'error');
    }
  });

  // ── Params tab ──
  document.getElementById('temperature').addEventListener('input', e => {
    document.getElementById('temperature-value').textContent =
      parseFloat(e.target.value).toFixed(1);
  });

  document.getElementById('btn-save-params').addEventListener('click', async () => {
    const temp   = parseFloat(document.getElementById('temperature').value);
    const tokens = parseInt(document.getElementById('max-tokens').value, 10);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      showStatus('params-status', 'Temperature must be between 0 and 2.', 'error');
      return;
    }
    if (isNaN(tokens) || tokens < 100 || tokens > 4096) {
      showStatus('params-status', 'Max tokens must be between 100 and 4096.', 'error');
      return;
    }
    await saveToSync({ [STORAGE_KEY_TEMPERATURE]: temp, [STORAGE_KEY_MAX_TOKENS]: tokens });
    showStatus('params-status', 'Parameters saved.', 'success');
  });

  // ── Prompt tab ──
  document.getElementById('btn-reset-prompt').addEventListener('click', () => {
    document.getElementById('system-prompt').value = DEFAULT_SYSTEM_PROMPT;
  });

  document.getElementById('btn-save-prompt').addEventListener('click', async () => {
    const prompt       = document.getElementById('system-prompt').value.trim();
    const contextAware = document.getElementById('context-aware').checked;
    await saveToSync({
      [STORAGE_KEY_SYSTEM_PROMPT]: prompt || DEFAULT_SYSTEM_PROMPT,
      [STORAGE_KEY_CONTEXT_AWARE]: contextAware
    });
    showStatus('prompt-status', 'Settings saved.', 'success');
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveToSync(data) {
  return new Promise(resolve => chrome.storage.sync.set(data, resolve));
}

function getSavedKey() {
  return new Promise(resolve =>
    chrome.storage.sync.get(STORAGE_KEY_API_KEY, d =>
      resolve((d[STORAGE_KEY_API_KEY] || '').trim())
    )
  );
}

function getSavedModel() {
  return new Promise(resolve =>
    chrome.storage.sync.get(STORAGE_KEY_MODEL, d =>
      resolve(d[STORAGE_KEY_MODEL] || DEFAULT_MODEL)
    )
  );
}

async function testConnection(apiKey) {
  try {
    const res = await fetch(XAI_MODELS_ENDPOINT, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) return { ok: false, message: `Connection failed: HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.data || []).map(m => m.id).filter(Boolean);
    chrome.storage.local.set({ [STORAGE_KEY_AVAIL_MODELS]: models });
    return { ok: true, message: `Connected — ${models.length} model${models.length !== 1 ? 's' : ''} available.` };
  } catch (err) {
    return { ok: false, message: `Network error: ${err.message}` };
  }
}

function showStatus(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `status ${type}`;
  // Auto-dismiss success messages
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 4000);
  }
}
