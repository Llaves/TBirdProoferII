# Thunderbird Proofreader Extension — Multi-Provider Spec

## Overview

Extend the existing Gemini Proofreader Thunderbird add-on to support multiple LLM providers.
The initial expansion adds **OpenRouter** support alongside the existing direct Gemini integration.
OpenRouter is a routing service that provides access to models from many vendors (Anthropic, Google,
Meta, Mistral, etc.) through a single OpenAI-compatible API. The user selects a provider and
specifies a model name in the options page. Each provider has its own stored API key.

---

## Goals

- Support Gemini (direct Google API) and OpenRouter side by side.
- Allow the user to type any model name, so new models work without extension updates.
- Store a separate API key per provider.
- Prompts are shared across providers — no per-provider prompt lists.
- Minimal UI disruption — the options page gains a provider section; everything else stays the same.

---

## Files Affected

| File | Change |
|---|---|
| `manifest.json` | Rename extension to "LLM Proofreader"; bump version to 2.0 |
| `config.js` | Replace single provider constant with a providers config object |
| `options.html` | Add provider selector, model name field, per-provider key management |
| `options.js` | Save/load provider, model, and both API keys; wire new UI elements |
| `background_gemini.js` | Rename to `background.js`; add OpenRouter call path; read provider/model from storage |
| `view_key.html` / `view_key.js` | Show which provider's key is being viewed; accept a `?provider=` query param |

`add_prompt.*`, `manage_prompts.*` — **no changes required**.

---

## Storage Schema

All data lives in `browser.storage.local`. Keys:

| Key | Type | Description |
|---|---|---|
| `provider` | `"gemini"` \| `"openrouter"` | Currently active provider |
| `model` | string | Model name for the active provider (e.g. `gemini-2.5-flash`, `anthropic/claude-sonnet-4-5`) |
| `geminiApiKey` | string | Google Gemini API key |
| `openrouterApiKey` | string | OpenRouter API key |
| `savedPrompts` | string[] | Existing prompt list — unchanged |
| `selectedPromptIndex` | number | Existing selection — unchanged |

> **Migration note:** The existing `apiKey` key (used by v1) should be read on first run and
> migrated to `geminiApiKey`, then removed, so users do not lose their stored key on upgrade.

---

## config.js

Replace the single `provider` string with a structured config that the background script and
options page can both import.

```js
const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    // Model name and API key go in the URL; request/response shape is Gemini-specific.
    endpoint: (apiKey, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "anthropic/claude-sonnet-4-5",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    // Model names use vendor/model-name format, e.g.:
    //   anthropic/claude-sonnet-4-5
    //   google/gemini-2.5-flash
    //   meta-llama/llama-3.1-8b-instruct
    // Full list: https://openrouter.ai/models
  },
};
```

---

## options.html Changes

Add a new **Provider Settings** section above the existing API Key Settings section. Structure:

```
[ Provider Settings ]
  Radio buttons:  ○ Google Gemini   ○ OpenRouter

  Model name:     [text input — editable, pre-filled from storage]
                  hint text below field:
                    Gemini:     e.g. gemini-2.5-flash
                    OpenRouter: e.g. anthropic/claude-sonnet-4-5

[ API Key Settings ]
  Gemini API Key:     [password input]   [Save]  [View]  [Remove]
  OpenRouter API Key: [password input]   [Save]  [View]  [Remove]

[ Prompt Settings ]           ← unchanged
```

The model name hint line updates when the provider radio changes to show a relevant example for
the selected provider. Label text on the key inputs uses the provider's human-readable name so
it is obvious which key is which.

---

## options.js Changes

### On DOMContentLoaded

1. Load `provider`, `model`, `geminiApiKey`, `openrouterApiKey` from storage.
2. Set the provider radio to the stored value (default `"gemini"`).
3. Populate the model name input with the stored model, or the provider's `defaultModel` if none
   is stored.
4. Update the model name hint line to match the selected provider.
5. Show a status line for each key: "Key is set" / "No key set".
6. Run the v1 migration: if `apiKey` exists in storage and `geminiApiKey` does not, copy the value
   to `geminiApiKey` and remove `apiKey`.

### Provider / Model Save

- Changing the provider radio immediately saves `provider` to storage, updates the hint line, and
  updates the model input to the new provider's `defaultModel` (only if the model field is
  currently blank or still showing the old provider's default — do not overwrite a custom value
  the user typed).
- A **Save Model** button (or auto-save on blur) writes the `model` value to storage.

### API Key Buttons (one set per provider)

Each provider row has independent **Save**, **View**, and **Remove** buttons that operate on that
provider's key (`geminiApiKey` or `openrouterApiKey`).

The **View** button opens `view_key.html?provider=gemini` or `view_key.html?provider=openrouter`
so the popup can display the correct key and label.

---

## view_key.html / view_key.js Changes

- Read the `provider` query parameter from `location.search`.
- Load the matching key (`geminiApiKey` or `openrouterApiKey`) from storage.
- Display the provider's human-readable label as the heading (e.g. "Your Google Gemini API Key" or "Your OpenRouter API Key").
- Fall back to showing both keys (one per line, labeled) if no query param is present.

---

## background.js Changes

Rename `background_gemini.js` → `background.js` and update `manifest.json` accordingly.

### Startup / Key Retrieval

```
async function getActiveConfig()
  reads: provider, model, geminiApiKey / openrouterApiKey
  returns: { provider, model, apiKey }
    - apiKey = the key for the active provider
```

If `apiKey` is missing, open the settings popup as today.

### Waiting Popup

Update the "Waiting for response from…" message to include the model name dynamically:

```
Waiting for response from {model}...
```

### API Call Dispatch

After building `textToProof` and `selected_prompt` (logic unchanged), call a dispatcher:

```
if (provider === "gemini")     → callGemini(apiKey, model, selectedPrompt, textToProof)
if (provider === "openrouter") → callOpenRouter(apiKey, model, selectedPrompt, textToProof)
```

Each function returns the response text string or throws on error.

#### callGemini(apiKey, model, selectedPrompt, textToProof)

Identical to the current implementation, but with the model name interpolated into the endpoint
URL rather than hardcoded. The prompt and text are concatenated as today (`"${selectedPrompt}\n\n${textToProof}"`).

```
endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
method:   POST
headers:  Content-Type: application/json
body:
  {
    contents: [{
      parts: [{ text: "{selectedPrompt}\n\n{textToProof}" }]
    }]
  }
```

Response extraction path (unchanged):
```
data.candidates[0].content.parts[0].text
```

#### callOpenRouter(apiKey, model, selectedPrompt, textToProof)

The endpoint is fixed — no base URL configuration required.

```
endpoint: https://openrouter.ai/api/v1/chat/completions
method:   POST
headers:  Content-Type: application/json
          Authorization: Bearer {apiKey}
          HTTP-Referer: https://github.com/your-repo/llm-proofreader
          X-Title: LLM Proofreader
body:
  {
    model: "{model}",
    messages: [
      { role: "system", content: "{selectedPrompt}" },
      { role: "user",   content: "{textToProof}" }
    ]
  }
```

> The `HTTP-Referer` and `X-Title` headers are recommended by OpenRouter to identify the
> calling application. `HTTP-Referer` can be any stable identifier (a repo URL or extension ID);
> it does not need to be a live URL.

Response extraction path:
```
data.choices[0].message.content
```

Error handling mirrors the existing Gemini error path: check `response.ok`, extract
`error.message` from the JSON body if available, display via `showErrorPopup`.

---

## manifest.json Changes

```json
{
  "name": "LLM Proofreader",
  "version": "2.0",
  "background": {
    "scripts": ["background.js"]
  }
}
```

Add `background.js` to `web_accessible_resources` if needed by the new structure.

---

## Error Handling

No new error categories are introduced. Existing patterns apply to both providers:

- Missing API key → open settings popup.
- Non-OK HTTP response → `showErrorPopup` with status code and message from response body.
- Network/fetch failure → `showErrorPopup` with the caught error message.
- Waiting popup is always closed in the `finally` block regardless of outcome.

---

## Out of Scope for This Version

- Per-provider prompt lists (prompts remain shared across providers).
- Streaming responses.
- Automatic model discovery / dropdown population via API.
- Support for providers other than Gemini and OpenRouter.
