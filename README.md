# Grok-it

A Chrome extension that lets you right-click any selected text and instantly get an answer from xAI's Grok — without leaving your browser.

![Grok-it!](https://github.com/rod-trent/Grok-It/blob/main/Images/grokit.jpg)

## Features

- **Instant answers** — right-click any selected text → Grok-it answers in a popup
- **Streaming responses** — see the answer appear word-by-word as it's generated
- **Multi-turn conversation** — ask follow-up questions directly in the popup
- **Copy & Regenerate** — copy any response to clipboard or regenerate with one click
- **Query history** — last 20 queries stored locally, reload any past conversation
- **Model selector** — choose from all available xAI models
- **Configurable parameters** — adjust temperature and max tokens to your taste
- **Custom system prompt** — tell Grok how you want it to behave
- **Context-aware prompts** — optionally include page URL and title for more relevant answers

## Installation

### Prerequisites
- Google Chrome 116 or newer
- A free xAI API key from [console.x.ai](https://console.x.ai)

### Steps

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `Grok-it` folder
6. The Grok-it icon will appear in your toolbar

## Getting Your API Key

1. Go to [console.x.ai](https://console.x.ai) and sign in
2. Navigate to **API Keys** in the left sidebar
3. Click **Create API Key**, copy the key
4. Open Grok-it settings (click the extension icon → gear icon) and paste it in the **API Key** tab

## Usage

### Quick answer
1. Select any text on a webpage
2. Right-click and choose **Grok-it**
3. The answer streams into the popup automatically

### Follow-up questions
After receiving an answer, type a follow-up in the input box at the bottom of the popup and press **Enter** (or click Send).

### Query history
Click the **clock icon** in the popup header to view your last 20 queries. Click any entry to reload that conversation.

## Settings

Open settings by clicking the **gear icon** in the popup, or right-clicking the extension icon → **Options**.

| Tab | What you can configure |
|---|---|
| **API Key** | Paste, save, and test your xAI API key |
| **Model** | Select which Grok model to use; refresh the list from the API |
| **Parameters** | Temperature (0–2) and max tokens (100–4096) |
| **Prompt** | Custom system prompt; toggle page context awareness |

## Privacy

- Your API key is stored in Chrome's sync storage and is only ever sent to `api.x.ai`
- Query history is stored in local browser storage and never leaves your device
- Page context (URL/title) is only included in API calls when **Context Awareness** is enabled in Settings → Prompt

## Development

After editing any file, go to `chrome://extensions` and click the **refresh icon** on the Grok-it card to reload the extension.

## License

MIT
