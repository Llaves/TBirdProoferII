// waiting.js
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const proofingMessage = params.get("message") || "Proofing message";
  const model = params.get("model") || "LLM";

  document.getElementById("proofingMessage").textContent = proofingMessage;
  document.getElementById("modelMessage").textContent =
    `Waiting for response from ${model}...`;
});
