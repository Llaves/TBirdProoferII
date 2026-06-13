document.addEventListener('DOMContentLoaded', async () => {
  const PROVIDER_LABELS = {
    gemini:      "Google Gemini",
    openrouter:  "OpenRouter",
  };

  const PROVIDER_KEYS = {
    gemini:     "geminiApiKey",
    openrouter: "openrouterApiKey",
  };

  // Read the optional ?provider= query parameter
  const params   = new URLSearchParams(location.search);
  const provider = params.get("provider");

  if (provider && PROVIDER_KEYS[provider]) {
    // --- Single-provider view ---
    const label      = PROVIDER_LABELS[provider];
    const storageKey = PROVIDER_KEYS[provider];

    document.getElementById("heading").textContent = `Your ${label} API Key`;

    const result = await browser.storage.local.get(storageKey);
    document.getElementById("apiKey").textContent =
      result[storageKey] || "No API key set.";

    // singleView is visible by default; bothView stays hidden
  } else {
    // --- Both-providers fallback view ---
    document.getElementById("heading").textContent = "API Keys";
    document.getElementById("singleView").style.display = "none";
    document.getElementById("bothView").style.display   = "block";

    const result = await browser.storage.local.get([
      "geminiApiKey",
      "openrouterApiKey",
    ]);

    document.getElementById("geminiKey").textContent =
      result.geminiApiKey     || "No API key set.";
    document.getElementById("openrouterKey").textContent =
      result.openrouterApiKey || "No API key set.";
  }

  window.addEventListener('blur', () => {
    window.close();
  });
});
