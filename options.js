// options.js

const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-3.5-flash",
    modelHint: "e.g. gemini-3.5-flash",
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "anthropic/claude-sonnet-4-5",
    modelHint: "e.g. anthropic/claude-sonnet-4-5",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSelectedProvider() {
  const checked = document.querySelector('input[name="provider"]:checked');
  return checked ? checked.value : "gemini";
}

function updateModelHint(provider) {
  document.getElementById("modelHint").textContent = PROVIDERS[provider].modelHint;
}

function updateProviderVisibility(provider) {
  document.getElementById("geminiKeyRow").style.display =
    provider === "gemini" ? "" : "none";
  document.getElementById("openrouterKeyRow").style.display =
    provider === "openrouter" ? "" : "none";
}

function setOutput(message) {
  document.getElementById("output").textContent = message;
}

function updateKeyStatus(provider, isSet) {
  const statusEl = document.getElementById(
    provider === "gemini" ? "geminiKeyStatus" : "openrouterKeyStatus"
  );
  statusEl.textContent = isSet ? "Key is set" : "No key set";
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const result = await browser.storage.local.get([
    "provider",
    "model",
    "geminiApiKey",
    "openrouterApiKey",
    "apiKey", // v1 legacy key
  ]);

  // --- v1 migration: move old apiKey → geminiApiKey ---
  if (result.apiKey && !result.geminiApiKey) {
    await browser.storage.local.set({ geminiApiKey: result.apiKey });
    await browser.storage.local.remove("apiKey");
    result.geminiApiKey = result.apiKey;
    setOutput("Migrated existing API key to Gemini key.");
  }

  // --- Set provider radio ---
  const storedProvider = result.provider || "gemini";
  const radioEl = document.getElementById(
    storedProvider === "openrouter" ? "providerOpenRouter" : "providerGemini"
  );
  if (radioEl) radioEl.checked = true;

  // --- Set model name ---
  const modelInput = document.getElementById("modelName");
  modelInput.value = result.model || PROVIDERS[storedProvider].defaultModel;
  updateModelHint(storedProvider);
  updateProviderVisibility(storedProvider)

  // --- Key statuses ---
  updateKeyStatus("gemini", !!result.geminiApiKey);
  updateKeyStatus("openrouter", !!result.openrouterApiKey);

  // Explicitly size the window after content loads
  window.resizeTo(520, 1000);
});

// ---------------------------------------------------------------------------
// Provider radio change
// ---------------------------------------------------------------------------

document.querySelectorAll('input[name="provider"]').forEach((radio) => {
  radio.addEventListener("change", async () => {
    const newProvider = radio.value;

    // Persist provider selection immediately
    await browser.storage.local.set({ provider: newProvider });

    // Update hint and key row visibility
    updateModelHint(newProvider);
    updateProviderVisibility(newProvider);

    // Update model field only if it's blank or still showing the other provider's default
    const modelInput = document.getElementById("modelName");
    const currentValue = modelInput.value.trim();
    const otherProvider = newProvider === "gemini" ? "openrouter" : "gemini";
    const isBlankOrOtherDefault =
      currentValue === "" || currentValue === PROVIDERS[otherProvider].defaultModel;

    if (isBlankOrOtherDefault) {
      // Load stored model for new provider, falling back to its default
      const result = await browser.storage.local.get("model");
      modelInput.value = result.model || PROVIDERS[newProvider].defaultModel;
    }
  });
});

// ---------------------------------------------------------------------------
// Save Model
// ---------------------------------------------------------------------------

document.getElementById("saveModelButton").addEventListener("click", async () => {
  const model = document.getElementById("modelName").value.trim();
  if (!model) {
    setOutput("Model name cannot be empty.");
    return;
  }
  await browser.storage.local.set({ model });
  setOutput(`Model saved: ${model}`);
});


// ---------------------------------------------------------------------------
// Gemini API Key buttons
// ---------------------------------------------------------------------------

document.getElementById("saveGeminiKeyButton").addEventListener("click", async () => {
  const key = document.getElementById("geminiApiKey").value;
  if (!key) {
    setOutput("Gemini API key cannot be empty.");
    return;
  }
  await browser.storage.local.set({ geminiApiKey: key });
  updateKeyStatus("gemini", true);
  setOutput("Gemini API key saved successfully.");
});

document.getElementById("viewGeminiKeyButton").addEventListener("click", () => {
  browser.windows.create({
    url: "view_key.html?provider=gemini",
    type: "popup",
    width: 400,
    height: 400,
  });
});

document.getElementById("removeGeminiKeyButton").addEventListener("click", async () => {
  await browser.storage.local.remove("geminiApiKey");
  updateKeyStatus("gemini", false);
  setOutput("Gemini API key removed.");
});

// ---------------------------------------------------------------------------
// OpenRouter API Key buttons
// ---------------------------------------------------------------------------

document.getElementById("saveOpenRouterKeyButton").addEventListener("click", async () => {
  const key = document.getElementById("openrouterApiKey").value;
  if (!key) {
    setOutput("OpenRouter API key cannot be empty.");
    return;
  }
  await browser.storage.local.set({ openrouterApiKey: key });
  updateKeyStatus("openrouter", true);
  setOutput("OpenRouter API key saved successfully.");
});

document.getElementById("viewOpenRouterKeyButton").addEventListener("click", () => {
  browser.windows.create({
    url: "view_key.html?provider=openrouter",
    type: "popup",
    width: 400,
    height: 400,
  });
});

document.getElementById("removeOpenRouterKeyButton").addEventListener("click", async () => {
  await browser.storage.local.remove("openrouterApiKey");
  updateKeyStatus("openrouter", false);
  setOutput("OpenRouter API key removed.");
});

// ---------------------------------------------------------------------------
// Prompt Management (unchanged)
// ---------------------------------------------------------------------------

document.getElementById("promptsButton").addEventListener("click", () => {
  browser.windows.create({
    url: "manage_prompts.html",
    type: "popup",
    width: 500,
    height: 600,
  });
});

// ---------------------------------------------------------------------------
// Close on blur (unchanged)
// ---------------------------------------------------------------------------

window.addEventListener("blur", () => {
  window.close();
});
