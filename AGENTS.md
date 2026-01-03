# Repository Guidelines

## Project Structure & Module Organization

The extension is fully contained in the repository root. `manifest.json` defines the Chrome extension scaffold, `background.js` hosts the AI request proxy, `content.js` injects the UI into visited pages, and `options.html` plus `options.js` provide the configuration popup. The `icons/` directory is reserved for browser action artwork (currently empty but required by Chrome for packaging). There are no separate test or asset folders; all runtime logic is implemented in plain JavaScript files at the root.

## Build, Test, and Development Commands

```bash
# Load the unpacked extension in Chrome
chrome --load-extension="$(pwd)"

# Package for distribution (zip contents of repo root)
zip -r ai_explainer_extension.zip manifest.json *.js *.html icons/

# There is no automated test suite; exercise functionality via Chrome DevTools
```

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces, no tabs (see `background.js` and `content.js`).
- **File naming**: Lowercase words separated by dots describing their role (e.g., `options.html`, `content.js`).
- **Function/variable naming**: camelCase for functions and variables (`handleAIRequest`, `selectedText`); UPPER_SNAKE_CASE is not used anywhere.
- **Linting**: No automated linting configured; follow Chrome extension examples and keep files ES2020-compatible.

## Testing Guidelines

- **Framework**: None; all verification is manual.
- **Test files**: Not present; rely on browser-based smoke tests.
- **Running tests**: Deploy via `chrome://extensions`, enable "Developer mode", click "Load unpacked", point at this folder, then interact with arbitrary webpages.
- **Coverage**: Not enforced—verify both Gemini and OpenAI providers, including failure states.

## Commit & Pull Request Guidelines

- **Commit format**: Not defined by tooling; follow clear, imperative messages (e.g., `Add OpenAI model selector to options page`).
- **PR process**: Use descriptive descriptions detailing manual verification steps (Gemini explain, OpenAI chat).
- **Branch naming**: Not prescribed; prefer topical branches such as `feature/openai-chat` or `fix/context-menu` for clarity.

---

# Repository Tour

## 🎯 What This Repository Does

AI Text Explainer & Chat is a lightweight Chrome extension that lets users highlight text on any page, request an instant explanation, and continue chatting with either Google Gemini or OpenAI models directly in-page.

**Key responsibilities:**
- Detect text selections and render an inline explainer/chat modal.
- Proxy explain/chat requests through the extension background to Gemini or OpenAI APIs.
- Store provider credentials and preferences via the options UI.

---

## 🏗️ Architecture Overview

```
[User highlights text]
        ↓
  content.js (UI overlay)
        ↓ message
  background.js (service worker)
        ↓ HTTPS fetch
Gemini / OpenAI APIs
        ↑
Rendered explanation/chat
```

### System Context

```
[Browser user] → [content.js overlay] → [background.js] → [Gemini/OpenAI]
                                 ↓
                           [options.html]
```

### Key Components
- **manifest.json** – Declares permissions (`storage`, `contextMenus`), host permissions for Gemini/OpenAI endpoints, and wires service worker/content script relationships.
- **background.js** – Handles runtime messages, selects provider based on synced settings, and performs `fetch` calls to Gemini (`generateContent`) or OpenAI (`chat/completions`).
- **content.js** – Tracks user selections, renders the floating "Explain" button plus modal via shadow DOM, and exchanges messages with the background script for explain/chat flows.
- **options.html / options.js** – Chrome options UI that saves provider choice, API keys, and OpenAI model via `chrome.storage.sync`.

### Data Flow
1. User highlights text; `content.js` shows the "Explain" button and opens the modal.
2. `content.js` sends `{ action: 'explain', text }` to the background worker.
3. `background.js` reads provider settings, calls Gemini or OpenAI via HTTPS, and returns `{ result | error }`.
4. `content.js` renders the AI response; subsequent chat messages reuse the selected context.

---

## 📁 Project Structure [Partial Directory Tree]

```
AI_Explainer_Extension/
├── background.js        # Background service worker forwarding AI calls
├── content.js           # Injected UI/controller for explanation & chat
├── manifest.json        # Chrome extension manifest (v3)
├── options.html         # Options & popup UI shell
├── options.js           # Logic for saving provider credentials
└── icons/               # Placeholder for action/extension icons
```

### Key Files to Know

| File | Purpose | When You'd Touch It |
|------|---------|---------------------|
| `manifest.json` | Declares permissions, scripts, and host access | Adding new capabilities (e.g., context menus, additional matches) |
| `background.js` | Chooses provider, forwards API calls, handles storage defaults | Integrating new LLM providers or changing prompt templates |
| `content.js` | Handles selection detection, modal UI, and user-chat loop | Adjusting UX, adding more controls, or altering formatting |
| `options.html` | Renders configuration form for credentials | Updating layout, adding new provider fields |
| `options.js` | Persists settings via `chrome.storage.sync` | Changing defaults, validation, or storage schema |
| `icons/` | Holds extension artwork assets | Supplying required icon sizes before publishing |

---

## 🔧 Technology Stack

### Core Technologies
- **Language:** Vanilla JavaScript (ES2020) – maximizes Chrome compatibility without build tooling.
- **Framework:** Chrome Extensions Platform (Manifest V3) – leverages service workers, options UI, and content scripts.
- **Database:** Chrome Storage Sync – stores provider selection and API keys securely within the browser profile.
- **Web Server:** n/a; all network calls originate from the background service worker via `fetch`.

### Key Libraries
- **Chrome Extension APIs** – messaging, storage, and service worker lifecycle management.
- **Fetch API** – performs HTTPS requests to Gemini/OpenAI endpoints.

### Development Tools
- None required beyond Chrome/Chromium; the repo is build-tool-free.

---

## 🌐 External Dependencies

### Required Services
- **Google Gemini Generative Language API** – Used via `gemini-1.5-flash:generateContent` for explain/chat responses; requires API key stored in sync storage.
- **OpenAI Chat Completions API** – Alternate provider for chat/explain with configurable model; requires API key and model name.

### Optional Integrations
- None documented beyond the two primary providers.

---

### Environment Variables

Chrome extensions cannot read shell environment variables; API keys are entered through the options UI and persisted using `chrome.storage.sync`.

---

## 🔄 Common Workflows

### Explain Selection
1. Highlight text on any webpage.
2. "🔍 Explain" chip appears; clicking opens the modal.
3. Modal shows the query and waits for the background response, then displays formatted explanation.
**Code path:** `content.js → chrome.runtime.sendMessage → background.js → Gemini/OpenAI → content.js`.

### Follow-up Chat
1. After initial explanation, type a new question in the modal input.
2. Message includes the original selection as context and is sent to the background worker.
3. Response is appended to the chat area; multiple turns accumulate inline.
**Code path:** `content.js sendChat()` → `background.js` → selected provider → `content.js` display.

---

## 📈 Performance & Scale

- **Caching:** None; each chat/explain call hits the provider directly. Consider caching identical prompts if rate limits become an issue.
- **Monitoring:** Rely on Chrome DevTools console logs and provider dashboards for quota/error tracking.

---

## 🚨 Things to Be Careful About

### 🔒 Security Considerations
- **Authentication:** API keys reside in Chrome storage; ensure `options.js` never logs them. Users should prefer sync storage only on trusted profiles.
- **Data handling:** Highlighted text is sent to external LLMs; communicate this clearly in store listings and avoid transmitting sensitive data.
- **External APIs:** Respect Gemini/OpenAI rate limits and provide user-facing error messaging (already surfaced via `response.error`).

*Updated at: 2025-02-14 UTC*
