const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-3.5-flash",
    // Model name and API key go in the URL; request/response shape is Gemini-specific.
    endpoint: (apiKey, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${gemini_model}:generateContent?key=${apiKey}`,
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
};s