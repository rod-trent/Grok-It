# Privacy Policy for Grok-it

**Last updated:** March 31, 2025

This Privacy Policy describes how the Grok-it Chrome/Edge browser extension ("Grok-it", "the extension", "we") handles your information. Grok-it is developed and maintained by Rod Trent.

---

## Summary

- Grok-it does **not** collect, transmit, or store any personal data on any server controlled by the developer.
- Your API key and query history never leave your browser except for direct, encrypted communication with xAI's API at `https://api.x.ai`.
- Nothing is sold. Nothing is shared with advertisers. Nothing is tracked.

---

## What Data Grok-it Stores

### 1. xAI API Key
- **Where:** Chrome's `storage.sync`, which is encrypted and managed entirely by Google/Microsoft within your browser profile.
- **Why:** Required to authenticate requests to the xAI API on your behalf.
- **Who can access it:** Only the extension itself, running locally in your browser. The key is transmitted solely to `https://api.x.ai` over HTTPS when you make a query.

### 2. Query History
- **Where:** Chrome's `storage.local`, which is stored only on your local device and is never synced to any external server.
- **What is stored:** The text you selected (prompt), the response from Grok, the model name used, the page URL and title (if Context Awareness is enabled), and a timestamp.
- **Why:** So you can review and resume past conversations within the extension.
- **Retention:** Capped at your 20 most recent queries. You can delete the entire history at any time from the History panel inside the extension.

### 3. Extension Settings
- **Where:** Chrome's `storage.sync`, managed by your browser profile.
- **What is stored:** Your chosen model, temperature, max tokens, system prompt, context awareness preference, and theme preference.
- **Why:** To restore your preferences across browser sessions and devices.

---

## What Data Grok-it Sends Over the Network

When you submit a query, Grok-it sends the following directly to `https://api.x.ai` (xAI's API):

- The text you selected or typed
- Your conversation history for the current session (to support multi-turn conversation)
- Your system prompt setting
- The page URL and title of the active tab — **only if** you have enabled Context Awareness in Settings

**No data is sent to any server operated by the developer of Grok-it.** All network communication goes directly from your browser to xAI's API.

xAI's handling of data submitted to their API is governed by [xAI's own Privacy Policy](https://x.ai/legal/privacy-policy) and [Terms of Service](https://x.ai/legal/terms-of-service).

---

## What Grok-it Does NOT Do

- Does **not** collect browsing history beyond what you explicitly select and submit.
- Does **not** run any analytics or telemetry.
- Does **not** display advertisements.
- Does **not** sell, rent, or share your data with any third party other than xAI (solely to process your queries).
- Does **not** use cookies or any tracking technologies.
- Does **not** access any web page content beyond the text you explicitly select.
- Does **not** store your API key anywhere outside your own browser's encrypted storage.

---

## Permissions Explained

Grok-it requests the following Chrome permissions:

| Permission | Why it is needed |
|---|---|
| `contextMenus` | To add the "Grok-it" option to the right-click menu when you select text |
| `storage` | To save your API key, settings, and query history locally in your browser |
| `activeTab` | To read the URL and title of the current tab for context-aware prompts (only when you trigger the extension) |
| `tabs` | To read the page title and URL when context awareness is enabled |
| `host_permissions: https://api.x.ai/*` | To make API calls directly to xAI's servers |

---

## Your Controls

- **Delete your API key:** Open Settings → API Key tab, clear the field, and save an empty value, or remove the extension entirely.
- **Clear query history:** Open the extension popup → click the clock icon → click "Clear all."
- **Disable context awareness:** Open Settings → Prompt tab → toggle off "Include page URL and title in prompts."
- **Remove all data:** Uninstalling the extension removes all data stored by Grok-it from your browser.

---

## Children's Privacy

Grok-it is not directed at children under the age of 13 and does not knowingly collect information from children.

---

## Changes to This Policy

If this policy changes materially, the "Last updated" date at the top of this page will be updated. Continued use of the extension after any changes constitutes acceptance of the updated policy.

---

## Contact

If you have questions about this privacy policy, please open an issue at [https://github.com/rod-trent/Grok-It/issues](https://github.com/rod-trent/Grok-It/issues).
