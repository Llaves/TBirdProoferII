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

// Build the system prompt for HTML tracked-changes proofreading.
function buildHtmlProofPrompt(userStyleInstruction, mode = "diff") {
  if (mode === "diff") {
    return `You are a proofreading assistant.The user will send you an HTML email fragment.

Task:
   1. ${userStyleInstruction}
   2. For every correction needed, identify the specific sentence containing the error.
   3. Return ONLY a list of the corrected sentences. Do NOT return the full HTML fragment or any surrounding code.
Formatting Rules:
    For each correction, output the sentence containing the change, with the correction marked using your markup rules:
        Removed text: <span style="color:#cc0000;text-decoration:line-through;">old word</span>
        Added/replacement text: <span style="color:#007700;text-decoration:underline;">new word</span>
        If replacing: Use the format: <span style="color:#007700;text-decoration:underline;">new</span><span style="color:inherit;text-decoration:none;"> </span><span style="color:#cc0000;font-style:normal;text-decoration:line-through;">old</span>
        Ensure each sentence is on its own line and wrapped in its own <p> tag.
    Do NOT include any preamble, commentary, or markdown code fences.`
  }
 return `You are a proofreading assistant. The user will send you an HTML email fragment.

Your task:
1. Apply the following style/grammar instructions to the content: ${userStyleInstruction}
2. Return ONLY the corrected HTML fragment with tracked changes marked up as follows:
   - Removed text: wrap in <span style="color:#cc0000;text-decoration:line-through;">...</span>
   - Added/replacement text: wrap in <span style="color:#007700;text-decoration:underline;">...</span>
   - Unchanged text and HTML structure: leave exactly as-is

Rules you MUST follow:
- Do NOT wrap your response in markdown code fences or any other wrapper.
- Do NOT add any explanation, preamble, or commentary — output only the HTML fragment.
- Preserve all existing HTML tags, attributes, and structure exactly.
- Only modify the text nodes where corrections are needed.
- For a replacement, ALWAYS emit the correction first, then the deleted original:
  <span style="color:#007700;text-decoration:underline;">new word</span><span style="color:#cc0000;font-style:normal;text-decoration:line-through;">old word</span>
- Between the two spans, always insert a reset span to prevent style bleed:
  <span style="color:inherit;text-decoration:none;"> </span>
- If text is only deleted (no replacement), emit:
  <span style="color:#cc0000;text-decoration:line-through;">deleted text</span>
- If text is only inserted, emit:
  <span style="color:#007700;text-decoration:underline;">new text</span>`;

}
// Show the suggestions popup.
// Stores the corrected HTML in local storage so suggestions.js can read it
// (avoids CSP issues with inline scripts and URL length limits).
async function showSuggestionsPopup(correctedHtml) {
  await browser.storage.local.set({ pendingSuggestions: correctedHtml });
  browser.windows.create({
    url: "suggestions.html",
    type: "popup",
    width: 1000,
    height: 700
  });
}

// Show the waiting popup, passing model info via URL query params.
function showWaitingPopup(isFullMessage, model) {
  const message = isFullMessage ? "Proofing message" : "Proofing selection";
  const url = `waiting.html?message=${encodeURIComponent(message)}&model=${encodeURIComponent(model)}`;
  return browser.windows.create({
    url,
    type: "popup",
    width: 400,
    height: 250
  }).then(windowInfo => windowInfo.id);
}

// Show the error popup, passing the message via URL query params.
function showErrorPopup(message) {
  const url = `error.html?message=${encodeURIComponent(message)}`;
  browser.windows.create({
    url,
    type: "popup",
    width: 400,
    height: 200
  });
}

// Calls the Google Gemini API and returns the response text.
async function callGemini(apiKey, model, systemPrompt, textToProof) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log("Calling Gemini API with prompt:", systemPrompt);
  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      parts: [{ text: textToProof }]
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
async function callOpenRouter(apiKey, model, systemPrompt, textToProof) {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
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

// Strips markdown code fences that some LLMs add despite being told not to.
function stripCodeFences(text) {
  return text
    .replace(/^```[a-zA-Z]*\r?\n/, "")
    .replace(/\r?\n```$/, "")
    .trim();
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

    // Try to get the HTML of the selected region inside the compose iframe.
    try {
      const results = await messenger.tabs.executeScript(tab.id, {
        code: `(function() {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

          const range = sel.getRangeAt(0);
          const fragment = range.cloneContents();

          const container = document.createElement('div');
          container.appendChild(fragment);
          const html = container.innerHTML.trim();

          return html.length > 0 ? html : null;
        })();`
      });

      if (results && results[0]) {
        textToProof = results[0];
        isFullMessage = false;
      }
    } catch (error) {
      console.warn("Error getting HTML selection. Using full message.", error);
    }

    // Get saved prompts
    const { savedPrompts = [], selectedPromptIndex = -1 } = await browser.storage.local.get(["savedPrompts", "selectedPromptIndex"]);
    const selectedPrompt = savedPrompts[selectedPromptIndex];
    const userStyleInstruction = selectedPrompt.text || "Correct grammar, spelling, punctuation, and style.";
    const mode = selectedPrompt.mode; // "diff" or "rewrite"
   
    const systemPrompt = buildHtmlProofPrompt(userStyleInstruction, mode);

    waitingPopupId = await showWaitingPopup(isFullMessage, model);

    try {
      let rawResponse;

      if (provider === "gemini") {
        rawResponse = await callGemini(apiKey, model, systemPrompt, textToProof);
      } else if (provider === "openrouter") {
        rawResponse = await callOpenRouter(apiKey, model, systemPrompt, textToProof);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const correctedHtml = stripCodeFences(rawResponse);
      await showSuggestionsPopup(correctedHtml);

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
