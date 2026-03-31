// API endpoints
export const XAI_BASE_URL        = "https://api.x.ai/v1";
export const XAI_MODELS_ENDPOINT = `${XAI_BASE_URL}/models`;
export const XAI_CHAT_ENDPOINT   = `${XAI_BASE_URL}/chat/completions`;

// Storage keys (chrome.storage.sync)
export const STORAGE_KEY_API_KEY        = "grokApiKey";
export const STORAGE_KEY_MODEL          = "workingModel";
export const STORAGE_KEY_TEMPERATURE    = "temperature";
export const STORAGE_KEY_MAX_TOKENS     = "maxTokens";
export const STORAGE_KEY_SYSTEM_PROMPT  = "systemPrompt";
export const STORAGE_KEY_CONTEXT_AWARE  = "contextAware";

// Storage keys (chrome.storage.local)
export const STORAGE_KEY_HISTORY        = "queryHistory";
export const STORAGE_KEY_THEME          = "theme"; // "system" | "light" | "dark"
export const STORAGE_KEY_AVAIL_MODELS   = "availableModels";

// Session storage keys
export const SESSION_KEY_PROMPT         = "grokPrompt";
export const SESSION_KEY_PAGE_CONTEXT   = "grokPageContext";

// Defaults
export const DEFAULT_MODEL          = "grok-3-mini";
export const DEFAULT_TEMPERATURE    = 0.7;
export const DEFAULT_MAX_TOKENS     = 1500;
export const DEFAULT_SYSTEM_PROMPT  =
  "You are Grok. Always respond in clear, natural English. Never use any other language.";

// Context menu
export const CONTEXT_MENU_ID = "grokIt";

// History
export const MAX_HISTORY_ITEMS = 20;

// Message actions
export const MSG_STREAM_CHUNK = "streamChunk";
export const MSG_STREAM_DONE  = "streamDone";
export const MSG_STREAM_ERROR = "streamError";
