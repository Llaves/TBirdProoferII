// background.js

// Returns the active provider config and API key from storage.
// Handles v1 migration: if the old "apiKey" key exists and "geminiApiKey" does not,
// copy it over and remove the old key so users don't lose their stored key on upgrade.
async function getActiveConfig() {
  const stored = await browser.storage.local.get([
    "provider",
    "gemini_model",
    "openrouter_model",
    "geminiApiKey",
    "openrouterApiKey",
    "apiKey", // v1 legacy key
  ]);

  // v1 migration
  if (stored.apiKey && !stored.geminiApiKey) {
    await browser.storage.local.set({ geminiApiKey: stored.apiKey });
    await browser.storage.local.remove("apiKey");
    stored.geminiApiKey = stored.apiKey;
  }

  const provider = stored.provider || "gemini";
  const modelKey = provider + "_model";
  const defaultModel = provider === "gemini" ? "gemini-2.5-flash" : "anthropic/claude-sonnet-4-5";
  const model = stored[modelKey] || defaultModel;
  const apiKey = provider === "openrouter" ? stored.openrouterApiKey : stored.geminiApiKey;

  return { provider, model, apiKey };
}

// Function to open the settings popup (only if needed)
function openSettingsPopup() {
  browser.windows.create({
    url: "options.html",
    type: "popup",
    width: 500,
    height: 700
  });
}

browser.browserAction.onClicked.addListener(() => {
  openSettingsPopup();
});

// Function to decode HTML entities
function decodeHTML(html) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = html;
  return textArea.value;
}

// Function to show the suggestions popup
function showSuggestionsPopup(suggestions) {
  const blob = new Blob([
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Proofread Suggestions</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; line-height: 1.5; }
          h1 { font-size: 18px; }
          pre { white-space: pre-wrap; word-wrap: break-word; border: 1px solid #ccc; padding: 10px; background: #f9f9f9; }
        </style>
        <meta http-equiv="content-type" content="text/html,charset=utf-8" />
      </head>
      <body>
        <h1>Proofreading Suggestions</h1>
        <pre>${suggestions}</pre>
      </body>
    </html>`
  ], { type: "text/html" });

  const url = URL.createObjectURL(blob);
  browser.windows.create({
    url,
    type: "popup",
    width: 1000,
    height: 1000
  });
}

// Function to show the waiting popup, including the active model name
function showWaitingPopup(isFullMessage, model) {
  const proofingMessage = isFullMessage ? "Proofing message" : "Proofing selection";

  const blob = new Blob([
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Waiting...</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          h1 { font-size: 18px; color: #555; }
          p { font-size: 16px; color: #333; }
        </style>
      </head>
      <body>
        <p>${proofingMessage}</p>
        <h1>Waiting for response from ${model}...</h1>
      </body>
    </html>`
  ], { type: "text/html" });

  const url = URL.createObjectURL(blob);
  return browser.windows.create({
    url,
    type: "popup",
    width: 400,
    height: 250
  }).then(windowInfo => windowInfo.id);
}

// Function to show the error popup
function showErrorPopup(message) {
  const blob = new Blob([
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; color: #b00; }
          h1 { font-size: 20px; margin-bottom: 10px; }
          p { font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p>${message}</p>
      </body>
    </html>`
  ], { type: "text/html" });

  const url = URL.createObjectURL(blob);
  browser.windows.create({
    url,
    type: "popup",
    width: 400,
    height: 200
  });
}

// Calls the Google Gemini API and returns the response text.
// Throws on non-OK HTTP responses or network failures.
async function callGemini(apiKey, model, selectedPrompt, textToProof) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{ text: `${selectedPrompt}\n\n${textToProof}` }]
    }]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`Gemini API Error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  return data.candidates[0].content.parts[0].text;
}

// Calls the OpenRouter API and returns the response text.
// Throws on non-OK HTTP responses or network failures.
async function callOpenRouter(apiKey, model, selectedPrompt, textToProof) {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const payload = {
    model,
    messages: [
      { role: "system", content: selectedPrompt },
      { role: "user",   content: textToProof },
    ],
  };

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
    xhr.setRequestHeader("HTTP-Referer", "https://github.com/your-repo/llm-proofreader");
    xhr.setRequestHeader("X-Title", "LLM Proofreader");

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        return reject(new Error("OpenRouter returned non-JSON response"));
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const msg = data?.error?.message || xhr.statusText;
        return reject(new Error(`OpenRouter API Error: ${xhr.status} - ${msg}`));
      }
      if (data.error) {
        return reject(new Error(`OpenRouter API Error: ${data.error.message}`));
      }

      resolve(data.choices[0].message.content);
    };

    xhr.onerror = () => reject(new Error("Network error contacting OpenRouter"));
    xhr.send(JSON.stringify(payload));
  });
}

// Listener for compose action clicks
messenger.composeAction.onClicked.addListener(async (tab) => {
  let waitingPopupId = null;
  try {
    const { provider, model, apiKey } = await getActiveConfig();

    if (!apiKey) {
      console.error("API key not set. Opening settings...");
      openSettingsPopup();
      return;
    }

    const composeDetails = await messenger.compose.getComposeDetails(tab.id);
    let textToProof = composeDetails.body;
    let isFullMessage = true;

    // Try to get the selected text
    try {
      const results = await messenger.tabs.executeScript(tab.id, {
        code: `(function() {
          const selection = window.getSelection().toString();
          return selection.trim();
        })();`
      });

      if (results && results[0] && results[0].length > 0) {
        textToProof = results[0];
        isFullMessage = false;
      }
    } catch (error) {
      console.warn("Error getting selection. Using full message.", error);
    }

    // Get saved prompts
    const { savedPrompts = [], selectedPromptIndex = -1 } = await browser.storage.local.get(["savedPrompts", "selectedPromptIndex"]);
    const selected_prompt = savedPrompts[selectedPromptIndex] || "Correct grammar, spelling, punctuation, and style.";

    // Show waiting popup with dynamic model name
    waitingPopupId = await showWaitingPopup(isFullMessage, model);

    try {
      let suggestions;

      if (provider === "gemini") {
        suggestions = await callGemini(apiKey, model, selected_prompt, textToProof);
      } else if (provider === "openrouter") {
        suggestions = await callOpenRouter(apiKey, model, selected_prompt, textToProof);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const decodedSuggestions = decodeHTML(suggestions);
      showSuggestionsPopup(decodedSuggestions);

    } catch (apiError) {
      console.error("Error contacting API:", apiError);
      showErrorPopup(apiError.message || `Unexpected error: ${apiError}`);
    } finally {
      if (waitingPopupId) {
        await browser.windows.remove(waitingPopupId);
      }
    }
  } catch (overallError) {
    console.error("Overall error:", overallError);
    showErrorPopup(`An unexpected error occurred: ${overallError.message}`);
  }
});
